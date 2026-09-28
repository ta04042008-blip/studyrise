let devFallbackCounter = 0;

/**
 * Production EquipmentInstance id factory, deliberately separate from any
 * RandomService (MVP-7 decision doc §11: instance-id generation must be
 * independent of game randomness, so it can never affect — or be affected
 * by — a reproducible runSeed). Prefers `crypto.randomUUID()`; the counter
 * fallback only matters for an environment that lacks it (unavailable in
 * some non-HTTPS contexts) and is never used by tests, which always inject
 * their own deterministic factory.
 */
export function createProductionInstanceIdFactory(): () => string {
  return () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    devFallbackCounter += 1;
    return `instance_fallback_${devFallbackCounter}_${Date.now()}`;
  };
}
