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

/**
 * Serializable snapshot of a RandomService's internal cursor (MVP-9 spec
 * §15.2/§18.16, user's explicit instruction: resume must continue the exact
 * same future random sequence as an unreloaded session, not just reseed).
 * `algorithm` is carried explicitly so a future PRNG swap can reject a
 * snapshot from the old one instead of silently misinterpreting its bits.
 */
export interface RandomState {
  algorithm: 'mulberry32';
  state: number;
}

/**
 * A RandomService that can also export its current cursor for persistence.
 * Deliberately NOT merged into the base `RandomService` interface — many
 * existing tests construct plain `RandomService` object literals (stub/
 * deterministic randoms) that have no notion of internal state to export,
 * and CLAUDE.md §22/user's explicit MVP-9 instruction forbid breaking that
 * existing surface. Only `createRandomService`'s own return value (and
 * anything built via `createRandomServiceFromState`) implements this.
 */
export interface StatefulRandomService extends RandomService {
  exportState(): RandomState;
}

/**
 * mulberry32 core, parameterized by its *current* internal state rather
 * than always starting from a fresh seed — this is what lets
 * `createRandomService(seed)` and `createRandomServiceFromState(state)`
 * share one implementation while both exposing `exportState()`. The
 * step math itself is byte-identical to the original implementation, so
 * `createRandomService(seed)`'s output sequence for any existing seed is
 * unchanged.
 */
function createFromRawState(initialState: number): StatefulRandomService {
  let a = initialState;

  function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

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
    exportState() {
      return { algorithm: 'mulberry32', state: a };
    },
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

/**
 * Declared as returning the base `RandomService` (not `StatefulRandomService`)
 * even though the returned object always implements `exportState()` too —
 * several existing test files declare helper functions with a default
 * parameter of `createRandomService(seed)` (e.g. `function makeEngine(random
 * = createRandomService(1))`), and TypeScript infers that parameter's type
 * from the default value. Declaring `StatefulRandomService` here would have
 * silently tightened every such parameter's type, breaking every existing
 * call site that passes a plain `RandomService` test double (CLAUDE.md
 * §22/user's explicit MVP-9 instruction: do not break the existing surface).
 * Code that specifically needs `exportState()` (BattleEngine.exportSnapshot,
 * RogueliteEngine reward snapshotting) casts defensively at the call site —
 * see BattleEngine.ts's exportSnapshot() for the pattern.
 */
export function createRandomService(seed: number): RandomService {
  return createFromRawState(seed >>> 0);
}

/**
 * Resumes a RandomService from a previously exported `RandomState` (MVP-9),
 * continuing the exact same future sequence the original instance would
 * have produced — the whole point being that a reload must not reseed
 * not-yet-consumed rolls (user's explicit MVP-9 instruction, overriding the
 * earlier "reseed on resume" proposal).
 */
export function createRandomServiceFromState(state: RandomState): StatefulRandomService {
  if (state.algorithm !== 'mulberry32') {
    throw new Error(`createRandomServiceFromState: unsupported algorithm "${state.algorithm}"`);
  }
  return createFromRawState(state.state);
}

/**
 * Reads the current cursor off any `RandomService` that happens to support
 * `exportState()` (see `StatefulRandomService`), throwing a clear error
 * otherwise. Centralizes the defensive cast so callers that only ever
 * receive the base `RandomService` type (BattleEngine, RogueliteEngine
 * reward-phase snapshotting) never need to know `StatefulRandomService`'s
 * shape themselves — production code always actually hands them an instance
 * built by `createRandomService`/`createRandomServiceFromState`, which
 * always implements it.
 */
export function exportRandomState(random: RandomService): RandomState {
  const stateful = random as Partial<StatefulRandomService>;
  if (typeof stateful.exportState !== 'function') {
    throw new Error(
      'exportRandomState: this RandomService does not support exportState() — construct it via createRandomService()/createRandomServiceFromState().',
    );
  }
  return stateful.exportState();
}
