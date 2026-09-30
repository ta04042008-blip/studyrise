import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

/** ブレイク: high-risk, high-output five-question attack spell. */
export const sampleSpell: SpellDefinition = {
  id: 'spell_firebolt_placeholder',
  name: 'ブレイク',
  targetType: 'enemy',
  questionStars: [1, 2, 3, 4, 5],
  powerByCorrect: [0, 12, 22, 34, 48, 65],
  maxLevel: 3,
  levelBonuses: [
    { type: 'NONE' },
    { type: 'BREAK_GUARD' },
    { type: 'EXECUTE', hpThreshold: 0.4, damageMultiplier: 1.3 },
  ],
  // Legacy payload retained temporarily for roguelite/save compatibility; BattleEngine no longer consumes MP/effects here.
  levels: [
    { mpCost: 0, effects: [] },
    { mpCost: 0, effects: [] },
    { mpCost: 0, effects: [] },
  ],
};
