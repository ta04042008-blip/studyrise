import type { StarLevel } from '../../types/stats';
import type { Clock } from './clock';
import type { LearningHistoryIdFactory } from './idFactory';
import type {
  AccuracySummary,
  AnswerCounts,
  FieldSummary,
  LearningHistoryFilter,
  LearningHistoryRecord,
  LearningHistorySortOrder,
  LearningHistoryState,
  QuestionResult,
  StarSummary,
  SubjectSummary,
  UnitSummary,
} from './LearningHistory.types';

export function createEmptyLearningHistoryState(): LearningHistoryState {
  return { records: [] };
}

export interface LearningHistorySystemDeps {
  idFactory: LearningHistoryIdFactory;
  clock: Clock;
}

export interface LearningHistorySystem {
  /**
   * Appends exactly one record from an already-finalized `QuestionResult`
   * (user's explicit MVP-8 event boundary — never called from a
   * `useEffect`, only from the answer-confirmation event handler chain).
   * Pure aside from the injected id/clock — mirrors ProgressionSystem's
   * `reconcileStageResult` style (input state → new state).
   */
  recordAnswer(state: LearningHistoryState, result: QuestionResult): LearningHistoryState;
}

/**
 * LearningHistorySystem (CLAUDE.md §21 MVP-8, user's explicit decision
 * doc): owns recording one finalized answer and deriving aggregates from
 * `LearningHistoryState.records`. Never touches Battle/Stage/Roguelite/
 * Progression state — those systems only ever hand it a `QuestionResult`.
 */
export function createLearningHistorySystem({ idFactory, clock }: LearningHistorySystemDeps): LearningHistorySystem {
  return {
    recordAnswer(state, result) {
      const record: LearningHistoryRecord = {
        ...result,
        id: idFactory(),
        answeredAt: clock.now(),
      };
      return { records: [...state.records, record] };
    },
  };
}

// ---------------------------------------------------------------------------
// Aggregation — pure, no DI, always derived from `records` (never stored
// separately; user's explicit instruction).
// ---------------------------------------------------------------------------

/** 0 (never NaN/Infinity) when `counts.total` is 0 (user's explicit instruction). */
export function computeAccuracy(counts: AnswerCounts): number {
  return counts.total === 0 ? 0 : counts.correct / counts.total;
}

function toCounts(records: readonly LearningHistoryRecord[]): AnswerCounts {
  let correct = 0;
  let incorrect = 0;
  let unknown = 0;
  for (const record of records) {
    if (record.answerResult === 'CORRECT') correct += 1;
    else if (record.answerResult === 'INCORRECT') incorrect += 1;
    else unknown += 1;
  }
  return { total: records.length, correct, incorrect, unknown };
}

function toSummary(records: readonly LearningHistoryRecord[]): AccuracySummary {
  const counts = toCounts(records);
  return { ...counts, accuracy: computeAccuracy(counts) };
}

export function summarizeAll(records: readonly LearningHistoryRecord[]): AccuracySummary {
  return toSummary(records);
}

/** Order-stable (first-seen order), mirroring `deriveQuestionCatalog`'s convention. */
export function summarizeBySubject(records: readonly LearningHistoryRecord[]): SubjectSummary[] {
  const bySubject = new Map<string, LearningHistoryRecord[]>();
  for (const record of records) {
    if (!bySubject.has(record.subject)) bySubject.set(record.subject, []);
    bySubject.get(record.subject)!.push(record);
  }
  return Array.from(bySubject.entries()).map(([subject, subjectRecords]) => ({
    subject,
    summary: toSummary(subjectRecords),
  }));
}

/** Scoped to one 教科 (drill-down step 2 of 教科→分野→単元). */
export function summarizeByField(records: readonly LearningHistoryRecord[], subject: string): FieldSummary[] {
  const scoped = records.filter((record) => record.subject === subject);
  const byField = new Map<string, LearningHistoryRecord[]>();
  for (const record of scoped) {
    if (!byField.has(record.field)) byField.set(record.field, []);
    byField.get(record.field)!.push(record);
  }
  return Array.from(byField.entries()).map(([field, fieldRecords]) => ({
    subject,
    field,
    summary: toSummary(fieldRecords),
  }));
}

/** Scoped to one 教科+分野 (drill-down step 3 of 教科→分野→単元). */
export function summarizeByUnit(records: readonly LearningHistoryRecord[], subject: string, field: string): UnitSummary[] {
  const scoped = records.filter((record) => record.subject === subject && record.field === field);
  const byUnit = new Map<string, LearningHistoryRecord[]>();
  for (const record of scoped) {
    if (!byUnit.has(record.unit)) byUnit.set(record.unit, []);
    byUnit.get(record.unit)!.push(record);
  }
  return Array.from(byUnit.entries()).map(([unit, unitRecords]) => ({
    subject,
    field,
    unit,
    summary: toSummary(unitRecords),
  }));
}

const ALL_STAR_LEVELS: readonly StarLevel[] = [1, 2, 3, 4, 5];

/** Always all 5 ★ levels (★ is a fixed 1〜5 domain, unlike open-ended subject/field/unit strings), zero-filled when a level has no records. */
export function summarizeByStar(records: readonly LearningHistoryRecord[]): StarSummary[] {
  return ALL_STAR_LEVELS.map((star) => ({
    star,
    summary: toSummary(records.filter((record) => record.star === star)),
  }));
}

/** All fields AND together; an absent field imposes no restriction (user's explicit MVP-8 filter scope — no period filters). */
export function filterRecords(
  records: readonly LearningHistoryRecord[],
  filter: LearningHistoryFilter,
): LearningHistoryRecord[] {
  return records.filter((record) => {
    if (filter.subject !== undefined && record.subject !== filter.subject) return false;
    if (filter.field !== undefined && record.field !== filter.field) return false;
    if (filter.unit !== undefined && record.unit !== filter.unit) return false;
    if (filter.star !== undefined && record.star !== filter.star) return false;
    if (filter.answerResult !== undefined && record.answerResult !== filter.answerResult) return false;
    return true;
  });
}

/** Array.prototype.sort is a stable sort (ES2019+), so equal `answeredAt` values keep their relative order. */
export function sortRecords(
  records: readonly LearningHistoryRecord[],
  order: LearningHistorySortOrder,
): LearningHistoryRecord[] {
  const ascending = [...records].sort((a, b) => a.answeredAt - b.answeredAt);
  return order === 'OLDEST_FIRST' ? ascending : ascending.reverse();
}
