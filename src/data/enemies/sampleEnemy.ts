import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — a single minimal enemy for MVP-1's 1v1 battle
 * loop. Not final game content (CLAUDE.md §24).
 */
export const sampleEnemy: EnemyDefinition = {
  id: 'enemy_slime_placeholder',
  name: 'スライム', // PLACEHOLDER
  baseStats: {
    attack: 10,
    defense: 4,
    speed: 8,
    maxHp: 40,
  },
};
