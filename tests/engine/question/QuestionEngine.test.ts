import { describe, expect, it, vi } from 'vitest';
import { createQuestionEngine } from '../../../src/engine/question/QuestionEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

function mc(overrides: Partial<MultipleChoiceQuestion>): MultipleChoiceQuestion {
  return {
    id: 'q',
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    format: 'multiple_choice',
    text: 'text',
    choices: ['a', 'b'],
    correctIndex: 0,
    explanation: 'exp',
    ...overrides,
  };
}

describe('QuestionEngine', () => {
  it('lists only subjects/stars that have valid candidate questions', () => {
    const pool = [
      mc({ id: 'a', subject: '数学', star: 1 }),
      mc({ id: 'b', subject: '数学', star: 3 }),
      mc({ id: 'c', subject: '英語', star: 2 }),
    ];
    const engine = createQuestionEngine(pool, createRandomService(1));

    expect(engine.listSubjects().sort()).toEqual(['数学', '英語']);
    expect(engine.listStars('数学')).toEqual([1, 3]);
    expect(engine.listStars('英語')).toEqual([2]);
  });

  it('excludes invalid content from subject/star listings and reports it', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const pool = [mc({ id: 'good', subject: '数学', star: 1 }), mc({ id: 'bad', subject: '数学', star: 1, text: '' })];
    const engine = createQuestionEngine(pool, createRandomService(1));

    expect(engine.getInvalidCount()).toBe(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('only picks questions matching the requested subject and star', () => {
    const pool = [
      mc({ id: 'a', subject: '数学', star: 1 }),
      mc({ id: 'b', subject: '数学', star: 2 }),
      mc({ id: 'c', subject: '英語', star: 1 }),
    ];
    const engine = createQuestionEngine(pool, createRandomService(1));

    for (let i = 0; i < 10; i++) {
      const picked = engine.pickQuestion('数学', 1);
      expect(picked.id).toBe('a');
    }
  });

  it('throws when no candidates exist for a subject+star combination', () => {
    const pool = [mc({ id: 'a', subject: '数学', star: 1 })];
    const engine = createQuestionEngine(pool, createRandomService(1));

    expect(() => engine.pickQuestion('数学', 5)).toThrow();
  });

  it('avoids repeating the same question back-to-back when alternatives exist', () => {
    const pool = [
      mc({ id: 'a', subject: '数学', star: 1, unit: 'u1' }),
      mc({ id: 'b', subject: '数学', star: 1, unit: 'u2' }),
    ];
    const engine = createQuestionEngine(pool, createRandomService(1));

    const first = engine.pickQuestion('数学', 1);
    const second = engine.pickQuestion('数学', 1);

    expect(second.id).not.toBe(first.id);
  });

  it('allows repeats when the pool is too narrow to disperse', () => {
    const pool = [mc({ id: 'only', subject: '数学', star: 1 })];
    const engine = createQuestionEngine(pool, createRandomService(1));

    const first = engine.pickQuestion('数学', 1);
    const second = engine.pickQuestion('数学', 1);

    expect(first.id).toBe('only');
    expect(second.id).toBe('only');
  });
});
