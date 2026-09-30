import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBattleEngine, restoreBattleEngine, type BattleEngine } from '../engine/battle/BattleEngine';
import type {
  BattleEngineSnapshot,
  BattleState,
  CharacterDefinition,
  EnemyBattleInstance,
  EnemyDefinition,
  ItemBattleSlot,
  PlayerCommandModifiers,
  QuestionCommandKind,
  SpellDefinition,
} from '../engine/battle/BattleEngine.types';
import { createQuestionEngine } from '../engine/question/QuestionEngine';
import { isQuestionAnswerCorrect, type MultipleChoiceAnswer, type QuestionDefinition } from '../engine/question/QuestionEngine.types';
import { createRandomService, createRandomServiceFromState } from '../engine/random/RandomService';
import { battleConfig } from '../config/battleConfig';
import type { StarLevel } from '../types/stats';
import type { QuestionResult } from '../engine/learningHistory/LearningHistory.types';
import { questionResultFromAnswer } from '../engine/learningHistory/questionResultFromAnswer';
import type { EnemyObservationEvent } from '../engine/bestiary/BestiarySystem';
import type { SkillDefinition } from '../engine/battle/skills';

export interface UseBattleControllerArgs {
  /** 1〜3 characters (spec §4.1). */
  players: CharacterDefinition[];
  /** 1 or more enemies (spec §2.1). See CreateBattleEngineOptions.enemies for the instance-id normalization rule. */
  enemies: (EnemyDefinition | EnemyBattleInstance)[];
  questions: readonly QuestionDefinition[];
  spellsById: Record<string, SpellDefinition>;
  /** Passive-skill registry. Optional while production character effects remain undecided. */
  skillsById?: Record<string, SkillDefinition>;
  initialItems: ItemBattleSlot[];
  seed: number;
  /** Run-provided known-spells-and-levels per player (spec §4.5). Omit for the MVP-1〜3 single-initial-spell default. */
  knownSpellsByPlayerId?: Record<string, { spellId: string; level: number }[]>;
  /** Run-provided command-boost bonuses per player (spec §9.2 category 3). Omit for none. */
  playerCommandModifiers?: Record<string, PlayerCommandModifiers>;
  /** Starting HP per player, carried from a previous battle (RogueliteEngine). Omit for full HP. */
  initialHpByPlayerId?: Record<string, number>;
  /**
   * Learning-history event boundary (spec v0.8 §13, user's explicit MVP-8
   * instruction): invoked exactly once per answer BattleEngine actually
   * accepts (see `submitAnswer` below), never from a `useEffect`. Omit for
   * no recording (e.g. tests that don't care about learning history).
   */
  onQuestionResult?: (result: QuestionResult) => void;
  /**
   * MVP-9: resumes an in-progress battle from a previously exported
   * snapshot instead of building fresh actors/timeline. When provided, this
   * takes effect only at this hook's initial construction (mirrors the
   * `useMemo(..., [seed])` "construct once per mounted battle" contract) —
   * `players`/`enemies`/`initialItems`/`knownSpellsByPlayerId`/
   * `initialHpByPlayerId` are ignored in that case (the snapshot's
   * BattleState already carries the fully resolved actors); `seed` is also
   * ignored (the snapshot's own randomState is used instead).
   */
  restoreSnapshot?: BattleEngineSnapshot;
  /**
   * MVP-9: fired after every dispatched command leaves the engine in a new
   * stable resting phase (CLAUDE.md §10/§13/§19 — every BattleEngine public
   * method already returns only once battle state is at rest, so there is
   * no unstable intermediate snapshot to accidentally persist here). Never
   * driven by a useEffect watching arbitrary React state — only by this
   * hook's own `sync()`, right after each command it actually dispatches.
   */
  onSnapshotChange?: (snapshot: BattleEngineSnapshot) => void;
  /** Persistent enemy-observation event boundary for Bestiary/detail unlocks. */
  onEnemyObservation?: (event: EnemyObservationEvent) => void;
}

export interface SpellAnswerFeedback {
  sequence: number;
  sourceActorId: string;
  correct: boolean;
  correctCount: number;
  answeredCount: number;
}

