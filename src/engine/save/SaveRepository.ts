import type { PermanentSaveEnvelope } from './PermanentSave';
import type { LearningHistorySaveEnvelope } from './LearningHistorySave';
import type { RunSaveEnvelope } from './RunSave';

/**
 * MVP-9 spec §15.3's 3-tier corruption-recovery chain, user's explicit
 * instruction: `live` is the frequently-updated in-progress checkpoint,
 * `zoneStart` is refreshed only when a new Zone begins, `stageStart` is
 * written once at Stage departure and held until the Stage ends. Load
 * priority is always live → zoneStart → stageStart → none (Base).
 */
export type RunCheckpointTier = 'live' | 'zoneStart' | 'stageStart';

export const RUN_CHECKPOINT_TIERS: readonly RunCheckpointTier[] = ['live', 'zoneStart', 'stageStart'];

/**
 * One atomic unit of work (user's explicit MVP-9 instruction §13): every
 * envelope present here, and every tier listed in `clearRunTiers`, must be
 * applied together in a single IndexedDB `readwrite` transaction (or,
 * for InMemorySaveRepository, a single synchronous update) — never
 * partially. `clearRunTiers` is applied in the same transaction as any
 * `runWrites` (e.g. Stage-finalize writes `permanent`+`learningHistory` and
 * clears all 3 run tiers at once — see SaveSystem.ts's `commit`).
 */
export interface SaveBatch {
  permanent?: PermanentSaveEnvelope;
  learningHistory?: LearningHistorySaveEnvelope;
  runWrites?: Partial<Record<RunCheckpointTier, RunSaveEnvelope>>;
  clearRunTiers?: RunCheckpointTier[];
}

/**
 * IndexedDB (or any other storage) is hidden entirely behind this interface
 * (CLAUDE.md §21/user's explicit MVP-9 instruction — SaveSystem/engines
 * never see IndexedDB APIs directly). `loadX` calls are independent of each
 * other so one corrupted store never blocks reading the others; `commit` is
 * the only write path and is always all-or-nothing.
 */
export interface SaveRepository {
  loadPermanent(): Promise<unknown>;
  loadLearningHistory(): Promise<unknown>;
  loadRunCheckpoint(tier: RunCheckpointTier): Promise<unknown>;
  commit(batch: SaveBatch): Promise<void>;
}
