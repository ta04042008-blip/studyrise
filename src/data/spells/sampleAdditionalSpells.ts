import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — spells offered only through a NEW_SPELL roguelite
 * reward (spec §4.3 "追加スペルプール"), never a character's initial spell.
 * Not final game content (CLAUDE.md §24); numeric values are PLACEHOLDER
 * balance, not confirmed by the spec.
 */
export const sampleAdditionalSpellIce: SpellDefinition = {
  id: 'spell_ice_shard_placeholder',
  name: 'アイスシャード', // PLACEHOLDER
  targetType: 'enemy',
  maxLevel: 3,
  levels: [
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 10 }] }, // PLACEHOLDER Lv1
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 16 }] }, // PLACEHOLDER Lv2
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 22 }] }, // PLACEHOLDER Lv3
  ],
};

export const sampleAdditionalSpellHeal: SpellDefinition = {
  id: 'spell_heal_placeholder',
  name: 'ヒール', // PLACEHOLDER
  targetType: 'self',
  maxLevel: 3,
  levels: [
    { mpCost: 2, effects: [{ type: 'HEAL', amount: 15 }] }, // PLACEHOLDER Lv1
    { mpCost: 2, effects: [{ type: 'HEAL', amount: 22 }] }, // PLACEHOLDER Lv2
    { mpCost: 2, effects: [{ type: 'HEAL', amount: 30 }] }, // PLACEHOLDER Lv3
  ],
};

/** All spells any sample character's additionalSpellPoolIds may reference. */
export const sampleAdditionalSpells: SpellDefinition[] = [sampleAdditionalSpellIce, sampleAdditionalSpellHeal];
