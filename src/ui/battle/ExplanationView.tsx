import { useEffect, useState } from 'react';
import type { QuestionCommandOutcome } from '../../engine/battle/BattleEngine.types';
import type { QuestionAnswer, QuestionDefinition } from '../../engine/question/QuestionEngine.types';

interface ExplanationViewProps {
  outcome: QuestionCommandOutcome;
  onAdvance: () => void;
}

/** Command-specific result line, shown alongside the 正解！/不正解 verdict. */
function getResultDetailText(outcome: QuestionCommandOutcome): string {
  switch (outcome.command) {
    case 'attack':
      return outcome.correct
        ? `${outcome.damage} ダメージを与えた${outcome.isCritical ? '（会心の一撃！）' : ''}`
        : 'ダメージなし';
    case 'guard':
      return outcome.applied
        ? `ガードを付与した（軽減${Math.round(outcome.mitigationPercent * 100)}%${outcome.isGreatSuccess ? '・大成功' : ''}）`
        : 'ガードは付与されなかった';
    case 'charge':
      return outcome.mpGained > 0
        ? `MP+${outcome.mpGained}${outcome.isGreatSuccess ? '（大成功）' : ''}`
        : 'MPの変化なし';
    case 'search':
      if (!outcome.success || outcome.revealedActions.length === 0) return '情報は得られなかった';
      return `判明した敵の行動: ${outcome.revealedActions.map((a) => a.actionName).join(' → ')}`;
  }
}

function submittedAnswerText(
  question: QuestionDefinition,
  answer: QuestionAnswer | undefined,
  legacySelectedIndex: number | null,
): string {
  if (!answer) {
    return question.format === 'multiple_choice' && legacySelectedIndex != null
      ? (question.choices[legacySelectedIndex] ?? '—')
      : 'わからない';
  }

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

/** 解説画面 (spec §12.8). */
export function ExplanationView({ outcome, onAdvance }: ExplanationViewProps) {
  const [advanced, setAdvanced] = useState(false);
  const [showVerdict, setShowVerdict] = useState(outcome.command !== 'attack');
  const { question } = outcome;

  useEffect(() => {
    if (outcome.command !== 'attack') return;
    const timer = window.setTimeout(() => setShowVerdict(true), 480);
    return () => window.clearTimeout(timer);
  }, [outcome]);

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true);
    onAdvance();
  }

  return (
    <div className={`explanation-view explanation-view--${outcome.command}`}>
      <div className="explanation-view__meta">
        {question.subject} / {'★'.repeat(question.star)} / {question.field} / {question.unit}
      </div>
      <p className="explanation-view__text">{question.text}</p>
      {question.format === 'multiple_choice' && (
        <ul className="explanation-view__choices">
          {question.choices.map((choice, index) => <li key={index}>{choice}</li>)}
        </ul>
      )}
      <p>あなたの回答: {submittedAnswerText(question, outcome.submittedAnswer, outcome.selectedAnswerIndex)}</p>
      <p>正答: {correctAnswerText(question)}</p>
      <div className={`explanation-view__command-badge explanation-view__command-badge--${outcome.command}`}>
        {outcome.command === 'attack' ? 'ATTACK' : outcome.command === 'guard' ? 'GUARD' : outcome.command === 'charge' ? 'CHARGE' : 'SEARCH'}
      </div>
      <p className={`explanation-view__result-detail explanation-view__result-detail--${outcome.correct ? 'success' : 'miss'}`}>
        {getResultDetailText(outcome)}
      </p>
      {showVerdict && (
        <>
          <p className="explanation-view__verdict">{outcome.correct ? '正解！' : '不正解'}</p>
          <p className="explanation-view__explanation">{question.explanation}</p>
          <button type="button" disabled={advanced} onClick={handleAdvance}>次へ</button>
        </>
      )}
    </div>
  );
}
