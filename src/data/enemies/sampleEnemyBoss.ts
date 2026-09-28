import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — a minimal Stage boss (spec §2.1) for exercising
 * MVP-5's Final Zone / boss-defeat → Stage Clear flow. Not final game
 * content (CLAUDE.md §24). Boss AI is still just the existing fixed-Attack
 * enemy behavior (spec MVP-5 scope: no phases, no telegraphed ultimates yet).
 */
export const sampleEnemyBoss: EnemyDefinition = {
  id: 'enemy_boss_ogre_placeholder',
  name: 'ボス・オーガ', // PLACEHOLDER
  isBoss: true,
  baseStats: {
    attack: 16,
    defense: 8,
    speed: 10,
    maxHp: 120,
  },
};
