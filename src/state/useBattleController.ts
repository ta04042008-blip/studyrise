import { useCallback, useMemo, useState } from 'react';
import { createBattleEngine, type BattleEngine } from '../engine/battle/BattleEngine';
import type { BattleState, CharacterDefinition, EnemyDefinition } from '../engine/battle/BattleEngine.types';
import { createQuestionEngine } from '../engine/question/QuestionEngine';
import type { MultipleChoiceAnswer, QuestionDefinition } from '../engine/question/QuestionEngine.types';
import { createRandomService } from '../engine/random/RandomService';
import { battleConfig } from '../config/battleConfig';
import type { StarLevel } from '../types/stats';

export interface UseBattleControllerArgs {
  player: CharacterDefinition;
  enemy: EnemyDefinition;
  questions: readonly QuestionDefinition[];
  seed: number;
}

export interface BattleController {
  state: BattleState;
  listSubjects: () => string[];
  listStars: (subject: string) => StarLevel[];
  selectAttackCommand: () => void;
  selectSubjectAndStar: (subject: string, star: StarLevel) => void;
  submitAnswer: (answer: MultipleChoiceAnswer) => void;
  advance: () => void;
}

/**
 * Bridges React state to BattleEngine (CLAUDE.md §9): this hook only
 * instantiates the engine, dispatches commands to it, and re-renders on
 * the resulting snapshot. No combat calculation happens here.
 */
export function useBattleController({ player, enemy, questions, seed }: UseBattleControllerArgs): BattleController {
  const engines = useMemo(() => {
    const random = createRandomService(seed);
    const questionEngine = createQuestionEngine(questions, random);
    const battleEngine: BattleEngine = createBattleEngine(player, enemy, questionEngine, battleConfig, random);
    return { questionEngine, battleEngine };
    // Instantiate once per mounted battle; `seed` change means a new battle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const [state, setState] = useState<BattleState>(() => engines.battleEngine.getState());

  const sync = useCallback(() => {
    setState(engines.battleEngine.getState());
  }, [engines]);

  const selectAttackCommand = useCallback(() => {
    engines.battleEngine.selectAttackCommand();
    sync();
  }, [engines, sync]);

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

  const advance = useCallback(() => {
    engines.battleEngine.advance();
    sync();
  }, [engines, sync]);

  const listSubjects = useCallback(() => engines.questionEngine.listSubjects(), [engines]);
  const listStars = useCallback((subject: string) => engines.questionEngine.listStars(subject), [engines]);

  return { state, listSubjects, listStars, selectAttackCommand, selectSubjectAndStar, submitAnswer, advance };
}
