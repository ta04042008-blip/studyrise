import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

export const sampleAdditionalSpellIce: SpellDefinition = {
  id: 'spell_ice_shard_placeholder',
  name: '解析パルス',
  targetType: 'enemy',
  questionStars: [2, 2, 3, 3, 4],
  powerByCorrect: [0, 8, 14, 21, 29, 38],
  searchDepthByCorrect: [0, 2, 3, 4, 6, 8],
  maxLevel: 3,
  levelBonuses: [
    { type: 'SEARCH_TARGETS', count: 1 },
    { type: 'SEARCH_TARGETS', count: 2 },
    { type: 'SEARCH_TARGETS', count: 3 },
  ],
  levels: [
    { mpCost: 0, effects: [] },
    { mpCost: 0, effects: [] },
    { mpCost: 0, effects: [] },
  ],
};

export const sampleAdditionalSpellHeal: SpellDefinition = {
  id: 'spell_heal_placeholder',
  name: 'リフレクト',
  targetType: 'self',
  questionStars: [1, 1, 2, 2, 3],
  powerByCorrect: [0, 10, 18, 28, 40, 55],
  maxLevel: 3,
  levelBonuses: [
    { type: 'NONE' },
    { type: 'REFLECT_GUARD', mitigationPercent: 0.25 },
    { type: 'REFLECT_GUARD', mitigationPercent: 0.4 },
  ],
  levels: [
    { mpCost: 0, effects: [] },
    { mpCost: 0, effects: [] },
    { mpCost: 0, effects: [] },
  ],
};

/** All spells any sample character's additionalSpellPoolIds may reference. */
export const sampleAdditionalSpells: SpellDefinition[] = [sampleAdditionalSpellIce, sampleAdditionalSpellHeal];
