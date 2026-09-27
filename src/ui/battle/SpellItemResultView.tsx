import { useState } from 'react';
import type { Effect } from '../../engine/battle/effects';
import type { ItemOutcome, SpellOutcome } from '../../engine/battle/BattleEngine.types';

interface SpellItemResultViewProps {
  outcome: SpellOutcome | ItemOutcome;
  onAdvance: () => void;
}

function describeEffect(effect: Effect): string {
  switch (effect.type) {
    case 'DAMAGE':
      return `${effect.amount} ダメージを与えた`;
    case 'HEAL':
      return `HPが${effect.amount}回復した`;
    case 'MP_GAIN':
      return `MP+${effect.amount}`;
    case 'GUARD':
      return `ガードを付与した（軽減${Math.round(effect.mitigationPercent * 100)}%）`;
  }
}

/**
 * RESULT_APPLY resting screen for Spell/Item (spec §5.3's short
 * コマンド→対象/選択→条件確認→即時処理 flow). No question was asked, so
 * there is no 正誤 to show and no EXPLANATION step — this is the terminal
 * display before the next action.
 */
export function SpellItemResultView({ outcome, onAdvance }: SpellItemResultViewProps) {
  const [advanced, setAdvanced] = useState(false);

  function handleAdvance() {
    if (advanced) return;
    setAdvanced(true); // idempotency guard (CLAUDE.md §13)
    onAdvance();
  }

  return (
    <div className="spell-item-result-view">
      <p>{outcome.command === 'spell' ? '呪文を唱えた！' : 'アイテムを使った！'}</p>
      {outcome.effects.map((effect, i) => (
        <p key={i}>{describeEffect(effect)}</p>
      ))}
      <button type="button" disabled={advanced} onClick={handleAdvance}>
        次へ
      </button>
    </div>
  );
}
