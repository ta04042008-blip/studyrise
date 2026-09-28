import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — Stage2《沈黙した循環区》の敵 (ストーリー・世界観
 * 仕様書v0.2 §25)。New stable IDs (MVP-10 new content). Stats designed
 * against the party's Lv3 baseStats (permanent EXP from Stage1's 4 zone
 * clears — 20+20+20+40=100 — crosses the Lv3 cumulative threshold of 91;
 * leveling only applies once at Stage-end, spec §10.17, so all of Stage2
 * is fought at that fixed Lv3).
 */
export const enemyDrainer: EnemyDefinition = {
  id: 'enemy_drainer',
  name: 'ドレイナー',
  baseStats: {
    attack: 14,
    defense: 11,
    speed: 10,
    maxHp: 50,
  },
};

export const enemyPurger: EnemyDefinition = {
  id: 'enemy_purger',
  name: 'パージャー',
  baseStats: {
    attack: 17,
    defense: 9,
    speed: 12,
    maxHp: 45,
  },
};

/**
 * シールダー — recurring protector-role enemy, also placed in Stage3 Zone3
 * (v0.2 §25/§27).
 */
export const enemyShielder: EnemyDefinition = {
  id: 'enemy_shielder',
  name: 'シールダー',
  baseStats: {
    attack: 13,
    defense: 18,
    speed: 8,
    maxHp: 75,
  },
};

/**
 * 保全核《NEREID》— Stage2のボス(Zone4 final、v0.2 §25; ビジュアル基準v0.1
 * §20: クラゲ/魚の流線形)。Clearly tougher than JANUS (Stage1's boss) and
 * than センチネル (both Stages' strong enemy), reflecting gradual
 * Area-wide escalation — evaluated against the fixed Lv3 party Stage2 is
 * entirely fought at.
 */
export const enemyBossNereid: EnemyDefinition = {
  id: 'enemy_boss_nereid',
  name: '保全核《NEREID》',
  isBoss: true,
  baseStats: {
    attack: 20,
    defense: 16,
    speed: 13,
    maxHp: 190,
  },
};