export interface BattleController {
  state: BattleState;
  /** Presentation-only signal emitted after each accepted spell-preparation answer. */
  spellAnswerFeedback: SpellAnswerFeedback | null;
  listSubjects: () => string[];
  listStars: (subject: string) => StarLevel[];
  listSpellSubjects: () => string[];
  getSpellDefinition: (spellId: string) => SpellDefinition | undefined;
  selectCommand: (command: QuestionCommandKind) => void;
  selectTarget: (targetId: string) => void;
  selectSubjectAndStar: (subject: string, star: StarLevel) => void;
  selectSpellSubject: (subject: string) => void;
  cancelSpellSubjectSelection: () => void;
  submitAnswer: (answer: MultipleChoiceAnswer) => void;
  submitSpellAnswer: (answer: MultipleChoiceAnswer) => void;
  useSpell: (spellId: string) => void;
  useItem: (itemId: string) => void;
  advance: () => void;
}

/**
 * Bridges React state to BattleEngine (CLAUDE.md §9): this hook only
 * instantiates the engine, dispatches commands to it, and re-renders on
 * the resulting snapshot. No combat calculation happens here.
 */
export function useBattleController({
  players,
  enemies,
  questions,
  spellsById,
  skillsById,
  initialItems,
  seed,
  knownSpellsByPlayerId,
  playerCommandModifiers,
  initialHpByPlayerId,
  onQuestionResult,
  restoreSnapshot,
  onSnapshotChange,
  onEnemyObservation,
}: UseBattleControllerArgs): BattleController {
  const engines = useMemo(() => {
    if (restoreSnapshot) {
      const random = createRandomServiceFromState(restoreSnapshot.randomState);
      // MVP-9: QuestionEngine's own dispersion-affecting state must be
      // restored too — a fresh QuestionEngine (lastPicked: null) can pick a
      // DIFFERENT next question than a non-reloaded session would have,
      // even with the exact same RNG cursor (see QuestionEngineSnapshot's
      // doc comment).
      const questionEngine = createQuestionEngine(questions, random, restoreSnapshot.questionEngineSnapshot);
      const battleEngine: BattleEngine = restoreBattleEngine(restoreSnapshot, {
        questionEngine,
        config: battleConfig,
        random,
        spellsById,
        playerCommandModifiers: playerCommandModifiers ?? {},
      });
      return { questionEngine, battleEngine };
    }
    const random = createRandomService(seed);
    const questionEngine = createQuestionEngine(questions, random);
    const battleEngine: BattleEngine = createBattleEngine({
      players,
      enemies,
      questionEngine,
      config: battleConfig,
      random,
      spellsById,
      skillsById,
      initialItems,
      knownSpellsByPlayerId,
      playerCommandModifiers,
      initialHpByPlayerId,
    });
    return { questionEngine, battleEngine };
    // Instantiate once per mounted battle; `seed` change means a new battle.
    // `restoreSnapshot` is deliberately read only on this first construction
    // (never re-triggers a restore later in the same mount) — see this
    // hook's own doc comment on UseBattleControllerArgs.restoreSnapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const [state, setState] = useState<BattleState>(() => engines.battleEngine.getState());
  const [spellAnswerFeedback, setSpellAnswerFeedback] = useState<SpellAnswerFeedback | null>(null);
  const spellAnswerFeedbackSequenceRef = useRef(0);

  const reportEnemyObservations = useCallback(
    (nextState: BattleState) => {
      if (!onEnemyObservation) return;

      const enemyDefinitionIdByActorId = new Map(
        nextState.enemies
          .filter((enemy) => Boolean(enemy.definitionId))
          .map((enemy) => [enemy.id, enemy.definitionId!]),
      );

      for (const enemy of nextState.enemies) {
        if (!enemy.definitionId) continue;
        onEnemyObservation({ type: 'ENCOUNTERED', enemyDefinitionId: enemy.definitionId });
        if (enemy.currentHp <= 0) {
          onEnemyObservation({ type: 'DEFEATED', enemyDefinitionId: enemy.definitionId });
        }
      }

      for (const [enemyActorId, actions] of Object.entries(nextState.searchByEnemyId)) {
        const enemyDefinitionId = enemyDefinitionIdByActorId.get(enemyActorId);
        if (!enemyDefinitionId) continue;
        for (const action of actions) {
          onEnemyObservation({ type: 'ACTION_OBSERVED', enemyDefinitionId, actionName: action.actionName });
        }
      }

      for (const action of nextState.enemyActionLog) {
        if (!action.actionName) continue;
        const enemyDefinitionId = enemyDefinitionIdByActorId.get(action.sourceActorId);
        if (!enemyDefinitionId) continue;
        onEnemyObservation({ type: 'ACTION_OBSERVED', enemyDefinitionId, actionName: action.actionName });
      }
    },
    [onEnemyObservation],
  );

  // `engines` only changes when `seed` changes (a brand-new battle, e.g.
  // MVP-4's Battle → Reward → Battle harness re-seeding this hook without
  // unmounting it). The lazy useState initializer above only ever runs on
  // this hook's very first mount, so without this resync, `state` would
  // keep showing the *previous* battle's final snapshot forever — the new
  // engine would be constructed and immediately usable via its methods, but
  // the UI would never render its actual initial state.
  useEffect(() => {
    const nextState = engines.battleEngine.getState();
    setState(nextState);
    setSpellAnswerFeedback(null);
    reportEnemyObservations(nextState);
    // MVP-9: this fires exactly once per newly (re)constructed engine — a
    // fresh battle's initial state (Zone開始) or a resumed battle's restored
    // state — mirroring the existing "sync once per engine construction"
    // contract this effect already had, never a generic "state changed"
    // watcher (CLAUDE.md §18/§28).
    onSnapshotChange?.(engines.battleEngine.exportSnapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engines]);

  const sync = useCallback(() => {
    const nextState = engines.battleEngine.getState();
    setState(nextState);
    reportEnemyObservations(nextState);
    onSnapshotChange?.(engines.battleEngine.exportSnapshot());
  }, [engines, onSnapshotChange, reportEnemyObservations]);

  const selectCommand = useCallback(
    (command: QuestionCommandKind) => {
      engines.battleEngine.selectCommand(command);
      sync();
    },
    [engines, sync],
  );

  const selectTarget = useCallback(
    (targetId: string) => {
      engines.battleEngine.selectTarget(targetId);
      sync();
    },
    [engines, sync],
  );

  const selectSubjectAndStar = useCallback(
    (subject: string, star: StarLevel) => {
      engines.battleEngine.selectSubjectAndStar(subject, star);
      sync();
    },
    [engines, sync],
  );

  const selectSpellSubject = useCallback(
    (subject: string) => {
      engines.battleEngine.selectSpellSubject(subject);
      sync();
    },
    [engines, sync],
  );

  const cancelSpellSubjectSelection = useCallback(() => {
    engines.battleEngine.cancelSpellSubjectSelection();
    sync();
  }, [engines, sync]);

  const submitAnswer = useCallback(
    (answer: MultipleChoiceAnswer) => {
      // Learning-history dedup boundary (user's explicit MVP-8 instruction):
      // BattleEngine.submitAnswer only ever finalizes an answer when it is
      // called while phase === 'QUESTION' (it no-ops otherwise — see
      // BattleEngine's own `warnRejected('submitAnswer')` guard). Checking
      // that same condition here, synchronously right before delegating,
      // tells us whether THIS call is the one that will actually resolve a
      // new outcome. A second call for the same confirmed answer (button
      // mash, StrictMode double-invoke, or any other re-entry) always sees
      // phase !== 'QUESTION' by then, so `onQuestionResult` fires exactly
      // once per BattleEngine-accepted answer — no separate ref/flag guard,
      // and no `useEffect`, is needed.
      //
      // Read `pendingOutcome`, not `lastPlayerOutcome`: correctness is fully
      // computed inside `submitAnswer` itself (phase → COMMAND_ANIMATION),
      // but `lastPlayerOutcome` is only populated later, when the player
      // taps through COMMAND_ANIMATION (`advance()` → `applyPendingResult()`
      // → EXPLANATION) — which may never happen inside this same call.
      // `pendingOutcome` is exactly "the outcome this submitAnswer call just
      // finalized", available immediately.
      const wasQuestionPhase = engines.battleEngine.getState().phase === 'QUESTION';
      engines.battleEngine.submitAnswer(answer);
      if (wasQuestionPhase && onQuestionResult) {
        const outcome = engines.battleEngine.getState().pendingOutcome;
        if (outcome) {
          onQuestionResult(questionResultFromAnswer(answer, outcome));
        }
      }
      sync();
    },
    [engines, sync, onQuestionResult],
  );

  const submitSpellAnswer = useCallback(
    (answer: MultipleChoiceAnswer) => {
      const before = engines.battleEngine.getState();
      const pending = before.pendingSpellSequence;
      const question = pending?.question;
      const accepted = before.phase === 'SPELL_QUESTION' && Boolean(question && pending?.subject);
      const correct = accepted && question ? isQuestionAnswerCorrect(question, answer) : false;

      engines.battleEngine.submitSpellAnswer(answer);

      if (accepted && pending && question) {
        spellAnswerFeedbackSequenceRef.current += 1;
        setSpellAnswerFeedback({
          sequence: spellAnswerFeedbackSequenceRef.current,
          sourceActorId: pending.sourceActorId,
          correct,
          correctCount: pending.correctCount + (correct ? 1 : 0),
          answeredCount: pending.questionIndex + 1,
        });

        if (onQuestionResult) {
          onQuestionResult({
            questionId: question.id,
            subject: question.subject,
            field: question.field,
            unit: question.unit,
            star: question.star,
            answerResult: answer.type === 'dont_know' ? 'UNKNOWN' : correct ? 'CORRECT' : 'INCORRECT',
            recordedAnswer: answer.type === 'dont_know'
              ? { type: 'UNKNOWN' }
              : answer.type === 'multiple_choice'
                ? { type: 'MULTIPLE_CHOICE', selectedIndex: answer.selectedIndex }
                : answer.type === 'true_false'
                  ? { type: 'TRUE_FALSE', value: answer.value }
                  : answer.type === 'ordering'
                    ? { type: 'ORDERING', order: answer.order }
                    : { type: 'SHORT_ANSWER', value: answer.value },
          });
        }
      }
      sync();
    },
    [engines, sync, onQuestionResult],
  );

  const useSpell = useCallback(
    (spellId: string) => {
      engines.battleEngine.useSpell(spellId);
      sync();
    },
    [engines, sync],
  );

  const useItem = useCallback(
    (itemId: string) => {
      engines.battleEngine.useItem(itemId);
      sync();
    },
    [engines, sync],
  );

  const advance = useCallback(() => {
    engines.battleEngine.advance();
    sync();
  }, [engines, sync]);

  const listSubjects = useCallback(() => engines.questionEngine.listSubjects(), [engines]);
  const listStars = useCallback((subject: string) => engines.questionEngine.listStars(subject), [engines]);
  const getSpellDefinition = useCallback((spellId: string) => spellsById[spellId], [spellsById]);

  const listSpellSubjects = useCallback(() => {
    const pending = engines.battleEngine.getState().pendingSpellSequence;
    if (!pending) return [];
    const spell = spellsById[pending.spellId];
    const requiredStars = spell?.questionStars ?? [1, 2, 3, 4, 5];
    return engines.questionEngine.listSubjects().filter((subject) => {
      const available = new Set(engines.questionEngine.listStars(subject));
      return requiredStars.every((star) => available.has(star));
    });
  }, [engines, spellsById]);

  return {
    state,
    spellAnswerFeedback,
    listSubjects,
    listStars,
    listSpellSubjects,
    getSpellDefinition,
    selectCommand,
    selectTarget,
    selectSubjectAndStar,
    selectSpellSubject,
    cancelSpellSubjectSelection,
    submitAnswer,
    submitSpellAnswer,
    useSpell,
    useItem,
    advance,
  };
}
