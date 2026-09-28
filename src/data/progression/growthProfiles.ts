import type { GrowthProfileId } from '../../engine/progression/ProgressionSystem.types';
import { sampleCharacter } from '../characters/sampleCharacter';
import { samplePartyMember2, samplePartyMember3 } from '../characters/sampleCharacters';

/**
 * MVP-7 growth-profile assignment for the existing MVP-1〜6 sample party
 * (CLAUDE.md §7 data-driven — assignment lives here, not hardcoded in
 * ProgressionSystem). Chosen to match each character's already-established
 * MVP-1〜6 stat role without changing any Lv1 baseStats value (user's
 * explicit instruction):
 *
 *  - 主人公 (char_hero_placeholder): highest single-target attack among the
 *    three at Lv1 (24) → POWER (HP+4/学力+4/忍耐力+2/思考速度+2 per level).
 *  - 魔法使い (char_mage_placeholder): lowest HP/defense, highest speed at
 *    Lv1 → SPEED (HP+4/学力+3/忍耐力+2/思考速度+4 per level) — stays the
 *    party's fastest/most fragile member as it grows.
 *  - 騎士 (char_knight_placeholder): highest HP/defense, lowest speed at
 *    Lv1 → GUARD (HP+7/学力+2/忍耐力+4/思考速度+1 per level) — stays the
 *    party's tank as it grows.
 */
export const sampleGrowthProfileByCharacterId: Record<string, GrowthProfileId> = {
  [sampleCharacter.id]: 'POWER',
  [samplePartyMember2.id]: 'SPEED',
  [samplePartyMember3.id]: 'GUARD',
};
