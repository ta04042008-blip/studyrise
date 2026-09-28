import { describe, expect, it } from 'vitest';
import { questionResultFromAnswer } from '../../../src/engine/learningHistory/questionResultFromAnswer';
import type { AttackOutcome } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

const question: MultipleChoiceQuestion = {
  id: 'q_test_1',
  subject: '数学',
  field: '計算',
  unit: '四則演算',
  star: 3,
  format: 'multiple_choice',
  text: '7 + 5 は？',
  choices: ['10', '11', '12', '13'],
  correctIndex: 2,
  explanation: '7 + 5 = 12 です。',
};

function makeOutcome(overrides: Partial<AttackOutcome> = {}): AttackOutcome {
  return {
    command: 'attack',
    sourceActorId: 'player_1',
    targetId: 'enemy_1',
    correct: true,
    question,
    selectedAnswerIndex: 2,
    damage: 10,
    isCritical: false,
    ...overrides,
  };
}

describe('questionResultFromAnswer', () => {
  it('maps a correct multiple_choice answer to CORRECT, carrying the selected index', () => {
    const outcome = makeOutcome({ correct: true, selectedAnswerIndex: 2 });
    const result = questionResultFromAnswer({ type: 'multiple_choice', selectedIndex: 2 }, outcome);

    expect(result).toEqual({
      questionId: 'q_test_1',
      subject: '数学',
      field: '計算',
      unit: '四則演算',
      star: 3,
      answerResult: 'CORRECT',
      recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 2 },
    });
  });

  it('maps an incorrect multiple_choice answer to INCORRECT, carrying the selected (wrong) index', () => {
    const outcome = makeOutcome({ correct: false, selectedAnswerIndex: 0 });
    const result = questionResultFromAnswer({ type: 'multiple_choice', selectedIndex: 0 }, outcome);

    expect(result.answerResult).toBe('INCORRECT');
    expect(result.recordedAnswer).toEqual({ type: 'MULTIPLE_CHOICE', selectedIndex: 0 });
  });

  it("maps a 「わからない」 answer to UNKNOWN using answer.type explicitly, not outcome.correct/selectedAnswerIndex", () => {
    // outcome.correct is always false for dont_know (BattleEngine's own rule) and
    // selectedAnswerIndex is null — but the explicit answer.type is the source of truth here.
    const outcome = makeOutcome({ correct: false, selectedAnswerIndex: null });
    const result = questionResultFromAnswer({ type: 'dont_know' }, outcome);

    expect(result.answerResult).toBe('UNKNOWN');
    expect(result.recordedAnswer).toEqual({ type: 'UNKNOWN' });
  });

  it('always resolves subject/field/unit/star from outcome.question, never from the answer', () => {
    const outcome = makeOutcome();
    const result = questionResultFromAnswer({ type: 'multiple_choice', selectedIndex: 2 }, outcome);
    expect(result.questionId).toBe(question.id);
    expect(result.subject).toBe(question.subject);
    expect(result.field).toBe(question.field);
    expect(result.unit).toBe(question.unit);
    expect(result.star).toBe(question.star);
  });
});
