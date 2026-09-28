import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useBattleController } from '../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition, SpellDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../src/engine/question/QuestionEngine.types';
import type { QuestionResult } from '../../src/engine/learningHistory/LearningHistory.types';

afterEach(cleanup);

// A single question so the exact same questionId inevitably repeats across
// attempts (user's explicit MVP-8 dedup test: re-answering the same
// questionId later must still add a second record).
const question: MultipleChoiceQuestion = {
  id: 'q_repeat',
  subject: '数学',
  field: '計算',
  unit: '四則演算',
  star: 1,
  format: 'multiple_choice',
  text: '1 + 1 は？',
  choices: ['1', '2'],
  correctIndex: 1,
  explanation: '1 + 1 = 2 です。',
};

const dummySpell: SpellDefinition = {
  id: 'spell_none',
  name: 'テストスペル',
  targetType: 'enemy',
  maxLevel: 1,
  levels: [{ mpCost: 1, effects: [{ type: 'DAMAGE', amount: 1 }] }],
};

const player: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 20, defense: 5, speed: 20, maxHp: 999, maxMp: 5 },
  initialSpellId: dummySpell.id,
  additionalSpellPoolIds: [],
};

// High HP / zero attack so the battle never ends mid-test (win/loss is not
// what this test is about — only how many times onQuestionResult fires).
const enemy: EnemyDefinition = {
  id: 'enemy',
  name: 'Dummy',
  baseStats: { attack: 0, defense: 5, speed: 1, maxHp: 999999 },
};

function setup(onQuestionResult: (result: QuestionResult) => void) {
  return renderHook(() =>
    useBattleController({
      players: [player],
      enemies: [enemy],
      questions: [question],
      spellsById: { [dummySpell.id]: dummySpell },
      initialItems: [],
      seed: 1,
      onQuestionResult,
    }),
  );
}

function setupStrict(onQuestionResult: (result: QuestionResult) => void) {
  return renderHook(
    () =>
      useBattleController({
        players: [player],
        enemies: [enemy],
        questions: [question],
        spellsById: { [dummySpell.id]: dummySpell },
        initialItems: [],
        seed: 1,
        onQuestionResult,
      }),
    { wrapper: StrictMode },
  );
}

/**
 * Drives one full Attack attempt (command→target(auto)→subject/star→
 * question→answer→command animation→explanation), landing on EXPLANATION.
 * `submitAnswer` itself only reaches COMMAND_ANIMATION — one further
 * `advance()` runs `applyPendingResult()` (RESULT_APPLY, transient) through
 * to EXPLANATION (see BattleEngine.ts's `advance`/`applyPendingResult`).
 */
function driveOneAttempt(result: { current: ReturnType<typeof useBattleController> }, answer: Parameters<ReturnType<typeof useBattleController>['submitAnswer']>[0]) {
  act(() => result.current.selectCommand('attack'));
  expect(result.current.state.phase).toBe('SUBJECT_DIFFICULTY_SELECT');
  act(() => result.current.selectSubjectAndStar('数学', 1));
  expect(result.current.state.phase).toBe('QUESTION');
  act(() => result.current.submitAnswer(answer));
  expect(result.current.state.phase).toBe('COMMAND_ANIMATION');
  act(() => result.current.advance());
  expect(result.current.state.phase).toBe('EXPLANATION');
}

describe('useBattleController — learning-history event boundary (spec v0.8 §13)', () => {
  it('records exactly one QuestionResult for a correct answer', () => {
    const onQuestionResult = vi.fn();
    const { result } = setup(onQuestionResult);

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 1 });

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
    expect(onQuestionResult.mock.calls[0][0]).toMatchObject({ questionId: 'q_repeat', answerResult: 'CORRECT' });
  });

  it('records exactly one QuestionResult for an incorrect answer', () => {
    const onQuestionResult = vi.fn();
    const { result } = setup(onQuestionResult);

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 0 });

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
    expect(onQuestionResult.mock.calls[0][0]).toMatchObject({ questionId: 'q_repeat', answerResult: 'INCORRECT' });
  });

  it('records exactly one QuestionResult for 「わからない」, classified UNKNOWN (not folded into INCORRECT)', () => {
    const onQuestionResult = vi.fn();
    const { result } = setup(onQuestionResult);

    driveOneAttempt(result, { type: 'dont_know' });

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
    expect(onQuestionResult.mock.calls[0][0]).toMatchObject({ questionId: 'q_repeat', answerResult: 'UNKNOWN' });
  });

  it('does not record twice when submitAnswer is called again for an already-resolved answer (button mash)', () => {
    const onQuestionResult = vi.fn();
    const { result } = setup(onQuestionResult);

    act(() => result.current.selectCommand('attack'));
    act(() => result.current.selectSubjectAndStar('数学', 1));
    act(() => result.current.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }));
    // Second tap after the phase has already moved past QUESTION — BattleEngine
    // itself rejects this (warnRejected), and the wrapper must not record again.
    act(() => result.current.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }));

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
  });

  it('does not record on advance() calls, even mashed repeatedly ("次へ" mashing)', () => {
    const onQuestionResult = vi.fn();
    const { result } = setup(onQuestionResult);

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 1 });
    expect(onQuestionResult).toHaveBeenCalledTimes(1);

    act(() => result.current.advance());
    act(() => result.current.advance());
    act(() => result.current.advance());

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
  });

  it('does not record again merely from re-rendering while EXPLANATION is showing', () => {
    const onQuestionResult = vi.fn();
    const { result, rerender } = setup(onQuestionResult);

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 1 });
    expect(onQuestionResult).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
  });

  it('records exactly one QuestionResult per accepted answer under React StrictMode', () => {
    const onQuestionResult = vi.fn();
    const { result } = setupStrict(onQuestionResult);

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 1 });

    expect(onQuestionResult).toHaveBeenCalledTimes(1);
  });

  it('records TWO entries when the same questionId is answered again in a later attempt (not deduped by questionId)', () => {
    const onQuestionResult = vi.fn();
    const { result } = setup(onQuestionResult);

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 1 }); // Attempt 1
    act(() => result.current.advance()); // back to COMMAND_SELECT for the next player action
    expect(result.current.state.phase).toBe('COMMAND_SELECT');

    driveOneAttempt(result, { type: 'multiple_choice', selectedIndex: 0 }); // Attempt 2 — same question, different answer

    expect(onQuestionResult).toHaveBeenCalledTimes(2);
    expect(onQuestionResult.mock.calls[0][0]).toMatchObject({ questionId: 'q_repeat', answerResult: 'CORRECT' });
    expect(onQuestionResult.mock.calls[1][0]).toMatchObject({ questionId: 'q_repeat', answerResult: 'INCORRECT' });
  });
});
