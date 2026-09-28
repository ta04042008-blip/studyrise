import type { ItemDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — 「応急処置キット」(HP回復effectに合わせた
 * 世界観準拠の名称、旧文明修理装備テーマ)。ID/effect/数値は変更しない
 * (user's explicit instruction — Save V1互換性優先)。
 */
export const sampleItem: ItemDefinition = {
  id: 'item_basic_potion_placeholder',
  name: '応急処置キット',
  targetType: 'self',
  effects: [{ type: 'HEAL', amount: 20 }],
};
