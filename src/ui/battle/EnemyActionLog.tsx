import type { EnemyActionResult } from '../../engine/battle/BattleEngine.types';

interface EnemyActionLogProps {
  log: EnemyActionResult[];
}

/** Shows the enemy attack(s) resolved just before the player's current turn. */
export function EnemyActionLog({ log }: EnemyActionLogProps) {
  if (log.length === 0) return null;

  return (
    <div className="enemy-action-log">
      {log.map((entry, i) => (
        <p key={i}>
          敵の攻撃！ {entry.damage} ダメージ{entry.isCritical ? '（会心の一撃！）' : ''}
        </p>
      ))}
    </div>
  );
}
