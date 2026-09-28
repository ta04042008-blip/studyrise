import type { LearningHistoryRecord } from '../../engine/learningHistory/LearningHistory.types';
import { summarizeByStar } from '../../engine/learningHistory/LearningHistorySystem';
import { formatAccuracyPercent } from './recordDisplay';

interface RecordStarBreakdownViewProps {
  records: LearningHistoryRecord[];
}

/** C. ★別成績 (spec v0.8 §13.4). Always all 5 ★ levels, zero-filled when unattempted. */
export function RecordStarBreakdownView({ records }: RecordStarBreakdownViewProps) {
  const starSummaries = summarizeByStar(records);

  return (
    <section className="record-star-breakdown">
      <h2>★別</h2>
      <ul>
        {starSummaries.map(({ star, summary }) => (
          <li key={star}>
            {'★'.repeat(star)}: {summary.total}問（正解{summary.correct} / 不正解{summary.incorrect} / わからない
            {summary.unknown}） 正答率{formatAccuracyPercent(summary.accuracy)}
          </li>
        ))}
      </ul>
    </section>
  );
}
