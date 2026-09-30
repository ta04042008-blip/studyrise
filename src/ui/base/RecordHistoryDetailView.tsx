import type { LearningHistoryRecord } from '../../engine/learningHistory/LearningHistory.types';
import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import { ANSWER_RESULT_LABELS, formatAnsweredAt } from './recordDisplay';

interface RecordHistoryDetailViewProps {
  record: LearningHistoryRecord;
  /** Resolved from the canonical question registry by `questionId` — may be absent (deleted/renumbered content). */
  question: QuestionDefinition | undefined;
  onBack: () => void;
}

function submittedAnswerText(record: LearningHistoryRecord, question: QuestionDefinition): string {
  const answer = record.recordedAnswer;
  if (answer.type === 'UNKNOWN') return 'わからない';
  if (answer.type === 'MULTIPLE_CHOICE') {
    return question.format === 'multiple_choice'
      ? (question.choices[answer.selectedIndex] ?? `選択肢${answer.selectedIndex + 1}`)
      : `選択肢${answer.selectedIndex + 1}`;
  }
  if (answer.type === 'TRUE_FALSE') return answer.value ? '正' : '誤';
  if (answer.type === 'ORDERING') {
    if (question.format !== 'ordering') return answer.order.join(',');
    return answer.order.map((index) => question.items[index] ?? '').join(' ');
  }
  return answer.value;
}

function correctAnswerText(question: QuestionDefinition): string {
  switch (question.format) {
    case 'multiple_choice':
      return question.choices[question.correctIndex] ?? '';
    case 'true_false':
      return question.correctAnswer ? '正' : '誤';
    case 'ordering':
      return question.correctOrder.map((index) => question.items[index] ?? '').join(' ');
    case 'short_answer':
      return question.acceptedAnswers.join(' / ');
  }
}

/**
 * Read-only learning-history detail. Question content is always resolved
 * from the canonical registry rather than duplicated in the save record.
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
      ) : (
        <div className="record-history-detail__question">
          <p className="record-history-detail__text">{question.text}</p>
          {question.format === 'multiple_choice' && (
            <ul>
              {question.choices.map((choice, index) => {
                const isSelected = record.recordedAnswer.type === 'MULTIPLE_CHOICE' && record.recordedAnswer.selectedIndex === index;
                const isCorrectChoice = question.correctIndex === index;
                return (
                  <li key={index}>
                    {choice}
                    {isSelected && '（自分の回答）'}
                    {isCorrectChoice && '（正答）'}
                  </li>
                );
              })}
            </ul>
          )}
          {question.format === 'ordering' && (
            <p>語句: {question.items.join(' / ')}</p>
          )}
          <p>自分の回答: {submittedAnswerText(record, question)}</p>
          <p>正答: {correctAnswerText(question)}</p>
          <p className="record-history-detail__explanation">{question.explanation}</p>
        </div>
      )}

      <button type="button" onClick={onBack}>
        一覧へ戻る
      </button>
    </section>
  );
}
