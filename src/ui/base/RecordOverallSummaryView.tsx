import type { LearningHistoryRecord } from '../../engine/learningHistory/LearningHistory.types';
import { summarizeAll } from '../../engine/learningHistory/LearningHistorySystem';
import { formatAccuracyPercent } from './recordDisplay';

interface RecordOverallSummaryViewProps {
  records: LearningHistoryRecord[];
}

/** A. 全体サマリー (spec v0.8 §13.4): 総回答数/正解/不正解/わからない/正答率. Always derived from `records`, never stored separately. */
export function RecordOverallSummaryView({ records }: RecordOverallSummaryViewProps) {
  const summary = summarizeAll(records);

  return (
    <section className="record-overall-summary">
      <h2>全体サマリー</h2>
      <dl>
        <dt>総回答数</dt>
        <dd>{summary.total}</dd>
        <dt>正解</dt>
        <dd>{summary.correct}</dd>
        <dt>不正解</dt>
        <dd>{summary.incorrect}</dd>
        <dt>わからない</dt>
        <dd>{summary.unknown}</dd>
        <dt>正答率</dt>
        <dd>{formatAccuracyPercent(summary.accuracy)}</dd>
      </dl>
    </section>
  );
}
