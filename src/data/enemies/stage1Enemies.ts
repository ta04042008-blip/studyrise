import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — Stage1《閉ざされた連絡路》Zone3「封鎖ゲート前」
 * (ストーリー・世界観仕様書v0.2 §23)。New stable IDs (no prior placeholder
 * to preserve — MVP-10 new content). Stats designed against the party's
 * flat Lv1 baseStats — permanent leveling only applies once at Stage-end
 * (spec §10.17), so all of Stage1 (including its Zone4 boss) is fought at
 * Lv1.
 */
export const enemyClamp: EnemyDefinition = {
  id: 'enemy_clamp',
  name: 'クランプ',
  baseStats: {
    attack: 10,
    defense: 10,
    speed: 6,
    maxHp: 45,
  },
};

/**
 * リレー — recurring support-role enemy, also placed in Stage2 Zone2 and
 * Stage3 Zone2 (v0.2 §25/§27). One shared EnemyDefinition, referenced by
 * enemyDefinitionId from each Zone that uses it — it is intentionally
 * easier relative to whichever Stage's (higher-level) party re-encounters
 * it, same as any recurring low-tier enemy.
 */
export const enemyRelay: EnemyDefinition = {
  id: 'enemy_relay',
  name: 'リレー',
  baseStats: {
    attack: 9,
    defense: 7,
    speed: 11,
    maxHp: 32,
  },
};

/**
 * センチネル — the Area's first 強敵 (strong enemy), also reused in Stage2
 * Zone3 (v0.2 §23/§25). Clearly tougher than any Stage1 ordinary enemy,
 * clearly short of JANUS.
 */
export const enemySentinel: EnemyDefinition = {
  id: 'enemy_sentinel',
  name: 'センチネル',
  baseStats: {
    attack: 12,
    defense: 10,
    speed: 9,
    maxHp: 60,
  },
};
