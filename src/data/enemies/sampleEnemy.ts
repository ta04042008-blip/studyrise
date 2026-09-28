import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — 「ランナー」(Stage1《閉ざされた連絡路》Zone1
 * 「旧接続路」×2 / Zone2「監視交差点」×1、ストーリー・世界観仕様書v0.2 §23)。
 * ID kept as `enemy_slime_placeholder` for Save V1 compatibility. Stats
 * redesigned per MVP-10 Phase6 balance pass (data-only — Combat formula
 * unchanged): the party's fastest, most fragile early-game scout-type
 * enemy (ビジュアル基準v0.1 §14: キツネ系生物+物流端末+認証ライン).
 */
export const sampleEnemy: EnemyDefinition = {
  id: 'enemy_slime_placeholder',
  name: 'ランナー',
  baseStats: {
    attack: 8,
    defense: 4,
    speed: 14,
    maxHp: 24,
  },
};
