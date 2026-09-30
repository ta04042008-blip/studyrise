import type { KnownSpell, SpellDefinition, SpellLevelBonus } from '../../engine/battle/BattleEngine.types';

interface SpellSelectViewProps {
  knownSpells: KnownSpell[];
  getSpellDefinition: (spellId: string) => SpellDefinition | undefined;
  onSelect: (spellId: string) => void;
  onCancel: () => void;
}

function levelBonusText(bonus: SpellLevelBonus | undefined): string {
  if (!bonus || bonus.type === 'NONE') return '追加効果なし';
  switch (bonus.type) {
    case 'BREAK_GUARD':
      return '敵のガードを解除';
    case 'EXECUTE':
      return `敵HPが${Math.round(bonus.hpThreshold * 100)}%以下ならダメージ×${bonus.damageMultiplier}`;
    case 'SEARCH_TARGETS':
      return `行動解析の対象: ${bonus.count}体`;
    case 'REFLECT_GUARD':
      return `回復後に${Math.round(bonus.mitigationPercent * 100)}%ガードを付与`;
  }
}

function legacyEffectFallback(definition: SpellDefinition | undefined, level: number): string {
  if (!definition) return '効果情報なし';
  const levelData = definition.levels[Math.max(0, Math.min(level, definition.levels.length) - 1)];
  if (!levelData || levelData.effects.length === 0) return '正答数に応じて効果が変化';
  return levelData.effects.map((effect) => {
    switch (effect.type) {
      case 'DAMAGE':
        return `${effect.amount}ダメージ`;
      case 'HEAL':
        return `HPを${effect.amount}回復`;
      case 'MP_GAIN':
        return `MP+${effect.amount}`;
      case 'GUARD':
        return `ガード${Math.round(effect.mitigationPercent * 100)}%`;
    }
  }).join(' / ');
}

/**
 * Spell choice is always shown before casting — even with exactly one known
 * spell — so the player can inspect the current level and effect first.
 * Pure presentation: selecting still delegates the stable spellId to
 * BattleEngine through the controller.
 */
export function SpellSelectView({ knownSpells, getSpellDefinition, onSelect, onCancel }: SpellSelectViewProps) {
  return (
    <div className="spell-select-view">
      <div className="spell-select-view__header">
        <strong>スペルを選択</strong>
        <span>効果を確認して発動準備を開始します</span>
      </div>

      <div className="spell-select-view__list">
        {knownSpells.map((spell) => {
          const definition = getSpellDefinition(spell.spellId);
          const bonus = definition?.levelBonuses?.[Math.max(0, Math.min(spell.level, definition.maxLevel) - 1)];
          const stars = definition?.questionStars?.map((star) => `★${star}`).join(' → ');

          return (
            <button
              className="spell-select-view__spell"
              key={spell.spellId}
              type="button"
              onClick={() => onSelect(spell.spellId)}
            >
              <span className="spell-select-view__spell-title">
                <strong>{spell.name}</strong>
                <span>Lv{spell.level}</span>
              </span>
              <span className="spell-select-view__effect">
                {definition?.effectDescription ?? legacyEffectFallback(definition, spell.level)}
              </span>
              {bonus && <span className="spell-select-view__bonus">現在Lv効果: {levelBonusText(bonus)}</span>}
              {stars && <span className="spell-select-view__stars">5問構成: {stars}</span>}
            </button>
          );
        })}
      </div>

      <button className="spell-select-view__cancel" type="button" onClick={onCancel}>
        戻る
      </button>
    </div>
  );
}
