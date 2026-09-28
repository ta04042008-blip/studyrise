import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — 門衛機《JANUS》, Stage1《閉ざされた連絡路》の
 * ボス(Zone4 final、ストーリー・世界観仕様書v0.2 §23/v0.2.1 §11-13; ビジュアル
 * 基準v0.1 §19: 番犬+甲虫+門)。ID kept as `enemy_boss_ogre_placeholder` for
 * Save V1 compatibility. Boss AI is still just the existing fixed-Attack
 * enemy behavior (no phases/telegraphed ultimates — out of MVP-10 scope).
 * Stats redesigned per MVP-10 Phase6 balance pass: **the whole of Stage1
 * (all 4 zones including this boss) is fought at the party's Lv1 baseStats**
 * — permanent leveling only applies once, at Stage-end via
 * `reconcileStageResult` (spec §10.17), never mid-stage — so JANUS must be
 * beatable by a fresh Lv1 party while still being clearly tougher than
 * センチネル (Stage1's strong enemy) and clearly the toughest fight so far.
 */
export const sampleEnemyBoss: EnemyDefinition = {
  id: 'enemy_boss_ogre_placeholder',
  name: '門衛機《JANUS》',
  isBoss: true,
  baseStats: {
    attack: 14,
    defense: 10,
    speed: 8,
    maxHp: 110,
  },
};
