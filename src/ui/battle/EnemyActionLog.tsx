import type { EnemyActionResult } from '../../engine/battle/BattleEngine.types';

interface EnemyActionLogProps {
  log: EnemyActionResult[];
  actorNameById: Record<string, string>;
}

/** Shows the enemy attack(s) resolved just before the current player's turn. */
export function EnemyActionLog({ log, actorNameById }: EnemyActionLogProps) {
  if (log.length === 0) return null;

  return (
    <div className="enemy-action-log">
      {log.map((entry, i) => (
        <p key={i}>
          {actorNameById[entry.sourceActorId] ?? entry.sourceActorId} の攻撃！
          {actorNameById[entry.targetId] ?? entry.targetId} に {entry.damage} ダメージ
          {entry.isCritical ? '（会心の一撃！）' : ''}
        </p>
      ))}
    </div>
  );
}
