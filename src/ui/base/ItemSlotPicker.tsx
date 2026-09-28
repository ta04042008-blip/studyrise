import type { BattleItemSlotSelection, DepartureItemCatalogEntry } from '../../base/base.types';

interface ItemSlotPickerProps {
  catalog: DepartureItemCatalogEntry[];
  slots: BattleItemSlotSelection;
  onChange: (slots: BattleItemSlotSelection) => void;
}

const EMPTY_VALUE = '';

/**
 * 持ち込みアイテム 3枠 (spec §5.10). Each slot may be empty (spec allows
 * unused slots). This is a temporary per-Stage-attempt loadout picker, not
 * a permanent Inventory (user's explicit MVP-6 instruction) — the catalog
 * passed in has no persisted stock/quantity concept.
 */
export function ItemSlotPicker({ catalog, slots, onChange }: ItemSlotPickerProps) {
  function handleSlotChange(index: number, itemId: string) {
    const next: BattleItemSlotSelection = [...slots];
    next[index] = itemId === EMPTY_VALUE ? null : itemId;
    onChange(next);
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
              <option key={entry.item.id} value={entry.item.id}>
                {entry.item.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
