import type { AnswerResult } from '../../engine/learningHistory/LearningHistory.types';

/** `accuracy` is already 0..1 from LearningHistorySystem (never NaN/Infinity) — this only formats it. */
export function formatAccuracyPercent(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`;
}

export const ANSWER_RESULT_LABELS: Record<AnswerResult, string> = {
  CORRECT: '正解',
  INCORRECT: '不正解',
  UNKNOWN: 'わからない',
};

export function formatAnsweredAt(answeredAt: number): string {
  return new Date(answeredAt).toLocaleString();
}
