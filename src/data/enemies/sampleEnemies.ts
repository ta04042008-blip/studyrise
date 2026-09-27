import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleEnemy } from './sampleEnemy';

/**
 * PLACEHOLDER content — a multi-enemy zone (spec §2.1) for exercising
 * MVP-3's target-selection and multi-enemy timeline behavior. Not final
 * game content (CLAUDE.md §24).
 */
export const sampleEnemy2: EnemyDefinition = {
  id: 'enemy_goblin_placeholder',
  name: 'ゴブリン', // PLACEHOLDER
  baseStats: {
    attack: 8,
    defense: 3,
    speed: 14,
    maxHp: 25,
  },
};

/** Two-enemy formation, in fixed order. */
export const sampleEnemyZone: EnemyDefinition[] = [sampleEnemy, sampleEnemy2];
