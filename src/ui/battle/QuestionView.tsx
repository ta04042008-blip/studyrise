import { useState } from 'react';
import type { QuestionAnswer, QuestionDefinition } from '../../engine/question/QuestionEngine.types';

interface QuestionViewProps {
  question: QuestionDefinition;
  onSubmit: (answer: QuestionAnswer) => void;
}

/** Renders every format present in the attached official StudyRise banks. */
export function QuestionView({ question, onSubmit }: QuestionViewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [ordering, setOrdering] = useState<number[]>([]);
  const [shortAnswer, setShortAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function confirm(answer: QuestionAnswer) {
    if (submitted) return;
    setSubmitted(true);
    onSubmit(answer);
  }

  function handleDontKnow() {
    confirm({ type: 'dont_know' });
  }

  function appendOrdering(index: number) {
    if (submitted || ordering.includes(index)) return;
    setOrdering([...ordering, index]);
  }

  return (
    <div className="question-view">
      <div className="question-view__meta">
        {question.subject} / {question.field} / {question.unit} / {'★'.repeat(question.star)}
      </div>
      <p className="question-view__text">{question.text}</p>
      <button className="question-view__dont-know" type="button" disabled={submitted} onClick={handleDontKnow}>
        わからない
      </button>

      {question.format === 'multiple_choice' && (
        <>
          <ul className="question-view__choices">
            {question.choices.map((choice, index) => (
              <li key={index} className={selectedIndex === index ? 'question-view__choice--selected' : ''}>
                <label>
                  <input
                    type="radio"
                    name="answer"
                    checked={selectedIndex === index}
                    disabled={submitted}
                    onChange={() => setSelectedIndex(index)}
                  />
                  {choice}
                </label>
              </li>
            ))}
          </ul>
          <div className="question-view__actions">
            <button type="button" disabled={submitted || selectedIndex == null} onClick={() => confirm({ type: 'multiple_choice', selectedIndex: selectedIndex! })}>
              回答する
            </button>
          </div>
        </>
      )}

      {question.format === 'true_false' && (
        <div className="question-view__actions">
          <button type="button" disabled={submitted} onClick={() => confirm({ type: 'true_false', value: true })}>正</button>
          <button type="button" disabled={submitted} onClick={() => confirm({ type: 'true_false', value: false })}>誤</button>
        </div>
      )}

      {question.format === 'ordering' && (
        <>
          <div className="question-view__ordering-result">
            {ordering.map((index) => question.items[index]).join(' ')}
          </div>
          <div className="question-view__choices">
            {question.items.map((item, index) => (
              <button type="button" key={index} disabled={submitted || ordering.includes(index)} onClick={() => appendOrdering(index)}>
                {item}
              </button>
            ))}
          </div>
          <div className="question-view__actions">
            <button type="button" disabled={submitted || ordering.length === 0} onClick={() => setOrdering([])}>やり直す</button>
            <button type="button" disabled={submitted || ordering.length !== question.items.length} onClick={() => confirm({ type: 'ordering', order: ordering })}>
              回答する
            </button>
          </div>
        </>
      )}

      {question.format === 'short_answer' && (
        <>
          <input
            className="question-view__short-answer"
            type="text"
            value={shortAnswer}
            disabled={submitted}
            autoComplete="off"
            onChange={(event) => setShortAnswer(event.target.value)}
          />
          <div className="question-view__actions">
            <button type="button" disabled={submitted || shortAnswer.trim() === ''} onClick={() => confirm({ type: 'short_answer', value: shortAnswer })}>
              回答する
            </button>
          </div>
        </>
      )}
    </div>
  );
}
