import type { ItemBattleSlot, KnownSpell, QuestionCommandKind } from '../../engine/battle/BattleEngine.types';

interface CommandMenuProps {
  enabled: boolean;
  knownSpells: KnownSpell[];
  items: ItemBattleSlot[];
  onSelectCommand: (command: QuestionCommandKind) => void;
  onOpenSpellSelect: () => void;
  onUseItem: (itemId: string) => void;
}

/**
 * The 5 official commands (spec §5.1), all usable from COMMAND_SELECT. With
 * Spell always opens SpellSelectView, even when exactly one spell is known,
 * so the player can inspect its effect before committing. This is a UI-only
 * choice step, never a new BattleEngine phase (CLAUDE.md §9). Each item is
 * disabled once its battle-local uses run out.
 */
export function CommandMenu({
  enabled,
  knownSpells,
  items,
  onSelectCommand,
  onOpenSpellSelect,
  onUseItem,
}: CommandMenuProps) {
  return (
    <div className="command-menu">
      <button className="command-menu__button command-menu__button--attack" type="button" disabled={!enabled} onClick={() => onSelectCommand('attack')}>
        アタック
      </button>
      <button className="command-menu__button" type="button" disabled={!enabled} onClick={() => onSelectCommand('guard')}>
        ガード
      </button>
      <button className="command-menu__button" type="button" disabled={!enabled} onClick={() => onSelectCommand('search')}>
        サーチ
      </button>
      <button
        className="command-menu__button"
        type="button"
        disabled={!enabled || knownSpells.length === 0}
        onClick={onOpenSpellSelect}
      >
        スペル
      </button>
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
