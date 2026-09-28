import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleEnemy } from './sampleEnemy';
import { sampleEnemy2 } from './sampleEnemies';
import { sampleEnemyBoss } from './sampleEnemyBoss';
import { enemyClamp, enemyRelay, enemySentinel } from './stage1Enemies';
import { enemyDrainer, enemyPurger, enemyShielder, enemyBossNereid } from './stage2Enemies';
import { enemyScrib, enemyAuditor, enemyBossMnemos } from './stage3Enemies';

/**
 * MVP-10 official content — the single combined enemy registry for Area 1
 * 《ハルカ》(全13種: 通常8種+強敵2種+ボス3種、spec §17.2の目安に一致)。
 * `useStageController` resolves every Stage's Zones against this one map
 * (not a per-Stage map) — StageEngine/BattleEngine never gain per-content
 * special cases, only this data map grows (CLAUDE.md §7/§18.10).
 */
export const allEnemyDefinitions: EnemyDefinition[] = [
  sampleEnemy,
  sampleEnemy2,
  sampleEnemyBoss,
  enemyClamp,
  enemyRelay,
  enemySentinel,
  enemyDrainer,
  enemyPurger,
  enemyShielder,
  enemyBossNereid,
  enemyScrib,
  enemyAuditor,
  enemyBossMnemos,
];

export const enemyDefinitionsById: Record<string, EnemyDefinition> = Object.fromEntries(
  allEnemyDefinitions.map((e) => [e.id, e]),
);
