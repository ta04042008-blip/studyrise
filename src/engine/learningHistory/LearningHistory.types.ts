import type { StarLevel } from '../../types/stats';

/**
 * 学習履歴の正誤区分 (spec v0.8 §13.1/§13.4). 「わからない」は不正解へ
 * 統合しない独立区分 — user's explicit MVP-8 instruction.
 */
export type AnswerResult = 'CORRECT' | 'INCORRECT' | 'UNKNOWN';

/**
 * What the player actually submitted, kept as a discriminated union so a
 * future question format (true/false, ordering, short answer — see
 * QuestionEngine.types.ts) can add a variant without breaking existing
 * records (user's explicit MVP-8 instruction). MVP-8 only ever produces
 * `MULTIPLE_CHOICE` (the only format BattleEngine's `submitAnswer` currently
 * accepts) or `UNKNOWN` (「わからない」).
 */
export type RecordedAnswer =\n  | { type: 'MULTIPLE_CHOICE'; selectedIndex: number }\n  | { type: 'TRUE_FALSE'; value: boolean }\n  | { type: 'ORDERING'; order: number[] }\n  | { type: 'SHORT_ANSWER'; value: string }\n  | { type: 'UNKNOWN' };

/**
 * Boundary DTO from Battle layer → LearningHistorySystem (user's explicit
 * MVP-8 event boundary: "QuestionResult → LearningHistorySystem"). Carries
 * everything needed to record and aggregate one finalized answer, but never
 * the question text/choices/correct answer/explanation themselves — those
 * are resolved from `questionId` against the canonical QuestionDefinition
 * registry when a detail view needs them (CLAUDE.md §15/user's instruction:
 * no duplicated content in saved records).
 */
export interface QuestionResult {
  questionId: string;
  subject: string;
  field: string;
  unit: string;
  star: StarLevel;
  answerResult: AnswerResult;
  recordedAnswer: RecordedAnswer;
}

/** One finalized answer (spec §13.1), stored with a stable id and a Clock-sourced timestamp. */
export interface LearningHistoryRecord extends QuestionResult {
  id: string;
  /** Epoch ms from the injected Clock (never a direct `Date.now()` call at the record site). */
  answeredAt: number;
}

/**
 * Independent top-level state (user's explicit instruction: never merged
 * into PermanentState.characters/Inventory). MVP-9's SaveSystem persists
 * this as its own slice, separate from PermanentState and RunSave.
 */
export interface LearningHistoryState {
  records: LearningHistoryRecord[];
}

export interface AnswerCounts {
  total: number;
  correct: number;
  incorrect: number;
  unknown: number;
}

/** Denominator is always `total` = CORRECT + INCORRECT + UNKNOWN (user's explicit instruction). `accuracy` is 0 (never NaN/Infinity) when `total` is 0. */
export interface AccuracySummary extends AnswerCounts {
  accuracy: number;
}

export interface SubjectSummary {
  subject: string;
  summary: AccuracySummary;
}

export interface FieldSummary {
  subject: string;
  field: string;
  summary: AccuracySummary;
}

export interface UnitSummary {
  subject: string;
  field: string;
  unit: string;
  summary: AccuracySummary;
}

export interface StarSummary {
  star: StarLevel;
  summary: AccuracySummary;
}

/** All filter fields are optional/ANDed; an absent field means "no restriction" (user's explicit MVP-8 filter scope — no date-range/period filters). */
export interface LearningHistoryFilter {
  subject?: string;
  field?: string;
  unit?: string;
  star?: StarLevel;
  answerResult?: AnswerResult;
}

export type LearningHistorySortOrder = 'NEWEST_FIRST' | 'OLDEST_FIRST';
