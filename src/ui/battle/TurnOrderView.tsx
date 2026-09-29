import type { PlannedEnemyAction } from '../../engine/battle/BattleEngine.types';

interface SearchTurnInfo {
  enemyName: string;
  actions: PlannedEnemyAction[];
}

interface TurnOrderViewProps {
  currentActorName: string;
  /** Names only, in order — never the raw gauge value (spec §5.2 requirement 4). */
  upcomingActorNames: string[];
  /** Search-revealed enemy plans, shown beside the turn order while revelation remains active. */
  searchInfo?: SearchTurnInfo[];
  actorNameById?: Record<string, string>;
}

/** Shows only public turn order plus Search-revealed action names/targets — never internal gauge/power values. */
export function TurnOrderView({ currentActorName, upcomingActorNames, searchInfo = [], actorNameById = {} }: TurnOrderViewProps) {
  return (
    <div className="turn-order-view">
      <span className="turn-order-view__current">現在: {currentActorName}</span>
      {upcomingActorNames.length > 0 && (
        <span className="turn-order-view__upcoming">次: {upcomingActorNames.join(' → ')}</span>
      )}
      {searchInfo.length > 0 && (
        <span className="turn-order-view__search">
          サーチ: {searchInfo.map(({ enemyName, actions }) =>
            `${enemyName}［${actions.map((action) => `${action.actionName}→${actorNameById[action.targetId] ?? action.targetId}`).join(' / ')}］`
          ).join(' ｜ ')}
        </span>
      )}
    </div>
  );
}
