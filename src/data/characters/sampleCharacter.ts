import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleSpell } from '../spells/sampleSpell';

/**
 * PLACEHOLDER content — a minimal playable character, just enough to
 * exercise the MVP-1/MVP-2/MVP-3 battle loop. Not final game content
 * (CLAUDE.md §24); skill/equipment fields are intentionally omitted since
 * neither system is implemented yet.
 */
export const sampleCharacter: CharacterDefinition = {
  id: 'char_hero_placeholder',
  name: '主人公', // PLACEHOLDER
  baseStats: {
    attack: 24,
    defense: 8,
    speed: 12,
    maxHp: 60,
    maxMp: 5,
  },
  initialSpellId: sampleSpell.id,
};
