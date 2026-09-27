import { useState } from 'react';
import type { QuestionCommandOutcome } from '../../engine/battle/BattleEngine.types';

interface CommandAnimationViewProps {
  outcome: QuestionCommandOutcome;
  onAdvance: () => void;
}

/**
 * COMMAND_ANIMATION hook (spec §5.3「コマンド演出」/ §5.5 失敗時も専用演出).
 *
 * This step must never show a learning-correctness verdict — no 正解 /
 * 不正解 / せいこう / しっぱい text. That verdict is only revealed after
 * RESULT_APPLY, in ExplanationView, per the required order
 * COMMAND_ANIMATION → RESULT_APPLY → 正誤表示 → EXPLANATION → 次へ.
 *
 * It DOES vary by the command's own outcome (hit/critical/miss for Attack,
 * guard stance/great-guard/opening for Guard, etc.) — that is
 * command-specific presentation, not a 正誤 verdict, and spec §5.5 requires
 * a dedicated animation for a failed command too. MVP-1/2 has no real
 * animation art yet, so each case is just distinct placeholder text.
 */
function getAnimationText(outcome: QuestionCommandOutcome): string {
  switch (outcome.command) {
    case 'attack':
      if (!outcome.correct) return 'こうげきは外れた……';
      return outcome.isCritical ? '会心の一撃！ こうげきが炸裂した！' : 'こうげきが命中した！';
    case 'guard':
      if (!outcome.applied) return 'ガードが間に合わなかった……';
      return outcome.isGreatSuccess ? '鉄壁の構え！（ガード大成功）' : 'ガードの構えを取った！';
    case 'charge':
      if (outcome.mpGained <= 0) return '集中が途切れた……';
      return outcome.isGreatSuccess ? '気合が満ちあふれた！（チャージ大成功）' : '気合を溜めた！';
    case 'search':
      return outcome.success ? '敵の様子をうかがった！' : '敵を見失った……';
  }
}

export function CommandAnimationView({ outcome, onAdvance }: CommandAnimationViewProps) {
  const [advanced, setAdvanced] = useState(false);

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true); // idempotency guard (CLAUDE.md §13)
    onAdvance();
  }

  return (
    <div className="command-animation-view">
      <p>{getAnimationText(outcome)}</p>
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        次へ
      </button>
    </div>
  );
}
