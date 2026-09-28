import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — Stage3《記録塔》の敵 (ストーリー・世界観仕様書
 * v0.2 §27)。New stable IDs (MVP-10 new content). Stats designed against
 * the party's Lv4 baseStats (cumulative EXP from Stage1+2's 8 zone clears
 * — 200 total — crosses the Lv4 cumulative threshold of 189; leveling
 * only applies once at Stage-end, spec §10.17, so all of Stage3 is fought
 * at that fixed Lv4).
 */
export const enemyScrib: EnemyDefinition = {
  id: 'enemy_scrib',
  name: 'スクリブ',
  baseStats: {
    attack: 13,
    defense: 12,
    speed: 13,
    maxHp: 55,
  },
};

/**
 * オーディター — the Area's second 強敵 (strong enemy), clearly tougher than
 * センチネル, reflecting Stage3's later position.
 */
export const enemyAuditor: EnemyDefinition = {
  id: 'enemy_auditor',
  name: 'オーディター',
  baseStats: {
    attack: 19,
    defense: 15,
    speed: 11,
    maxHp: 90,
  },
};

/**
 * 記録管理体《MNEMOS》— Stage3のボス(Zone4 final、v0.2 §27; ビジュアル基準
 * v0.1 §21: 鳥+書物+浮遊端末)。The Area's toughest boss, clearly above
 * NEREID — evaluated against the fixed Lv4 party Stage3 is entirely
 * fought at.
 */
export const enemyBossMnemos: EnemyDefinition = {
  id: 'enemy_boss_mnemos',
  name: '記録管理体《MNEMOS》',
  isBoss: true,
  baseStats: {
    attack: 23,
    defense: 19,
    speed: 12,
    maxHp: 260,
  },
};
