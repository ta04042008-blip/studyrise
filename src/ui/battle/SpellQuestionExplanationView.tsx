import { useState } from 'react';
import type { SpellQuestionOutcome } from '../../engine/battle/BattleEngine.types';
import type { QuestionAnswer, QuestionDefinition } from '../../engine/question/QuestionEngine.types';

interface SpellQuestionExplanationViewProps {
  outcome: SpellQuestionOutcome;
  onAdvance: () => void;
}

function submittedAnswerText(question: QuestionDefinition, answer: QuestionAnswer): string {
  switch (answer.type) {
    case 'dont_know':
      return 'わからない';
    case 'multiple_choice':
      return question.format === 'multiple_choice' ? (question.choices[answer.selectedIndex] ?? '—') : '—';
    case 'true_false':
      return answer.value ? '正' : '誤';
    case 'ordering':
      return question.format === 'ordering'
        ? answer.order.map((index) => question.items[index]).filter(Boolean).join(' ')
        : '—';
    case 'short_answer':
      return answer.value;
  }
}

function correctAnswerText(question: QuestionDefinition): string {
  switch (question.format) {
    case 'multiple_choice':
      return question.choices[question.correctIndex] ?? '—';
    case 'true_false':
      return question.correctAnswer ? '正' : '誤';
    case 'ordering':
      return question.correctOrder.map((index) => question.items[index]).filter(Boolean).join(' ');
    case 'short_answer':
      return question.acceptedAnswers[0] ?? '—';
  }
}

/**
 * Explanation between each question in the five-question spell preparation
 * sequence. No battle calculation happens here; the engine already confirmed
 * correctness and retains the sequence until the player explicitly advances.
 */
export function SpellQuestionExplanationView({ outcome, onAdvance }: SpellQuestionExplanationViewProps) {
  const [advanced, setAdvanced] = useState(false);
  const { question } = outcome;
  const answeredCount = outcome.questionIndex + 1;

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true);
    onAdvance();
  }

  return (
    <div className="spell-question-explanation-view">
      <div className="spell-question-explanation-view__progress">
        スペル発動準備 {answeredCount} / 5
      </div>
      <div className="spell-question-explanation-view__meta">
        {question.subject} / {'★'.repeat(question.star)} / {question.field} / {question.unit}
      </div>
      <p className="spell-question-explanation-view__text">{question.text}</p>
      {question.format === 'multiple_choice' && (
        <ul className="spell-question-explanation-view__choices">
          {question.choices.map((choice, index) => <li key={index}>{choice}</li>)}
        </ul>
      )}
      <p>あなたの回答: {submittedAnswerText(question, outcome.submittedAnswer)}</p>
      <p>正答: {correctAnswerText(question)}</p>
      <p className={`spell-question-explanation-view__verdict spell-question-explanation-view__verdict--${outcome.correct ? 'correct' : 'incorrect'}`}>
        {outcome.correct ? '正解！' : '不正解'}
      </p>
      <p className="spell-question-explanation-view__explanation">{question.explanation}</p>
      <p className="spell-question-explanation-view__score">現在 {outcome.correctCount} / 5 正解</p>
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        {answeredCount < 5 ? '次の問題へ' : '準備完了'}
      </button>
    </div>
  );
}
