/**
 * Central time abstraction for LearningHistorySystem (user's explicit MVP-8
 * instruction — mirrors RandomService's "central abstraction, injectable in
 * tests" shape for `answeredAt`). `Date.now()` must only ever be called from
 * `createSystemClock()`, never scattered across controllers/UI.
 */
export interface Clock {
  /** Epoch ms. */
  now(): number;
}

/** Production clock. Tests inject a fixed/incrementing `Clock` instead. */
export function createSystemClock(): Clock {
  return {
    now: () => Date.now(),
  };
}
