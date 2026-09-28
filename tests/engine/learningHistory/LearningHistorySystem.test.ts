import { describe, expect, it } from 'vitest';
import {
  computeAccuracy,
  createEmptyLearningHistoryState,
  createLearningHistorySystem,
  filterRecords,
  sortRecords,
  summarizeAll,
  summarizeByField,
  summarizeByStar,
  summarizeBySubject,
  summarizeByUnit,
} from '../../../src/engine/learningHistory/LearningHistorySystem';
import type { LearningHistoryRecord, QuestionResult } from '../../../src/engine/learningHistory/LearningHistory.types';

function makeDeterministicIdFactory(prefix = 'hist'): () => string {
  let counter = 0;
  return () => `${prefix}_${++counter}`;
}

function makeFixedClock(startAt = 1000, stepMs = 10) {
  let now = startAt;
  return {
    now: () => {
      const value = now;
      now += stepMs;
      return value;
    },
  };
}

function makeQuestionResult(overrides: Partial<QuestionResult> = {}): QuestionResult {
  return {
    questionId: 'q1',
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    answerResult: 'CORRECT',
    recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 0 },
    ...overrides,
  };
}

function makeRecord(overrides: Partial<LearningHistoryRecord> = {}): LearningHistoryRecord {
  return {
    id: 'r1',
    answeredAt: 1000,
    ...makeQuestionResult(),
    ...overrides,
  };
}

describe('LearningHistorySystem.recordAnswer', () => {
  it('appends exactly one record with an id from the injected factory and a timestamp from the injected clock', () => {
    const system = createLearningHistorySystem({ idFactory: makeDeterministicIdFactory(), clock: makeFixedClock(5000) });
    const state = createEmptyLearningHistoryState();

    const next = system.recordAnswer(state, makeQuestionResult());

    expect(next.records).toHaveLength(1);
    expect(next.records[0]).toEqual({ ...makeQuestionResult(), id: 'hist_1', answeredAt: 5000 });
    // Pure: the input state is untouched.
    expect(state.records).toHaveLength(0);
  });

  it('appends a second record with a new id/timestamp on a second call, even for the identical questionId (user instruction: same question answered twice = 2 records)', () => {
    const system = createLearningHistorySystem({ idFactory: makeDeterministicIdFactory(), clock: makeFixedClock(1000, 10) });
    let state = createEmptyLearningHistoryState();

    state = system.recordAnswer(state, makeQuestionResult({ answerResult: 'CORRECT' }));
    state = system.recordAnswer(state, makeQuestionResult({ answerResult: 'INCORRECT' }));

    expect(state.records).toHaveLength(2);
    expect(state.records[0].id).not.toBe(state.records[1].id);
    expect(state.records[0].questionId).toBe(state.records[1].questionId);
    expect(state.records.map((r) => r.answerResult)).toEqual(['CORRECT', 'INCORRECT']);
  });
});

describe('computeAccuracy', () => {
  it('is 0 for zero answers (never NaN/Infinity)', () => {
    expect(computeAccuracy({ total: 0, correct: 0, incorrect: 0, unknown: 0 })).toBe(0);
  });

  it('divides by total = CORRECT + INCORRECT + UNKNOWN', () => {
    // 6 correct / 3 incorrect / 1 unknown / 10 total -> 60% (user's explicit example).
    expect(computeAccuracy({ total: 10, correct: 6, incorrect: 3, unknown: 1 })).toBeCloseTo(0.6);
  });
});

describe('summarizeAll', () => {
  it('is all-zero for an empty record set', () => {
    expect(summarizeAll([])).toEqual({ total: 0, correct: 0, incorrect: 0, unknown: 0, accuracy: 0 });
  });

  it('counts a single CORRECT record', () => {
    const records = [makeRecord({ answerResult: 'CORRECT' })];
    expect(summarizeAll(records)).toEqual({ total: 1, correct: 1, incorrect: 0, unknown: 0, accuracy: 1 });
  });

  it('counts a single INCORRECT record', () => {
    const records = [makeRecord({ answerResult: 'INCORRECT' })];
    expect(summarizeAll(records)).toEqual({ total: 1, correct: 0, incorrect: 1, unknown: 0, accuracy: 0 });
  });

  it('counts a single UNKNOWN record, kept independent from INCORRECT', () => {
    const records = [makeRecord({ answerResult: 'UNKNOWN', recordedAnswer: { type: 'UNKNOWN' } })];
    const summary = summarizeAll(records);
    expect(summary).toEqual({ total: 1, correct: 0, incorrect: 0, unknown: 1, accuracy: 0 });
  });

  it('aggregates a mix of CORRECT/INCORRECT/UNKNOWN with the correct denominator', () => {
    const records = [
      ...Array.from({ length: 6 }, (_, i) => makeRecord({ id: `c${i}`, answerResult: 'CORRECT' })),
      ...Array.from({ length: 3 }, (_, i) => makeRecord({ id: `i${i}`, answerResult: 'INCORRECT' })),
      makeRecord({ id: 'u0', answerResult: 'UNKNOWN', recordedAnswer: { type: 'UNKNOWN' } }),
    ];
    expect(summarizeAll(records)).toEqual({ total: 10, correct: 6, incorrect: 3, unknown: 1, accuracy: 0.6 });
  });
});

