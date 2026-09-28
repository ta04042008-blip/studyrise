import { useCallback, useEffect, useMemo, useState } from 'react';
import { createBattleEngine, type BattleEngine } from '../engine/battle/BattleEngine';
import type {
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
import type { MultipleChoiceAnswer, QuestionDefinition } from '../engine/question/QuestionEngine.types';
import { createRandomService } from '../engine/random/RandomService';
import { battleConfig } from '../config/battleConfig';
import type { StarLevel } from '../types/stats';

export interface UseBattleControllerArgs {
  /** 1〜3 characters (spec §4.1). */
  players: CharacterDefinition[];
  /** 1 or more enemies (spec §2.1). See CreateBattleEngineOptions.enemies for the instance-id normalization rule. */
  enemies: (EnemyDefinition | EnemyBattleInstance)[];
  questions: readonly QuestionDefinition[];
  spellsById: Record<string, SpellDefinition>;
  initialItems: ItemBattleSlot[];
  seed: number;
  /** Run-provided known-spells-and-levels per player (spec §4.5). Omit for the MVP-1〜3 single-initial-spell default. */
  knownSpellsByPlayerId?: Record<string, { spellId: string; level: number }[]>;
  /** Run-provided command-boost bonuses per player (spec §9.2 category 3). Omit for none. */
  playerCommandModifiers?: Record<string, PlayerCommandModifiers>;
  /** Starting HP per player, carried from a previous battle (RogueliteEngine). Omit for full HP. */
  initialHpByPlayerId?: Record<string, number>;
}

export interface BattleController {
  state: BattleState;
  listSubjects: () => string[];
  listStars: (subject: string) => StarLevel[];
  selectCommand: (command: QuestionCommandKind) => void;
  selectTarget: (targetId: string) => void;
  selectSubjectAndStar: (subject: string, star: StarLevel) => void;
  submitAnswer: (answer: MultipleChoiceAnswer) => void;
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
  initialItems,
  seed,
  knownSpellsByPlayerId,
  playerCommandModifiers,
  initialHpByPlayerId,
}: UseBattleControllerArgs): BattleController {
  const engines = useMemo(() => {
    const random = createRandomService(seed);
    const questionEngine = createQuestionEngine(questions, random);
    const battleEngine: BattleEngine = createBattleEngine({
      players,
      enemies,
      questionEngine,
      config: battleConfig,
      random,
      spellsById,
      initialItems,
      knownSpellsByPlayerId,
      playerCommandModifiers,
      initialHpByPlayerId,
    });
    return { questionEngine, battleEngine };
    // Instantiate once per mounted battle; `seed` change means a new battle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const [state, setState] = useState<BattleState>(() => engines.battleEngine.getState());

  // `engines` only changes when `seed` changes (a brand-new battle, e.g.
  // MVP-4's Battle → Reward → Battle harness re-seeding this hook without
  // unmounting it). The lazy useState initializer above only ever runs on
  // this hook's very first mount, so without this resync, `state` would
  // keep showing the *previous* battle's final snapshot forever — the new
  // engine would be constructed and immediately usable via its methods, but
  // the UI would never render its actual initial state.
  useEffect(() => {
    setState(engines.battleEngine.getState());
  }, [engines]);

  const sync = useCallback(() => {
    setState(engines.battleEngine.getState());
  }, [engines]);

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

  const submitAnswer = useCallback(
    (answer: MultipleChoiceAnswer) => {
      engines.battleEngine.submitAnswer(answer);
      sync();
    },
    [engines, sync],
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

  return {
    state,
    listSubjects,
    listStars,
    selectCommand,
    selectTarget,
    selectSubjectAndStar,
    submitAnswer,
    useSpell,
    useItem,
    advance,
  };
}
