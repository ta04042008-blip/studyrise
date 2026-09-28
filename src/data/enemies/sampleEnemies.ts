import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleEnemy } from './sampleEnemy';

/**
 * MVP-10 official content — 「ウォッチャー」(Stage1 Zone2「監視交差点」×1 /
 * Stage3《記録塔》Zone1「保存書庫」×1、v0.2 §23/§27)。ID kept as
 * `enemy_goblin_placeholder` for Save V1 compatibility. Observation-role
 * enemy: lower attack, slightly bulkier/slower than ランナー.
 */
export const sampleEnemy2: EnemyDefinition = {
  id: 'enemy_goblin_placeholder',
  name: 'ウォッチャー',
  baseStats: {
    attack: 6,
    defense: 5,
    speed: 9,
    maxHp: 28,
  },
};

/** Two-enemy formation, in fixed order. */
export const sampleEnemyZone: EnemyDefinition[] = [sampleEnemy, sampleEnemy2];
