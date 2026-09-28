interface InventoryPlaceholderScreenProps {
  onBack: () => void;
}

/**
 * 持ち物 (spec v0.6 §10.6) — MVP-6 has no permanent Inventory yet (user's
 * explicit instruction: purchase/sale/persistent stock are MVP-7). The
 * temporary departure item picker lives in 出撃準備 instead.
 */
export function InventoryPlaceholderScreen({ onBack }: InventoryPlaceholderScreenProps) {
  return (
    <div className="inventory-placeholder-screen">
      <h1>持ち物</h1>
      <p>永久所持品（持ち物）システムはMVP-7で実装予定です。出撃時の持ち込みアイテムは出撃準備でご確認いただけます。</p>
      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}
