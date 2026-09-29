import type { PlannedEnemyAction } from '../../engine/battle/BattleEngine.types';

interface SearchTurnInfo {
  enemyName: string;
  actions: PlannedEnemyAction[];
}

export interface TurnOrderActor {
  id: string;
  name: string;
  artPath?: string;
}

interface TurnOrderViewProps {
  currentActor: TurnOrderActor;
  upcomingActors: TurnOrderActor[];
  searchInfo?: SearchTurnInfo[];
  actorNameById?: Record<string, string>;
}

function ActorIcon({ actor, current = false }: { actor: TurnOrderActor; current?: boolean }) {
  return (
    <span className={`turn-order-view__actor-icon${current ? ' turn-order-view__actor-icon--current' : ''}`} title={actor.name} aria-label={actor.name}>
      {actor.artPath ? <img src={actor.artPath} alt="" /> : <span>{actor.name.slice(0, 1)}</span>}
    </span>
  );
}

/** Shows public turn order as actor icons; Search-revealed action text remains attached below it. */
export function TurnOrderView({ currentActor, upcomingActors, searchInfo = [], actorNameById = {} }: TurnOrderViewProps) {
  return (
    <div className="turn-order-view">
      <span className="turn-order-view__icon-row">
        <span className="turn-order-view__label">現在</span>
        <ActorIcon actor={currentActor} current />
        {upcomingActors.length > 0 && (
          <>
            <span className="turn-order-view__arrow">›</span>
            {upcomingActors.map((actor, index) => (
              <span className="turn-order-view__next-entry" key={`${actor.id}-${index}`}>
                <ActorIcon actor={actor} />
                {index < upcomingActors.length - 1 && <span className="turn-order-view__arrow">›</span>}
              </span>
            ))}
          </>
        )}
      </span>
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
