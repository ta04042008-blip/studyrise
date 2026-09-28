import type { LearningHistoryRecord } from '../../engine/learningHistory/LearningHistory.types';
import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import { ANSWER_RESULT_LABELS, formatAnsweredAt } from './recordDisplay';

interface RecordHistoryDetailViewProps {
  record: LearningHistoryRecord;
  /** Resolved from the canonical question registry by `questionId` — may be absent (deleted/renumbered content). */
  question: QuestionDefinition | undefined;
  onBack: () => void;
}

/**
 * E. 履歴詳細 (spec v0.8 §13.2). Problem text/choices/correct answer/
 * explanation are resolved from `question` (canonical QuestionDefinition),
 * never duplicated onto the record itself (user's explicit MVP-8
 * instruction). No re-answer/retry affordance here (user's explicit
 * instruction — this is read-only history).
 */
export function RecordHistoryDetailView({ record, question, onBack }: RecordHistoryDetailViewProps) {
  return (
    <section className="record-history-detail">
      <h2>履歴詳細</h2>
      <dl>
        <dt>教科</dt>
        <dd>{record.subject}</dd>
        <dt>分野</dt>
        <dd>{record.field}</dd>
        <dt>単元</dt>
        <dd>{record.unit}</dd>
        <dt>★</dt>
        <dd>{'★'.repeat(record.star)}</dd>
        <dt>正誤</dt>
        <dd>{ANSWER_RESULT_LABELS[record.answerResult]}</dd>
        <dt>日時</dt>
        <dd>{formatAnsweredAt(record.answeredAt)}</dd>
      </dl>

      {!question ? (
        <p>問題データを読み込めません。</p>
      ) : question.format !== 'multiple_choice' ? (
        <p>この問題形式の詳細表示はまだ未対応です。</p>
      ) : (
        <div className="record-history-detail__question">
          <p className="record-history-detail__text">{question.text}</p>
          <ul>
            {question.choices.map((choice, index) => {
              const isSelected = record.recordedAnswer.type === 'MULTIPLE_CHOICE' && record.recordedAnswer.selectedIndex === index;
              const isCorrectChoice = question.correctIndex === index;
              return (
                <li key={choice}>
                  {choice}
                  {isSelected && '（自分の回答）'}
                  {isCorrectChoice && '（正答）'}
                </li>
              );
            })}
          </ul>
          {record.recordedAnswer.type === 'UNKNOWN' && <p>自分の回答: わからない</p>}
          <p className="record-history-detail__explanation">{question.explanation}</p>
        </div>
      )}

      <button type="button" onClick={onBack}>
        一覧へ戻る
      </button>
    </section>
  );
}
