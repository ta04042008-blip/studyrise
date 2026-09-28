import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — 「ブレイク」, 南雲彩乃の初期スペル (v0.2 §19.2
 * 「単体攻撃を中心としたシンプルな攻撃スペル」). ID kept as
 * `spell_firebolt_placeholder` for Save V1 compatibility; effect/cost/
 * balance values are unchanged from MVP-4〜9 (user's explicit instruction —
 * display name only).
 */
export const sampleSpell: SpellDefinition = {
  id: 'spell_firebolt_placeholder',
  name: 'ブレイク',
  targetType: 'enemy',
  maxLevel: 3,
  levels: [
    { mpCost: 3, effects: [{ type: 'DAMAGE', amount: 15 }] },
    { mpCost: 3, effects: [{ type: 'DAMAGE', amount: 22 }] },
    { mpCost: 3, effects: [{ type: 'DAMAGE', amount: 30 }] },
  ],
};
