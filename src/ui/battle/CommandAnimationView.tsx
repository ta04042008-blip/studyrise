import { useState } from 'react';
import type { AttackOutcome } from '../../engine/battle/BattleEngine.types';

interface CommandAnimationViewProps {
  outcome: AttackOutcome;
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
 * It DOES vary by the attack's own outcome (hit / critical / miss) — that
 * is command-specific presentation, not a 正誤 verdict, and spec §5.5
 * requires a dedicated animation for a failed command too. MVP-1 has no
 * real animation art yet, so each case is just distinct placeholder text.
 */
export function CommandAnimationView({ outcome, onAdvance }: CommandAnimationViewProps) {
  const [advanced, setAdvanced] = useState(false);

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true); // idempotency guard (CLAUDE.md §13)
    onAdvance();
  }

  return (
    <div className="command-animation-view">
      {!outcome.correct && <p>こうげきは外れた……</p>}
      {outcome.correct && outcome.isCritical && <p>会心の一撃！ こうげきが炸裂した！</p>}
      {outcome.correct && !outcome.isCritical && <p>こうげきが命中した！</p>}
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        次へ
      </button>
    </div>
  );
}
