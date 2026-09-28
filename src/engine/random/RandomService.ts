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

/**
 * Deterministically derives a new numeric seed from a base seed plus any
 * number of string/number parts (spec MVP-5: a Stage's `runSeed` must fan
 * out into independent-but-reproducible streams per zone/purpose, e.g.
 * `deriveSeed(runSeed, zoneId, 'battle')` vs `deriveSeed(runSeed, zoneId,
 * 'reward')`). Pure and side-effect-free — calling it twice with the same
 * arguments always returns the same value, so it is safe to call from a
 * React render body without perturbing anything (CLAUDE.md §10: UI re-render
 * counts must never change game randomness).
 *
 * FNV-1a-style string hashing, mixed with the base seed and a separator
 * between parts so e.g. `("ab", "c")` and `("a", "bc")` do not collide.
 */
export function deriveSeed(runSeed: number, ...parts: (string | number)[]): number {
  let h = (runSeed >>> 0) ^ 0x811c9dc5;
  for (const part of parts) {
    const s = String(part);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    h ^= 0x9e3779b9; // separator mix so part boundaries matter
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
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
