interface TurnOrderViewProps {
  currentActorName: string;
  /** Names only, in order — never the raw gauge value (spec §5.2 requirement 4). */
  upcomingActorNames: string[];
}

/** Shows only "現在行動者＋今後の行動順" (spec §5.2 requirement 5) — never the internal action gauge. */
export function TurnOrderView({ currentActorName, upcomingActorNames }: TurnOrderViewProps) {
  return (
    <div className="turn-order-view">
      <span className="turn-order-view__current">現在: {currentActorName}</span>
      {upcomingActorNames.length > 0 && (
        <span className="turn-order-view__upcoming">次: {upcomingActorNames.join(' → ')}</span>
      )}
    </div>
  );
}
