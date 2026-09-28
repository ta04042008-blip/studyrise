import { useState } from 'react';
import type { LearningHistoryRecord } from '../../engine/learningHistory/LearningHistory.types';
import { summarizeByField, summarizeBySubject, summarizeByUnit } from '../../engine/learningHistory/LearningHistorySystem';
import { formatAccuracyPercent } from './recordDisplay';

interface RecordSubjectBreakdownViewProps {
  records: LearningHistoryRecord[];
}

/** B. 教科 → 分野 → 単元の確認 (spec v0.8 §13.4). A simple click-to-expand tree — no separate graphs. */
export function RecordSubjectBreakdownView({ records }: RecordSubjectBreakdownViewProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const subjectSummaries = summarizeBySubject(records);

  if (subjectSummaries.length === 0) {
    return (
      <section className="record-subject-breakdown">
        <h2>教科別</h2>
        <p>まだ回答履歴がありません。</p>
      </section>
    );
  }

  return (
    <section className="record-subject-breakdown">
      <h2>教科別</h2>
      <ul>
        {subjectSummaries.map(({ subject, summary }) => {
          const isSubjectExpanded = expandedSubject === subject;
          return (
            <li key={subject}>
              <button
                type="button"
                aria-expanded={isSubjectExpanded}
                onClick={() => {
                  setExpandedSubject(isSubjectExpanded ? null : subject);
                  setExpandedField(null);
                }}
              >
                {subject}（{summary.total}問 / 正答率{formatAccuracyPercent(summary.accuracy)}）
              </button>

              {isSubjectExpanded && (
                <ul>
                  {summarizeByField(records, subject).map(({ field, summary: fieldSummary }) => {
                    const isFieldExpanded = expandedField === field;
                    return (
                      <li key={field}>
                        <button
                          type="button"
                          aria-expanded={isFieldExpanded}
                          onClick={() => setExpandedField(isFieldExpanded ? null : field)}
                        >
                          {field}（{fieldSummary.total}問 / 正答率{formatAccuracyPercent(fieldSummary.accuracy)}）
                        </button>

                        {isFieldExpanded && (
                          <ul>
                            {summarizeByUnit(records, subject, field).map(({ unit, summary: unitSummary }) => (
                              <li key={unit}>
                                {unit}（{unitSummary.total}問 / 正答率{formatAccuracyPercent(unitSummary.accuracy)}）
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
