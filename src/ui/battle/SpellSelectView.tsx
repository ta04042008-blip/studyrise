import type { KnownSpell } from '../../engine/battle/BattleEngine.types';

interface SpellSelectViewProps {
  knownSpells: KnownSpell[];
  playerMp: number;
  onSelect: (spellId: string) => void;
  onCancel: () => void;
}

/**
 * Shown only when the current actor knows more than one spell (spec §4.5 —
 * up to 3 via roguelite NEW_SPELL rewards). Purely a UI-side "which spell"
 * step: the battle stays in COMMAND_SELECT the whole time, and selecting
 * simply calls useSpell(spellId) the same way the single-spell case always
 * has (CLAUDE.md §9 — no calculation happens here).
 */
export function SpellSelectView({ knownSpells, playerMp, onSelect, onCancel }: SpellSelectViewProps) {
  return (
    <div className="spell-select-view">
      {knownSpells.map((spell) => (
        <button
          key={spell.spellId}
          type="button"
          disabled={playerMp < spell.mpCost}
          onClick={() => onSelect(spell.spellId)}
        >
          {spell.name}（Lv{spell.level} / MP{spell.mpCost}）
        </button>
      ))}
      <button type="button" onClick={onCancel}>
        戻る
      </button>
    </div>
  );
}
