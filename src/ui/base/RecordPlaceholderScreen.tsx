interface RecordPlaceholderScreenProps {
  onBack: () => void;
}

/** 記録 (spec v0.6 §13) — MVP-6 is navigation only;学習履歴 itself is MVP-8 (user's explicit instruction). */
export function RecordPlaceholderScreen({ onBack }: RecordPlaceholderScreenProps) {
  return (
    <div className="record-placeholder-screen">
      <h1>記録</h1>
      <p>学習履歴機能は準備中です（MVP-8で実装予定）。</p>
      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}
