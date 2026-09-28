import type { RunCheckpointTier, SaveBatch, SaveRepository } from './SaveRepository';

/**
 * In-memory implementation of SaveRepository (user's explicit MVP-9
 * instruction §29 — most of SaveSystem's tests use this instead of a real
 * IndexedDB, via `fake-indexeddb`, which is reserved for
 * IndexedDbSaveRepository's own dedicated tests). Implements the exact same
 * atomic-`commit` contract: every write in one `commit()` call is applied
 * together, or (on a thrown error) not at all.
 */
export function createInMemorySaveRepository(): SaveRepository {
  let permanent: unknown = null;
  let learningHistory: unknown = null;
  const run: Record<RunCheckpointTier, unknown> = { live: null, zoneStart: null, stageStart: null };

  return {
    async loadPermanent() {
      return permanent;
    },
    async loadLearningHistory() {
      return learningHistory;
    },
    async loadRunCheckpoint(tier) {
      return run[tier];
    },
    async commit(batch: SaveBatch) {
      // Applied to local variables first, then assigned all at once, so a
      // thrown error partway through building the batch never leaves a
      // partial write behind (mirrors an IndexedDB transaction's atomicity).
      const nextPermanent = batch.permanent !== undefined ? batch.permanent : permanent;
      const nextLearningHistory = batch.learningHistory !== undefined ? batch.learningHistory : learningHistory;
      const nextRun = { ...run };
      if (batch.runWrites) {
        for (const [tier, envelope] of Object.entries(batch.runWrites) as [RunCheckpointTier, unknown][]) {
          nextRun[tier] = envelope;
        }
      }
      if (batch.clearRunTiers) {
        for (const tier of batch.clearRunTiers) {
          nextRun[tier] = null;
        }
      }

      permanent = nextPermanent;
      learningHistory = nextLearningHistory;
      run.live = nextRun.live;
      run.zoneStart = nextRun.zoneStart;
      run.stageStart = nextRun.stageStart;
    },
  };
}
