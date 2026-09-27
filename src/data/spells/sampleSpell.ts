import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — the sample character's one starting spell (spec
 * §4.5: every character begins a stage with exactly one initial spell at
 * Lv1). Not final game content (CLAUDE.md §24); numeric values are
 * PLACEHOLDER balance, not confirmed by the spec.
 */
export const sampleSpell: SpellDefinition = {
  id: 'spell_firebolt_placeholder',
  name: 'ファイアボルト', // PLACEHOLDER
  mpCost: 3, // PLACEHOLDER
  targetType: 'enemy',
  effects: [{ type: 'DAMAGE', amount: 15 }], // PLACEHOLDER
};
