import type { AnswerResult, LearningHistoryRecord, LearningHistoryState } from '../learningHistory/LearningHistory.types';
import type { SaveEnvelope } from './SaveEnvelope';
import { looksLikeEnvelope } from './SaveEnvelope';

export const LEARNING_HISTORY_SAVE_SCHEMA_VERSION = 1;

export type LearningHistorySaveEnvelope = SaveEnvelope<LearningHistoryState>;

const ANSWER_RESULTS: readonly AnswerResult[] = ['CORRECT', 'INCORRECT', 'UNKNOWN'];

function isValidRecord(value: unknown): value is LearningHistoryRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<LearningHistoryRecord>;
  if (typeof r.id !== 'string' || typeof r.questionId !== 'string') return false;
  if (typeof r.subject !== 'string' || typeof r.field !== 'string' || typeof r.unit !== 'string') return false;
  if (typeof r.star !== 'number') return false;
  if (typeof r.answeredAt !== 'number') return false;
  if (!r.answerResult || !ANSWER_RESULTS.includes(r.answerResult)) return false;
  if (!r.recordedAnswer || typeof r.recordedAnswer !== 'object') return false;
  const answer = r.recordedAnswer as { type?: unknown; selectedIndex?: unknown };
  if (answer.type === 'MULTIPLE_CHOICE') {
    if (typeof answer.selectedIndex !== 'number') return false;
  } else if (answer.type !== 'UNKNOWN') {
    return false;
  }
  return true;
}

/**
 * Only `records` is validated/persisted — aggregate summaries are never
 * saved (spec §13.1/user's explicit instruction: always re-derived from
 * `records` after load, never stored).
 */
export function validateLearningHistoryPayload(payload: unknown): payload is LearningHistoryState {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Partial<LearningHistoryState>;
  if (!Array.isArray(p.records)) return false;
  return p.records.every(isValidRecord);
}

export function migrateLearningHistorySave(raw: unknown): LearningHistorySaveEnvelope | null {
  if (!looksLikeEnvelope(raw)) return null;
  if (raw.schemaVersion !== LEARNING_HISTORY_SAVE_SCHEMA_VERSION) return null;
  if (!validateLearningHistoryPayload(raw.payload)) return null;
  return { schemaVersion: LEARNING_HISTORY_SAVE_SCHEMA_VERSION, savedAt: raw.savedAt, payload: raw.payload };
}
