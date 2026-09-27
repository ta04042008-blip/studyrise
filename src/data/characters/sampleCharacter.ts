import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * PLACEHOLDER content — a single minimal playable character, just enough
 * to exercise MVP-1's 1v1 battle loop. Not final game content
 * (CLAUDE.md §24); skill/spell/equipment fields are intentionally omitted
 * since MVP-1 does not implement those systems.
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
};
