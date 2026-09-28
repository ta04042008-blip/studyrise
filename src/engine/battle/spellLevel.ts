import type { SpellDefinition, SpellLevelData } from './BattleEngine.types';

/**
 * Resolves a spell's per-level payload (spec §4.5). Levels below 1 or above
 * `maxLevel` are clamped — callers (BattleEngine, RogueliteEngine) should
 * never construct an out-of-range level in the first place, but clamping
 * here keeps a stray off-by-one from ever indexing out of bounds.
 */
export function spellLevelData(spell: SpellDefinition, level: number): SpellLevelData {
  const clamped = Math.min(Math.max(level, 1), spell.maxLevel);
  return spell.levels[clamped - 1];
}
