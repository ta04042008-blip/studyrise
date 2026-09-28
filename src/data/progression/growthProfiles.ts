import type { GrowthProfileId } from '../../engine/progression/ProgressionSystem.types';
import { sampleCharacter } from '../characters/sampleCharacter';
import { samplePartyMember2, samplePartyMember3 } from '../characters/sampleCharacters';

/**
 * MVP-10 official GrowthProfile assignment for 葉山智也 / 南雲彩乃 / 岡村駆
 * (user's explicit MVP-10 decision — confirmed, not to be re-derived):
 *
 *  - 智也 (char_hero_placeholder): POWER. Matches Spec v0.10 §10.3's
 *    "主人公:POWER" sample mapping; Lv1 baseStats stay the existing
 *    all-around profile, so POWER growth does not make him an instant
 *    glass-cannon attacker.
 *  - 彩乃 (char_mage_placeholder): SPEED. Closest fit to v0.2 §19.2's
 *    「攻撃 / 先手 / 学力 / 思考速度」戦闘傾向.
 *  - 駆 (char_knight_placeholder): SPEED. v0.2 §20.2 explicitly names
 *    「思考速度」 as his combat identity — GUARD's lowest-of-three speed
 *    growth (+1/level) would contradict that, so he is NOT forced onto
 *    GUARD merely to keep "one profile per character". Reusing the same
 *    profile as another character is explicitly allowed (user's
 *    instruction: GrowthProfile is not a 1-per-character slot system).
 *
 * GUARD remains a valid profile in the system but is not assigned to any
 * of the 3 MVP-10 characters (user's explicit instruction — no forced
 * assignment). Lv1 baseStats are unchanged from MVP-1〜9.
 */
export const sampleGrowthProfileByCharacterId: Record<string, GrowthProfileId> = {
  [sampleCharacter.id]: 'POWER',
  [samplePartyMember2.id]: 'SPEED',
  [samplePartyMember3.id]: 'SPEED',
};
