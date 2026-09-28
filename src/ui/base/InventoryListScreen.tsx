import type { PermanentState } from '../../engine/progression/ProgressionSystem.types';
import type { DepartureItemCatalogEntry } from '../../base/base.types';
import { CURRENCY_LABEL, RARE_UNLOCK_RESOURCE_LABEL, UPGRADE_MATERIAL_ID, UPGRADE_MATERIAL_LABEL } from '../../config/progressionConfig';

interface InventoryListScreenProps {
  permanentState: PermanentState;
  /** Used only to resolve a consumable itemDefinitionId to its display name (CLAUDE.md §15 — ids are never shown directly). */
  itemCatalog: DepartureItemCatalogEntry[];
  onBack: () => void;
}

/**
 * 持ち物 (spec §3.7/§10.6/§15, MVP-7 decision doc §15): 消費アイテムと所持数
 * ／基本通貨／強化素材／解放結晶を表示。装備の管理は「装備」画面の責務なので
 * ここでは重複表示しない（decision doc §15 明示）。Presentation only
 * (CLAUDE.md §9).
 */
export function InventoryListScreen({ permanentState, itemCatalog, onBack }: InventoryListScreenProps) {
  const itemNameById = Object.fromEntries(itemCatalog.map((entry) => [entry.item.id, entry.item.name]));
  const consumableEntries = Object.entries(permanentState.inventory.consumables).filter(([, quantity]) => quantity > 0);

  return (
    <div className="inventory-list-screen">
      <h1>持ち物</h1>

      <section>
        <h2>通貨・素材</h2>
        <dl>
          <dt>{CURRENCY_LABEL}</dt>
          <dd>{permanentState.currency}</dd>
          <dt>{UPGRADE_MATERIAL_LABEL}</dt>
          <dd>{permanentState.materials[UPGRADE_MATERIAL_ID] ?? 0}</dd>
          <dt>{RARE_UNLOCK_RESOURCE_LABEL}</dt>
          <dd>{permanentState.rareUnlockResource}</dd>
        </dl>
      </section>

      <section>
        <h2>消費アイテム</h2>
        {consumableEntries.length === 0 ? (
          <p>所持している消費アイテムはありません。</p>
        ) : (
          <ul>
            {consumableEntries.map(([itemId, quantity]) => (
              <li key={itemId}>
                {itemNameById[itemId] ?? itemId} × {quantity}
              </li>
            ))}
          </ul>
        )}
      </section>

      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}
