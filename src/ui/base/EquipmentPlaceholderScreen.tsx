interface EquipmentPlaceholderScreenProps {
  onBack: () => void;
}

/** 装備 (spec v0.6 §10.2) — MVP-6 is a placeholder only; the full system is MVP-7 (user's explicit instruction). */
export function EquipmentPlaceholderScreen({ onBack }: EquipmentPlaceholderScreenProps) {
  return (
    <div className="equipment-placeholder-screen">
      <h1>装備</h1>
      <p>装備システムはMVP-7で実装予定です。</p>
      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}
