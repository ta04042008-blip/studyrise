import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * Newly supplied enemy-art roster.
 *
 * These definitions intentionally remain OUT of the official Stage1-3 zone
 * formations until their story roles / placement are approved. Visual size
 * is presentation metadata and is not used to derive these stats.
 */
export const enemyMechCrustacean: EnemyDefinition = {
  id: 'enemy_mech_crustacean',
  name: '機殻クラブ',
  baseStats: { attack: 13, defense: 15, speed: 7, maxHp: 68 },
};

export const enemyMechMoth: EnemyDefinition = {
  id: 'enemy_mech_moth',
  name: '燐翼モス',
  baseStats: { attack: 14, defense: 8, speed: 15, maxHp: 46 },
};

export const enemyMechDeer: EnemyDefinition = {
  id: 'enemy_mech_deer',
  name: '機装ディア',
  baseStats: { attack: 17, defense: 12, speed: 14, maxHp: 82 },
};

export const enemyMechFox: EnemyDefinition = {
  id: 'enemy_mech_fox',
  name: '機巧フォックス',
  baseStats: { attack: 15, defense: 9, speed: 16, maxHp: 52 },
};

export const enemyMechMantis: EnemyDefinition = {
  id: 'enemy_mech_mantis',
  name: '断刃マンティス',
  baseStats: { attack: 18, defense: 8, speed: 13, maxHp: 58 },
};

export const enemyArmoredTurtle: EnemyDefinition = {
  id: 'enemy_armored_turtle',
  name: '装甲トータス',
  baseStats: { attack: 13, defense: 20, speed: 6, maxHp: 96 },
};

export const enemyMechFish: EnemyDefinition = {
  id: 'enemy_mech_fish',
  name: '流機フィッシュ',
  baseStats: { attack: 14, defense: 10, speed: 15, maxHp: 54 },
};

export const enemyMechLizard: EnemyDefinition = {
  id: 'enemy_mech_lizard',
  name: '機爬リザード',
  baseStats: { attack: 15, defense: 12, speed: 12, maxHp: 64 },
};

export const enemyMechOwl: EnemyDefinition = {
  id: 'enemy_mech_owl',
  name: '監視オウル',
  baseStats: { attack: 15, defense: 10, speed: 14, maxHp: 60 },
};

export const enemyHeavyQuadruped: EnemyDefinition = {
  id: 'enemy_heavy_quadruped',
  name: '重装ベヒモス',
  baseStats: { attack: 21, defense: 21, speed: 7, maxHp: 145 },
};

export const enemyArcaneOrbiter: EnemyDefinition = {
  id: 'enemy_arcane_orbiter',
  name: '環術オービター',
  baseStats: { attack: 19, defense: 14, speed: 12, maxHp: 105 },
};

export const enemyAquaManta: EnemyDefinition = {
  id: 'enemy_aqua_manta',
  name: '蒼流マンタ',
  baseStats: { attack: 20, defense: 15, speed: 15, maxHp: 132 },
};

export const newEnemyRoster: readonly EnemyDefinition[] = [
  enemyMechCrustacean,
  enemyMechMoth,
  enemyMechDeer,
  enemyMechFox,
  enemyMechMantis,
  enemyArmoredTurtle,
  enemyMechFish,
  enemyMechLizard,
  enemyMechOwl,
  enemyHeavyQuadruped,
  enemyArcaneOrbiter,
  enemyAquaManta,
];
