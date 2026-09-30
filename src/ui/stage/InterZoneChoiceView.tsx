interface InterZoneChoiceViewProps {
  onContinue: () => void;
  onSelfReturn: () => void;
  /** True after clearing Zone 10. Continuing wraps to Zone 1 of a stronger lap. */
  isLapBoundary?: boolean;
  /** 1-based lap number that will start if the player continues. */
  nextLapNumber?: number;
}

/**
 * Presentation only (CLAUDE.md §9): the only place self-return can be
 * triggered from. Zone 10 is a lap boundary; continuing starts the same
 * Stage at Zone 1 with stronger enemies while preserving the current run.
 */
export function InterZoneChoiceView({
  onContinue,
  onSelfReturn,
  isLapBoundary = false,
  nextLapNumber = 1,
}: InterZoneChoiceViewProps) {
  return (
    <div className="inter-zone-choice-view">
      <div className="inter-zone-choice-view__eyebrow">
        {isLapBoundary ? 'LAP COMPLETE' : 'ZONE COMPLETE'}
      </div>
      <h2>{isLapBoundary ? `${nextLapNumber - 1}周目を踏破` : '次の行動を選択'}</h2>
      <p>
        {isLapBoundary
          ? `次は${nextLapNumber}周目です。Zone 1へ戻り、敵は周回ごとに加速して強化されます。続けますか？`
          : '次のゾーンへ進みますか？ それともここで帰還しますか？'}
      </p>
      <div className="inter-zone-choice-view__actions">
        <button type="button" onClick={onContinue}>
          {isLapBoundary ? `${nextLapNumber}周目へ` : '次のゾーンへ'}
        </button>
        <button type="button" onClick={onSelfReturn}>
          {isLapBoundary ? 'クリアして拠点へ帰還' : '帰還する（自主帰還）'}
        </button>
      </div>
    </div>
  );
}
