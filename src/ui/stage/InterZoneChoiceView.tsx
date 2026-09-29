interface InterZoneChoiceViewProps {
  onContinue: () => void;
  onSelfReturn: () => void;
}

/**
 * Presentation only (CLAUDE.md §9): the only place self-return can be
 * triggered from (spec §2.5 — Zone間のみ). Rendered exclusively while
 * StageEngine's phase is INTER_ZONE_CHOICE, so this control simply does not
 * exist during battle.
 */
export function InterZoneChoiceView({ onContinue, onSelfReturn }: InterZoneChoiceViewProps) {
  return (
    <div className="inter-zone-choice-view">
      <div className="inter-zone-choice-view__eyebrow">ZONE COMPLETE</div>
      <h2>次の行動を選択</h2>
      <p>次のゾーンへ進みますか？ それともここで帰還しますか？</p>
      <div className="inter-zone-choice-view__actions">
        <button type="button" onClick={onContinue}>
          次のゾーンへ
        </button>
        <button type="button" onClick={onSelfReturn}>
          帰還する（自主帰還）
        </button>
      </div>
    </div>
  );
}
