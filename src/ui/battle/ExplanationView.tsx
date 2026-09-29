import { useEffect, useState } from 'react';
import type { QuestionCommandOutcome } from '../../engine/battle/BattleEngine.types';

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
      <p className={`explanation-view__result-detail explanation-view__result-detail--${outcome.correct ? 'success' : 'miss'}`}>{getResultDetailText(outcome)}</p>
      {showVerdict && (
        <>
          <p className="explanation-view__verdict">{outcome.correct ? '正解！' : '不正解'}</p>
          <p className="explanation-view__explanation">{question.explanation}</p>
          <button type="button" disabled={advanced} onClick={handleAdvance}>
            次へ
          </button>
        </>
      )}
    </div>
  );
}
