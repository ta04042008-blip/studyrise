import { useState } from 'react';
import type { AttackOutcome } from '../../engine/battle/BattleEngine.types';

interface ExplanationViewProps {
  outcome: AttackOutcome;
  onAdvance: () => void;
}

/** 解説画面 (spec §12.8). */
export function ExplanationView({ outcome, onAdvance }: ExplanationViewProps) {
  const [advanced, setAdvanced] = useState(false);
  const { question } = outcome;

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true); // idempotency guard (CLAUDE.md §13)
    onAdvance();
  }

  const choiceText = (index: number | null) =>
    question.format === 'multiple_choice' && index != null ? question.choices[index] : 'わからない';

  return (
    <div className="explanation-view">
      <div className="explanation-view__meta">
        {question.subject} / {'★'.repeat(question.star)} / {question.field} / {question.unit}
      </div>
      <p className="explanation-view__text">{question.text}</p>
      <p>あなたの回答: {choiceText(outcome.selectedAnswerIndex)}</p>
      {question.format === 'multiple_choice' && <p>正答: {question.choices[question.correctIndex]}</p>}
      <p>
        {outcome.correct ? '正解！' : '不正解'}
        {outcome.isCritical ? '（会心の一撃！）' : ''}
      </p>
      <p className="explanation-view__explanation">{question.explanation}</p>
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        次へ
      </button>
    </div>
  );
}
