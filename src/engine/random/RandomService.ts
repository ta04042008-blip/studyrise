/**
 * Central random abstraction (CLAUDE.md §10). All randomness in the battle
 * (damage variance, critical, tie-breaks, question selection, ...) must go
 * through an instance of this service so runs can be seeded/reproduced and
 * confirmed outcomes cannot be rerolled on reload.
 */
export interface RandomService {
  /** Uniform float in [min, max). */
  uniform(min: number, max: number): number;
  /** true with probability `chance` (0..1). */
  chance(chance: number): boolean;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Picks one element from a non-empty array. */
  pick<T>(items: readonly T[]): T;
}

/** mulberry32 — small, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomService(seed: number): RandomService {
  const next = mulberry32(seed);

  return {
    uniform(min, max) {
      return min + next() * (max - min);
    },
    chance(chance) {
      return next() < chance;
    },
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error('RandomService.pick: items must not be empty');
      }
      return items[Math.floor(next() * items.length)];
    },
  };
}
