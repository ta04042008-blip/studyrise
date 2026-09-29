import { useState } from 'react';
import type { MultipleChoiceAnswer, QuestionDefinition } from '../../engine/question/QuestionEngine.types';

interface QuestionViewProps {
  question: QuestionDefinition;
  onSubmit: (answer: MultipleChoiceAnswer) => void;
}

/**
 * MVP-1 only serves multiple_choice questions (see QuestionEngine.types.ts
 * for why the other 3 formats are typed but not implemented yet).
 * Spec §12.7: selecting a choice does not confirm it — only「回答する」
 * does. 「わからない」confirms immediately, no dialog.
 */
export function QuestionView({ question, onSubmit }: QuestionViewProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  if (question.format !== 'multiple_choice') {
    // Content validation should prevent this from ever being reached in
    // MVP-1's question pool; this is a defensive fallback, not new gameplay.
    return <p>この問題形式はMVP-1では未対応です。</p>;
  }

  function handleAnswer() {
    if (submitted || selectedIndex == null) return;
    setSubmitted(true); // idempotency guard (CLAUDE.md §13)
    onSubmit({ type: 'multiple_choice', selectedIndex });
  }

  function handleDontKnow() {
    if (submitted) return;
    setSubmitted(true);
    onSubmit({ type: 'dont_know' });
  }

  return (
    <div className="question-view">
      <div className="question-view__meta">
        {question.subject} / {'★'.repeat(question.star)}
      </div>
      <p className="question-view__text">{question.text}</p>
      <button className="question-view__dont-know" type="button" disabled={submitted} onClick={handleDontKnow}>
        わからない
      </button>
      <ul className="question-view__choices">
        {question.choices.map((choice, index) => (
          <li key={choice} className={selectedIndex === index ? 'question-view__choice--selected' : ''}>
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
        <button type="button" disabled={submitted || selectedIndex == null} onClick={handleAnswer}>
          回答する
        </button>
      </div>
    </div>
  );
}
