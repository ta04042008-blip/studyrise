import type { PlannedEnemyAction } from '../../engine/battle/BattleEngine.types';

interface SearchInfoPanelProps {
  /** targetId → revealed actions, already the live derived slice from BattleEngine. */
  searchByEnemyId: Record<string, PlannedEnemyAction[]>;
  /** id → display name, to render "対象" without exposing internal ids. */
  actorNameById: Record<string, string>;
}

/**
 * Shows what Search has revealed so far: 行動名 + 対象 only (spec §5.9 —
 * no power/probability detail). Disappears once the revealed count hits 0.
 */
export function SearchInfoPanel({ searchByEnemyId, actorNameById }: SearchInfoPanelProps) {
  const entries = Object.entries(searchByEnemyId).filter(([, actions]) => actions.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="search-info-panel">
      {entries.map(([enemyId, actions]) => (
        <div key={enemyId}>
          <p className="search-info-panel__heading">
            {actorNameById[enemyId] ?? enemyId} の予定行動（残り{actions.length}件）
          </p>
          <ul>
            {actions.map((action, i) => (
              <li key={i}>
                {action.actionName} → {actorNameById[action.targetId] ?? action.targetId}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
