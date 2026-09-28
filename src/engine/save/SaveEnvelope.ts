/**
 * Generic save envelope (MVP-9 spec §15/§18.12, user's explicit
 * instruction): every persisted slice — PermanentSave, LearningHistorySave,
 * RunSave — is wrapped in exactly this shape. `schemaVersion` is this
 * envelope's OWN game-save-schema version, never to be confused with the
 * IndexedDB database's own `version` (a completely separate concept —
 * see IndexedDbSaveRepository). `savedAt` is always sourced from an
 * injected Clock (mirrors engine/learningHistory/clock.ts's existing
 * pattern) — never a direct `Date.now()` call at a save call site.
 */
export interface SaveEnvelope<TPayload> {
  schemaVersion: number;
  savedAt: number;
  payload: TPayload;
}

/** True for any object shaped like a SaveEnvelope, regardless of payload validity — the first, cheap check before payload-specific validation. */
export function looksLikeEnvelope(value: unknown): value is { schemaVersion: unknown; savedAt: number; payload: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'schemaVersion' in value &&
    'savedAt' in value &&
    'payload' in value &&
    typeof (value as { savedAt: unknown }).savedAt === 'number'
  );
}
