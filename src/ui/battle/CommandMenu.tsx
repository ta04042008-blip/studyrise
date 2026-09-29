import type { ItemBattleSlot, KnownSpell, QuestionCommandKind } from '../../engine/battle/BattleEngine.types';

interface CommandMenuProps {
  enabled: boolean;
  knownSpells: KnownSpell[];
  playerMp: number;
  items: ItemBattleSlot[];
  onSelectCommand: (command: QuestionCommandKind) => void;
  onUseSpell: (spellId: string) => void;
  onOpenSpellSelect: () => void;
  onUseItem: (itemId: string) => void;
}

/**
 * The 6 official commands (spec §5.1), all usable from COMMAND_SELECT. With
 * exactly one known spell (MVP-1〜3's only case) the Spell button uses it
 * directly, same as before; with more than one (spec §4.5, up to 3 via
 * roguelite NEW_SPELL rewards) it instead opens SpellSelectView — this is a
 * UI-only branch, never a new BattleEngine phase (CLAUDE.md §9). Each item
 * is disabled once its battle-local uses run out.
 */
export function CommandMenu({
  enabled,
  knownSpells,
  playerMp,
  items,
  onSelectCommand,
  onUseSpell,
  onOpenSpellSelect,
  onUseItem,
}: CommandMenuProps) {
  const onlySpell = knownSpells.length === 1 ? knownSpells[0] : null;

  return (
    <div className="command-menu">
      <button className="command-menu__button command-menu__button--attack" type="button" disabled={!enabled} onClick={() => onSelectCommand('attack')}>
        アタック
      </button>
      <button className="command-menu__button" type="button" disabled={!enabled} onClick={() => onSelectCommand('guard')}>
        ガード
      </button>
      <button className="command-menu__button" type="button" disabled={!enabled} onClick={() => onSelectCommand('charge')}>
        チャージ
      </button>
      <button className="command-menu__button" type="button" disabled={!enabled} onClick={() => onSelectCommand('search')}>
        サーチ
      </button>
      {onlySpell ? (
        <button
          className="command-menu__button"
          type="button"
          disabled={!enabled || playerMp < onlySpell.mpCost}
          onClick={() => onUseSpell(onlySpell.spellId)}
        >
          スペル（MP{onlySpell.mpCost}）
        </button>
      ) : (
        <button className="command-menu__button" type="button" disabled={!enabled || knownSpells.length === 0} onClick={onOpenSpellSelect}>
          スペル
        </button>
      )}
      {items.map((slot) => (
        <button
          className="command-menu__button"
          key={slot.item.id}
          type="button"
          disabled={!enabled || slot.remainingUses <= 0}
          onClick={() => onUseItem(slot.item.id)}
        >
          {slot.item.name}（残{slot.remainingUses}）
        </button>
      ))}
    </div>
  );
}
