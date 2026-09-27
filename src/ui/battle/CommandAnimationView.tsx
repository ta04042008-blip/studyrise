import { useState } from 'react';
import type { AttackOutcome } from '../../engine/battle/BattleEngine.types';

interface CommandAnimationViewProps {
  outcome: AttackOutcome;
  onAdvance: () => void;
}

/**
 * COMMAND_ANIMATION hook (spec §5.3「コマンド演出」). This step must not
 * reveal 正誤 — that is only shown after RESULT_APPLY, per the required
 * order COMMAND_ANIMATION → RESULT_APPLY → 正誤表示 → EXPLANATION → 次へ.
 * MVP-1 has no real animation art yet, so this is a neutral placeholder
 * beat, identical for a correct or incorrect answer; a future MVP can
 * swap in a genuinely distinct hit/miss animation asset (spec §5.5) as
 * long as it still stops short of stating 正解/不正解 in text.
 * `outcome` is accepted (not just a bare callback) so a later animation
 * can react to it without changing this component's call site.
 */
export function CommandAnimationView({ onAdvance }: CommandAnimationViewProps) {
  const [advanced, setAdvanced] = useState(false);

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true); // idempotency guard (CLAUDE.md §13)
    onAdvance();
  }

  return (
    <div className="command-animation-view">
      <p>こうげき！</p>
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        次へ
      </button>
    </div>
  );
}
