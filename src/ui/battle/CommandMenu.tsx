import type { ItemBattleSlot, QuestionCommandKind, SpellDefinition } from '../../engine/battle/BattleEngine.types';

interface CommandMenuProps {
  enabled: boolean;
  spell: SpellDefinition | null;
  playerMp: number;
  items: ItemBattleSlot[];
  onSelectCommand: (command: QuestionCommandKind) => void;
  onUseSpell: () => void;
  onUseItem: (itemId: string) => void;
}

/**
 * The 6 official commands (spec §5.1), all usable from COMMAND_SELECT.
 * Spell is disabled when MP is insufficient for the character's one known
 * spell; each item is disabled once its battle-local uses run out.
 */
export function CommandMenu({ enabled, spell, playerMp, items, onSelectCommand, onUseSpell, onUseItem }: CommandMenuProps) {
  return (
    <div className="command-menu">
      <button type="button" disabled={!enabled} onClick={() => onSelectCommand('attack')}>
        アタック
      </button>
      <button type="button" disabled={!enabled} onClick={() => onSelectCommand('guard')}>
        ガード
      </button>
      <button type="button" disabled={!enabled} onClick={() => onSelectCommand('charge')}>
        チャージ
      </button>
      <button type="button" disabled={!enabled} onClick={() => onSelectCommand('search')}>
        サーチ
      </button>
      <button type="button" disabled={!enabled || !spell || playerMp < spell.mpCost} onClick={onUseSpell}>
        スペル{spell ? `（MP${spell.mpCost}）` : ''}
      </button>
      {items.map((slot) => (
        <button
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
