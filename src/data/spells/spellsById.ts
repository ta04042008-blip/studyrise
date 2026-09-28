import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleSpell } from './sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from './sampleAdditionalSpells';

/**
 * Shared spell content dictionary (CLAUDE.md §15 stable ids). Used both by
 * `useStageController` (battle/reward resolution) and MVP-6's base
 * character screens (spell name display) so it is defined exactly once.
 */
export const spellsById: Record<string, SpellDefinition> = Object.fromEntries(
  [sampleSpell, sampleAdditionalSpellIce, sampleAdditionalSpellHeal].map((s) => [s.id, s]),
);
