import type { PermanentState } from '../progression/ProgressionSystem.types';
import type { SaveEnvelope } from './SaveEnvelope';
import { looksLikeEnvelope } from './SaveEnvelope';

/** MVP-9 ships schema v1 only (user's explicit instruction — no speculative past-version migrations). */
export const PERMANENT_SAVE_SCHEMA_VERSION = 1;

export type PermanentSaveEnvelope = SaveEnvelope<PermanentState>;

/**
 * Structural validation only (CLAUDE.md §14 applied to save data, not just
 * content JSON) — deliberately shallow (checks shape/types, not business
 * invariants like "currency >= 0") so a future legitimate balance change
 * never makes an old-but-well-formed save look corrupt.
 */
export function validatePermanentPayload(payload: unknown): payload is PermanentState {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Partial<PermanentState>;
  if (typeof p.characters !== 'object' || p.characters === null) return false;
  if (!Array.isArray(p.unlockedCharacterIds)) return false;
  if (!Array.isArray(p.unlockedStageIds)) return false;
  if (!Array.isArray(p.clearedStageIds)) return false;
  if (typeof p.currency !== 'number') return false;
  if (typeof p.materials !== 'object' || p.materials === null) return false;
  if (typeof p.rareUnlockResource !== 'number') return false;
  if (
    p.savedPartyCharacterIds !== undefined &&
    (!Array.isArray(p.savedPartyCharacterIds) || p.savedPartyCharacterIds.some((id) => typeof id !== 'string'))
  ) return false;
  if (p.enemyBestiary !== undefined) {
    if (typeof p.enemyBestiary !== 'object' || p.enemyBestiary === null) return false;
    for (const entry of Object.values(p.enemyBestiary)) {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        typeof entry.encountered !== 'boolean' ||
        typeof entry.defeated !== 'boolean' ||
        !Array.isArray(entry.observedActionNames) ||
        entry.observedActionNames.some((name) => typeof name !== 'string')
      ) {
        return false;
      }
    }
  }
  if (typeof p.inventory !== 'object' || p.inventory === null) return false;
  if (!Array.isArray(p.inventory.equipment)) return false;
  if (typeof p.inventory.consumables !== 'object' || p.inventory.consumables === null) return false;
  for (const instance of p.inventory.equipment) {
    if (
      typeof instance !== 'object' ||
      instance === null ||
      typeof instance.instanceId !== 'string' ||
      typeof instance.definitionId !== 'string' ||
      typeof instance.enhancementLevel !== 'number' ||
      typeof instance.locked !== 'boolean'
    ) {
      return false;
    }
  }
  for (const state of Object.values(p.characters)) {
    if (
      typeof state !== 'object' ||
      state === null ||
      typeof state.characterId !== 'string' ||
      typeof state.exp !== 'number' ||
      typeof state.level !== 'number' ||
      typeof state.equipped !== 'object' ||
      state.equipped === null
    ) {
      return false;
    }
  }
  return true;
}

/**
 * MVP-9's one-and-only migration entry point (user's explicit instruction:
 * "現在versionを読み込める" is enough for now — a future schema bump adds a
 * branch here, never a rewrite of this function's shape). Returns null for
 * anything unreadable (missing/corrupt/future-unsupported version) so the
 * caller can fall back to a fresh PermanentState without crashing.
 */
export function migratePermanentSave(raw: unknown): PermanentSaveEnvelope | null {
  if (!looksLikeEnvelope(raw)) return null;
  if (raw.schemaVersion !== PERMANENT_SAVE_SCHEMA_VERSION) {
    return null; // unsupported version — no past versions exist yet to migrate from
  }
  if (!validatePermanentPayload(raw.payload)) return null;
  return { schemaVersion: PERMANENT_SAVE_SCHEMA_VERSION, savedAt: raw.savedAt, payload: raw.payload };
}
