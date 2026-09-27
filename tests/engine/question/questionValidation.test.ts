import { describe, expect, it } from 'vitest';
import { validateQuestion, validateQuestionPool } from '../../../src/engine/question/questionValidation';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

function baseQuestion(overrides: Partial<MultipleChoiceQuestion> = {}): MultipleChoiceQuestion {
  return {
    id: 'q1',
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    format: 'multiple_choice',
    text: '1 + 1 は？',
    choices: ['1', '2', '3', '4'],
    correctIndex: 1,
    explanation: '1 + 1 = 2 です。',
    ...overrides,
  };
}

describe('validateQuestion', () => {
  it('accepts a well-formed multiple_choice question', () => {
    expect(validateQuestion(baseQuestion()).valid).toBe(true);
  });

  it('rejects missing text', () => {
    const result = validateQuestion(baseQuestion({ text: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing text');
  });

  it('rejects an invalid star', () => {
    // @ts-expect-error intentionally invalid for the test
    const result = validateQuestion(baseQuestion({ star: 9 }));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.startsWith('invalid star'))).toBe(true);
  });

  it('rejects a missing/out-of-range correctIndex', () => {
    const result = validateQuestion(baseQuestion({ correctIndex: 99 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing or out-of-range correctIndex');
  });

  it('rejects duplicate choices', () => {
    const result = validateQuestion(baseQuestion({ choices: ['1', '1', '3', '4'] }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('multiple_choice has duplicate choices');
  });

  it('rejects fewer than 2 choices', () => {
    const result = validateQuestion(baseQuestion({ choices: ['1'], correctIndex: 0 }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('multiple_choice requires at least 2 choices');
  });

  it('rejects missing explanation', () => {
    const result = validateQuestion(baseQuestion({ explanation: '' }));
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('missing explanation');
  });
});

describe('validateQuestionPool', () => {
  it('excludes invalid questions but keeps valid ones, without throwing', () => {
    const good = baseQuestion({ id: 'good' });
    const bad = baseQuestion({ id: 'bad', text: '' });

    const { validQuestions, invalid } = validateQuestionPool([good, bad]);

    expect(validQuestions.map((q) => q.id)).toEqual(['good']);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].question.id).toBe('bad');
  });
});
