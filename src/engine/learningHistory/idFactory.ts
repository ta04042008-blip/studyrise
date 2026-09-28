export type LearningHistoryIdFactory = () => string;

let devFallbackCounter = 0;

/**
 * Production LearningHistoryRecord id factory, deliberately separate from
 * any RandomService (user's explicit MVP-8 instruction, mirroring
 * `engine/progression/instanceId.ts`'s EquipmentInstance id factory) —
 * record ids must never consume or be derived from game randomness.
 * Prefers `crypto.randomUUID()`; the counter fallback only matters for an
 * environment that lacks it and is never used by tests, which always inject
 * their own deterministic factory.
 */
export function createProductionLearningHistoryIdFactory(): LearningHistoryIdFactory {
  return () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    devFallbackCounter += 1;
    return `history_fallback_${devFallbackCounter}_${Date.now()}`;
  };
}
