import type { ItemDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — a single minimal recovery item to exercise
 * MVP-2's in-battle item usage (persistent 3-slot inventory/base stock is
 * explicitly out of scope, spec §17.3). Not final game content.
 */
export const sampleItem: ItemDefinition = {
  id: 'item_basic_potion_placeholder',
  name: '簡易回復薬', // PLACEHOLDER
  targetType: 'self',
  effects: [{ type: 'HEAL', amount: 20 }], // PLACEHOLDER
};
