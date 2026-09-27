import { useCallback, useMemo, useState } from 'react';
import { createBattleEngine, type BattleEngine } from '../engine/battle/BattleEngine';
import type {
  BattleState,
  CharacterDefinition,
  EnemyDefinition,
  ItemBattleSlot,
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
  /** 1 or more enemies (spec §2.1). */
  enemies: EnemyDefinition[];
  questions: readonly QuestionDefinition[];
  spellsById: Record<string, SpellDefinition>;
  initialItems: ItemBattleSlot[];
  seed: number;
}

export interface BattleController {
  state: BattleState;
  listSubjects: () => string[];
  listStars: (subject: string) => StarLevel[];
  selectCommand: (command: QuestionCommandKind) => void;
  selectTarget: (targetId: string) => void;
  selectSubjectAndStar: (subject: string, star: StarLevel) => void;
  submitAnswer: (answer: MultipleChoiceAnswer) => void;
  useSpell: () => void;
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
    });
    return { questionEngine, battleEngine };
    // Instantiate once per mounted battle; `seed` change means a new battle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const [state, setState] = useState<BattleState>(() => engines.battleEngine.getState());

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

  const useSpell = useCallback(() => {
    engines.battleEngine.useSpell();
    sync();
  }, [engines, sync]);

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
