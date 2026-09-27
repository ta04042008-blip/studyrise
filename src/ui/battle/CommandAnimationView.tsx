import { useState } from 'react';
import type { AttackOutcome } from '../../engine/battle/BattleEngine.types';

interface CommandAnimationViewProps {
  outcome: AttackOutcome;
  onAdvance: () => void;
}

/**
 * COMMAND_ANIMATION hook (spec §5.3「コマンド演出」/ §5.5 失敗時も専用演出).
 * MVP-1 keeps this a static success/fail beat rather than a timed
 * animation; enemy HP has not been changed yet at this point (RESULT_APPLY
 * happens on advance()).
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
      {outcome.correct ? (
        <p>こうげき せいこう！{outcome.isCritical ? '（会心の一撃！）' : ''}</p>
      ) : (
        <p>こうげき しっぱい……</p>
      )}
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        次へ
      </button>
    </div>
  );
}
