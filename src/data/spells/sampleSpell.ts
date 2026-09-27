import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — the sample character's one starting spell (spec
 * §4.5: every character begins a stage with exactly one initial spell at
 * Lv1, upgradable to maxLevel via roguelite SPELL_UPGRADE rewards). Not
 * final game content (CLAUDE.md §24); numeric values are PLACEHOLDER
 * balance, not confirmed by the spec.
 */
export const sampleSpell: SpellDefinition = {
  id: 'spell_firebolt_placeholder',
  name: 'ファイアボルト', // PLACEHOLDER
  targetType: 'enemy',
  maxLevel: 3,
  levels: [
    { mpCost: 3, effects: [{ type: 'DAMAGE', amount: 15 }] }, // PLACEHOLDER Lv1
    { mpCost: 3, effects: [{ type: 'DAMAGE', amount: 22 }] }, // PLACEHOLDER Lv2
    { mpCost: 3, effects: [{ type: 'DAMAGE', amount: 30 }] }, // PLACEHOLDER Lv3
  ],
};
