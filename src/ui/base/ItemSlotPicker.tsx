import type { BattleItemSlotSelection, DepartureItemCatalogEntry } from '../../base/base.types';

interface ItemSlotPickerProps {
  catalog: DepartureItemCatalogEntry[];
  slots: BattleItemSlotSelection;
  onChange: (slots: BattleItemSlotSelection) => void;
  /**
   * Owned quantity per itemDefinitionId (spec §14, MVP-7 decision doc §14):
   * the persistent Inventory quantity this departure's slot selections may
   * not exceed in total. Optional so any test/harness that predates MVP-7's
   * permanent Inventory (no quantity concept) keeps working unchanged —
   * omitting it disables the quantity cap entirely (every option stays
   * selectable), matching pre-MVP-7 behavior byte-for-byte.
   */
  ownedQuantityById?: Record<string, number>;
}

const EMPTY_VALUE = '';

/**
 * 持ち込みアイテム 3枠 (spec §5.10). Each slot may be empty (spec allows
 * unused slots). The same item id may occupy more than one slot (spec §14:
 * "同じitemを複数枠へ入れることは可能"), but the total selected across all
 * slots may never exceed `ownedQuantityById` (persistent Inventory stock) —
 * an option that would push a slot over that limit is disabled rather than
 * silently allowed, so `departureValidation`'s matching check is never the
 * only thing standing between the player and an invalid selection.
 */
export function ItemSlotPicker({ catalog, slots, onChange, ownedQuantityById }: ItemSlotPickerProps) {
  function handleSlotChange(index: number, itemId: string) {
    const next: BattleItemSlotSelection = [...slots];
    next[index] = itemId === EMPTY_VALUE ? null : itemId;
    onChange(next);
  }

  function isOptionDisabled(slotIndex: number, itemId: string): boolean {
    if (!ownedQuantityById) return false;
    const owned = ownedQuantityById[itemId] ?? 0;
    const selectedInOtherSlots = slots.filter((s, i) => i !== slotIndex && s === itemId).length;
    return selectedInOtherSlots >= owned;
  }

  return (
    <div className="item-slot-picker">
      {slots.map((slotItemId, index) => (
        <div key={index} className="item-slot-picker__slot">
          <label htmlFor={`item-slot-${index}`}>持ち込みアイテム{index + 1}</label>
          <select
            id={`item-slot-${index}`}
            value={slotItemId ?? EMPTY_VALUE}
            onChange={(e) => handleSlotChange(index, e.target.value)}
          >
            <option value={EMPTY_VALUE}>（空）</option>
            {catalog.map((entry) => (
              <option key={entry.item.id} value={entry.item.id} disabled={isOptionDisabled(index, entry.item.id)}>
                {entry.item.name}
                {ownedQuantityById ? `（所持${ownedQuantityById[entry.item.id] ?? 0}）` : ''}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
