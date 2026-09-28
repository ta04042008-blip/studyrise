import type { Clock } from '../learningHistory/clock';
import type { LearningHistoryState } from '../learningHistory/LearningHistory.types';
import type { PermanentState } from '../progression/ProgressionSystem.types';
import type { RunCheckpointTier, SaveBatch, SaveRepository } from './SaveRepository';
import { RUN_CHECKPOINT_TIERS } from './SaveRepository';
import { PERMANENT_SAVE_SCHEMA_VERSION, migratePermanentSave } from './PermanentSave';
import { LEARNING_HISTORY_SAVE_SCHEMA_VERSION, migrateLearningHistorySave } from './LearningHistorySave';
import { RUN_SAVE_SCHEMA_VERSION, migrateRunSave, type RunSaveEnvelope, type RunSavePayload } from './RunSave';

export interface BootLoadResult {
  /** null means no valid save was found — the caller falls back to a fresh initial PermanentState (spec §15.2). */
  permanent: PermanentState | null;
  /** null means no valid save was found — the caller falls back to empty records. */
  learningHistory: LearningHistoryState | null;
  /** null means no Run is in progress (or every tier was corrupt/absent) — the caller goes straight to Base. */
  run: { tier: RunCheckpointTier; payload: RunSavePayload } | null;
}

export interface SaveCommitInput {
  permanent?: PermanentState;
  learningHistory?: LearningHistoryState;
  runWrites?: Partial<Record<RunCheckpointTier, RunSavePayload>>;
  clearRunTiers?: RunCheckpointTier[];
}

export interface SaveCommitResult {
  ok: boolean;
  error?: unknown;
}

export interface SaveSystem {
  /**
   * MVP-9 startup flow: loads PermanentSave/LearningHistorySave/RunSave,
   * validating and migrating each independently, and walks the RunSave
   * corruption-fallback chain (live → zoneStart → stageStart → none, spec
   * §15.3). Never throws — a corrupted or unreadable slice is treated as
   * absent, and one slice's corruption never blocks the others from loading
   * (user's explicit MVP-9 instruction §25/§26).
   */
  loadBoot(isRunPayloadCompatible?: (payload: RunSavePayload) => boolean): Promise<BootLoadResult>;
  /**
   * Wraps every provided payload in its envelope (schemaVersion + this
   * SaveSystem's injected Clock) and commits them all as one atomic
   * SaveRepository transaction. Never throws — a failed write is reported
   * via `{ ok: false, error }` and leaves every previously-committed
   * checkpoint untouched (the transaction simply never lands), so the
   * caller's in-memory state is always safe to keep using as-is.
   */
  commit(input: SaveCommitInput): Promise<SaveCommitResult>;
}

export interface CreateSaveSystemOptions {
  repository: SaveRepository;
  /** Never `Date.now()` directly at a call site (CLAUDE.md §10's Clock pattern, mirrored from engine/learningHistory/clock.ts). */
  clock: Clock;
}

function warn(message: string, error: unknown) {
  if (typeof console !== 'undefined') {
    console.warn(`[SaveSystem] ${message}`, error);
  }
}

export function createSaveSystem({ repository, clock }: CreateSaveSystemOptions): SaveSystem {
  async function safeLoad<T>(loader: () => Promise<unknown>, migrate: (raw: unknown) => { payload: T } | null): Promise<T | null> {
    try {
      const raw = await loader();
      if (raw === undefined || raw === null) return null;
      const migrated = migrate(raw);
      return migrated ? migrated.payload : null;
    } catch (error) {
      warn('failed to load/validate a save slice — treating it as absent rather than crashing startup.', error);
      return null;
    }
  }

  async function loadBoot(isRunPayloadCompatible?: (payload: RunSavePayload) => boolean): Promise<BootLoadResult> {
    const permanent = await safeLoad(() => repository.loadPermanent(), migratePermanentSave);
    const learningHistory = await safeLoad(() => repository.loadLearningHistory(), migrateLearningHistorySave);

    let run: BootLoadResult['run'] = null;
    for (const tier of RUN_CHECKPOINT_TIERS) {
      // Each tier is validated independently (user's explicit instruction:
      // a corrupt `live` must never take `zoneStart`/`stageStart` down with
      // it) — the very first structurally-valid tier, in fallback order,
      // wins. `isRunPayloadCompatible` (bug fix, MVP-10 acceptance audit
      // item 1) is an additional content-aware gate a caller may supply —
      // a tier that is structurally fine but no longer matches the current
      // content shape (e.g. an old Stage's Zone count/composition changed
      // beneath a saved `currentZoneIndex`) is treated exactly like a
      // corrupt tier: skipped, never taking a still-good older tier with it.
      const payload = await safeLoad(() => repository.loadRunCheckpoint(tier), migrateRunSave);
      if (payload && (!isRunPayloadCompatible || isRunPayloadCompatible(payload))) {
        run = { tier, payload };
        break;
      }
    }

    return { permanent, learningHistory, run };
  }

  async function commit(input: SaveCommitInput): Promise<SaveCommitResult> {
    try {
      const batch: SaveBatch = {};
      const savedAt = clock.now();

      if (input.permanent !== undefined) {
        batch.permanent = { schemaVersion: PERMANENT_SAVE_SCHEMA_VERSION, savedAt, payload: input.permanent };
      }
      if (input.learningHistory !== undefined) {
        batch.learningHistory = { schemaVersion: LEARNING_HISTORY_SAVE_SCHEMA_VERSION, savedAt, payload: input.learningHistory };
      }
      if (input.runWrites) {
        const runWrites: Partial<Record<RunCheckpointTier, RunSaveEnvelope>> = {};
        for (const [tier, payload] of Object.entries(input.runWrites) as [RunCheckpointTier, RunSavePayload][]) {
          runWrites[tier] = { schemaVersion: RUN_SAVE_SCHEMA_VERSION, savedAt, payload };
        }
        batch.runWrites = runWrites;
      }
      if (input.clearRunTiers) {
        batch.clearRunTiers = input.clearRunTiers;
      }

      await repository.commit(batch);
      return { ok: true };
    } catch (error) {
      warn('commit failed — in-memory state is unaffected and no existing checkpoint was touched; will retry on the next save event.', error);
      return { ok: false, error };
    }
  }

  return { loadBoot, commit };
}