describe('summarizeBySubject / summarizeByField / summarizeByUnit', () => {
  const records = [
    makeRecord({ id: '1', subject: '数学', field: '計算', unit: '四則演算', answerResult: 'CORRECT' }),
    makeRecord({ id: '2', subject: '数学', field: '計算', unit: '四則演算', answerResult: 'INCORRECT' }),
    makeRecord({ id: '3', subject: '数学', field: '図形', unit: '面積', answerResult: 'CORRECT' }),
    makeRecord({ id: '4', subject: '英語', field: '語彙', unit: '基礎単語', answerResult: 'CORRECT' }),
  ];

  it('groups by subject across multiple subjects', () => {
    const bySubject = summarizeBySubject(records);
    expect(bySubject).toEqual([
      { subject: '数学', summary: { total: 3, correct: 2, incorrect: 1, unknown: 0, accuracy: 2 / 3 } },
      { subject: '英語', summary: { total: 1, correct: 1, incorrect: 0, unknown: 0, accuracy: 1 } },
    ]);
  });

  it('groups by field within one subject across multiple fields', () => {
    const byField = summarizeByField(records, '数学');
    expect(byField).toEqual([
      { subject: '数学', field: '計算', summary: { total: 2, correct: 1, incorrect: 1, unknown: 0, accuracy: 0.5 } },
      { subject: '数学', field: '図形', summary: { total: 1, correct: 1, incorrect: 0, unknown: 0, accuracy: 1 } },
    ]);
  });

  it('groups by unit within one subject+field across multiple units', () => {
    const records2 = [
      ...records,
      makeRecord({ id: '5', subject: '数学', field: '計算', unit: '小数', answerResult: 'CORRECT' }),
    ];
    const byUnit = summarizeByUnit(records2, '数学', '計算');
    expect(byUnit).toEqual([
      { subject: '数学', field: '計算', unit: '四則演算', summary: { total: 2, correct: 1, incorrect: 1, unknown: 0, accuracy: 0.5 } },
      { subject: '数学', field: '計算', unit: '小数', summary: { total: 1, correct: 1, incorrect: 0, unknown: 0, accuracy: 1 } },
    ]);
  });
});

describe('summarizeByStar', () => {
  it('always returns all 5 ★ levels, zero-filled when unattempted', () => {
    const records = [makeRecord({ star: 3, answerResult: 'CORRECT' })];
    const byStar = summarizeByStar(records);
    expect(byStar.map((s) => s.star)).toEqual([1, 2, 3, 4, 5]);
    expect(byStar.find((s) => s.star === 3)!.summary).toEqual({ total: 1, correct: 1, incorrect: 0, unknown: 0, accuracy: 1 });
    expect(byStar.find((s) => s.star === 1)!.summary).toEqual({ total: 0, correct: 0, incorrect: 0, unknown: 0, accuracy: 0 });
  });

  it('aggregates each of ★1〜★5 independently', () => {
    const records = ([1, 2, 3, 4, 5] as const).map((star) => makeRecord({ id: `s${star}`, star, answerResult: 'CORRECT' }));
    const byStar = summarizeByStar(records);
    for (const entry of byStar) {
      expect(entry.summary.total).toBe(1);
      expect(entry.summary.correct).toBe(1);
    }
  });
});

describe('filterRecords', () => {
  const records = [
    makeRecord({ id: '1', subject: '数学', field: '計算', unit: '四則演算', star: 1, answerResult: 'CORRECT' }),
    makeRecord({ id: '2', subject: '数学', field: '図形', unit: '面積', star: 2, answerResult: 'INCORRECT' }),
    makeRecord({ id: '3', subject: '英語', field: '語彙', unit: '基礎単語', star: 1, answerResult: 'UNKNOWN', recordedAnswer: { type: 'UNKNOWN' } }),
  ];

  it('filters by subject', () => {
    expect(filterRecords(records, { subject: '数学' }).map((r) => r.id)).toEqual(['1', '2']);
  });

  it('filters by field', () => {
    expect(filterRecords(records, { field: '図形' }).map((r) => r.id)).toEqual(['2']);
  });

  it('filters by unit', () => {
    expect(filterRecords(records, { unit: '基礎単語' }).map((r) => r.id)).toEqual(['3']);
  });

  it('filters by star', () => {
    expect(filterRecords(records, { star: 1 }).map((r) => r.id)).toEqual(['1', '3']);
  });

  it('filters by answerResult', () => {
    expect(filterRecords(records, { answerResult: 'UNKNOWN' }).map((r) => r.id)).toEqual(['3']);
  });

  it('ANDs multiple filter fields together', () => {
    expect(filterRecords(records, { subject: '数学', star: 2 }).map((r) => r.id)).toEqual(['2']);
  });

  it('returns every record when no filter field is set', () => {
    expect(filterRecords(records, {})).toHaveLength(3);
  });
});

describe('sortRecords', () => {
  const records = [
    makeRecord({ id: 'a', answeredAt: 100 }),
    makeRecord({ id: 'b', answeredAt: 300 }),
    makeRecord({ id: 'c', answeredAt: 200 }),
  ];

  it('sorts newest first', () => {
    expect(sortRecords(records, 'NEWEST_FIRST').map((r) => r.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts oldest first', () => {
    expect(sortRecords(records, 'OLDEST_FIRST').map((r) => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input array', () => {
    const copy = [...records];
    sortRecords(records, 'NEWEST_FIRST');
    expect(records).toEqual(copy);
  });
});
