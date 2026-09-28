import { useMemo, useState } from 'react';
import type { AnswerResult, LearningHistoryRecord, LearningHistorySortOrder } from '../../engine/learningHistory/LearningHistory.types';
import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import type { StarLevel } from '../../types/stats';
import { filterRecords, sortRecords } from '../../engine/learningHistory/LearningHistorySystem';
import { ANSWER_RESULT_LABELS, formatAnsweredAt } from './recordDisplay';

const ALL_STARS: StarLevel[] = [1, 2, 3, 4, 5];
const PREVIEW_LENGTH = 30;

interface RecordHistoryListViewProps {
  records: LearningHistoryRecord[];
  questionsById: Record<string, QuestionDefinition>;
  onSelectRecord: (id: string) => void;
}

/**
 * D+F. 履歴一覧 + 絞り込み (spec v0.8 §13.2/§13.3, user's explicit MVP-8
 * instruction). Filter/sort selections are ephemeral component state —
 * derived views over `records`, never written back into LearningHistoryState
 * (user's explicit instruction: no double-storage of filter results). No
 * period filter (today/week/month/range) per user's explicit MVP-8 scope.
 */
export function RecordHistoryListView({ records, questionsById, onSelectRecord }: RecordHistoryListViewProps) {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [fieldFilter, setFieldFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [starFilter, setStarFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<LearningHistorySortOrder>('NEWEST_FIRST');

  const subjects = useMemo(() => Array.from(new Set(records.map((r) => r.subject))), [records]);
  const fields = useMemo(
    () => Array.from(new Set(records.filter((r) => !subjectFilter || r.subject === subjectFilter).map((r) => r.field))),
    [records, subjectFilter],
  );
  const units = useMemo(
    () =>
      Array.from(
        new Set(
          records
            .filter((r) => (!subjectFilter || r.subject === subjectFilter) && (!fieldFilter || r.field === fieldFilter))
            .map((r) => r.unit),
        ),
      ),
    [records, subjectFilter, fieldFilter],
  );

  const visibleRecords = sortRecords(
    filterRecords(records, {
      subject: subjectFilter || undefined,
      field: fieldFilter || undefined,
      unit: unitFilter || undefined,
      star: starFilter ? (Number(starFilter) as StarLevel) : undefined,
      answerResult: (resultFilter || undefined) as AnswerResult | undefined,
    }),
    sortOrder,
  );

  return (
    <section className="record-history-list">
      <h2>履歴一覧</h2>

      <div className="record-history-list__filters">
        <label>
          教科
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value);
              setFieldFilter('');
              setUnitFilter('');
            }}
          >
            <option value="">すべて</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>

        <label>
          分野
          <select
            value={fieldFilter}
            onChange={(e) => {
              setFieldFilter(e.target.value);
              setUnitFilter('');
            }}
          >
            <option value="">すべて</option>
            {fields.map((field) => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>
        </label>

        <label>
          単元
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)}>
            <option value="">すべて</option>
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>

        <label>
          ★
          <select value={starFilter} onChange={(e) => setStarFilter(e.target.value)}>
            <option value="">すべて</option>
            {ALL_STARS.map((star) => (
              <option key={star} value={star}>
                {'★'.repeat(star)}
              </option>
            ))}
          </select>
        </label>

        <label>
          正誤
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="">すべて</option>
            <option value="CORRECT">{ANSWER_RESULT_LABELS.CORRECT}</option>
            <option value="INCORRECT">{ANSWER_RESULT_LABELS.INCORRECT}</option>
            <option value="UNKNOWN">{ANSWER_RESULT_LABELS.UNKNOWN}</option>
          </select>
        </label>

        <label>
          並び順
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as LearningHistorySortOrder)}>
            <option value="NEWEST_FIRST">新しい順</option>
            <option value="OLDEST_FIRST">古い順</option>
          </select>
        </label>
      </div>

      {visibleRecords.length === 0 ? (
        <p>該当する履歴がありません。</p>
      ) : (
        <ul>
          {visibleRecords.map((record) => {
            const question = questionsById[record.questionId];
            const preview = question ? question.text.slice(0, PREVIEW_LENGTH) : '（問題データを読み込めません）';
            return (
              <li key={record.id}>
                <button type="button" onClick={() => onSelectRecord(record.id)}>
                  {record.subject} / {record.field} / {record.unit} / {'★'.repeat(record.star)} /{' '}
                  {ANSWER_RESULT_LABELS[record.answerResult]} / {formatAnsweredAt(record.answeredAt)}
                  <br />
                  {preview}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
