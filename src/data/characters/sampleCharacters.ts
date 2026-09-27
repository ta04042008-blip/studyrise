import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleCharacter } from './sampleCharacter';
import { sampleSpell } from '../spells/sampleSpell';

/**
 * PLACEHOLDER content — a 3-person party (spec §4.1) for exercising MVP-3's
 * party/multi-enemy battle loop. Not final game content (CLAUDE.md §24);
 * all three reuse the same PLACEHOLDER spell for simplicity.
 */
export const samplePartyMember2: CharacterDefinition = {
  id: 'char_mage_placeholder',
  name: '魔法使い', // PLACEHOLDER
  baseStats: {
    attack: 20,
    defense: 5,
    speed: 16,
    maxHp: 45,
    maxMp: 5,
  },
  initialSpellId: sampleSpell.id,
};

export const samplePartyMember3: CharacterDefinition = {
  id: 'char_knight_placeholder',
  name: '騎士', // PLACEHOLDER
  baseStats: {
    attack: 18,
    defense: 14,
    speed: 8,
    maxHp: 80,
    maxMp: 5,
  },
  initialSpellId: sampleSpell.id,
};

/** Full 3-person party, in fixed order (spec §4.1: no mid-stage swap in MVP-3). */
export const sampleParty: CharacterDefinition[] = [sampleCharacter, samplePartyMember2, samplePartyMember3];
