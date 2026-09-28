import type { RunCheckpointTier, SaveBatch, SaveRepository } from './SaveRepository';

const DB_NAME = 'studyrise-save';
/**
 * IndexedDB's own database `version` (an integer bumped only when the
 * object-store layout itself changes) — a completely different concept
 * from any `SaveEnvelope.schemaVersion` (the game-save-schema version of
 * one slice's payload; see SaveEnvelope.ts). Never conflate the two.
 */
const DB_VERSION = 1;

const PERMANENT_STORE = 'permanent';
const LEARNING_HISTORY_STORE = 'learningHistory';
const RUN_STORE = 'run';
/** Both `permanent` and `learningHistory` are single-record stores — always read/written under this one key. */
const SINGLETON_KEY = 'current';

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PERMANENT_STORE)) db.createObjectStore(PERMANENT_STORE);
      if (!db.objectStoreNames.contains(LEARNING_HISTORY_STORE)) db.createObjectStore(LEARNING_HISTORY_STORE);
      if (!db.objectStoreNames.contains(RUN_STORE)) db.createObjectStore(RUN_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * The only place IndexedDB's actual API is touched (CLAUDE.md
 * §21/§30/user's explicit MVP-9 instruction — SaveSystem and every engine
 * only ever see the storage-agnostic `SaveRepository` interface). `commit`
 * is a single IndexedDB `readwrite` transaction spanning all three stores,
 * so a batch that writes PermanentSave + LearningHistorySave and clears
 * every Run tier either lands completely or not at all (spec §15/user's
 * explicit atomic-transaction requirement).
 */
export function createIndexedDbSaveRepository(): SaveRepository {
  let dbPromise: Promise<IDBDatabase> | null = null;
  function getDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = openDatabase();
    }
    return dbPromise;
  }

  return {
    async loadPermanent() {
      const db = await getDb();
      const tx = db.transaction(PERMANENT_STORE, 'readonly');
      return promisifyRequest(tx.objectStore(PERMANENT_STORE).get(SINGLETON_KEY));
    },

    async loadLearningHistory() {
      const db = await getDb();
      const tx = db.transaction(LEARNING_HISTORY_STORE, 'readonly');
      return promisifyRequest(tx.objectStore(LEARNING_HISTORY_STORE).get(SINGLETON_KEY));
    },

    async loadRunCheckpoint(tier: RunCheckpointTier) {
      const db = await getDb();
      const tx = db.transaction(RUN_STORE, 'readonly');
      return promisifyRequest(tx.objectStore(RUN_STORE).get(tier));
    },

    async commit(batch: SaveBatch) {
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([PERMANENT_STORE, LEARNING_HISTORY_STORE, RUN_STORE], 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDbSaveRepository.commit: transaction aborted'));

        if (batch.permanent !== undefined) {
          tx.objectStore(PERMANENT_STORE).put(batch.permanent, SINGLETON_KEY);
        }
        if (batch.learningHistory !== undefined) {
          tx.objectStore(LEARNING_HISTORY_STORE).put(batch.learningHistory, SINGLETON_KEY);
        }
        const runStore = tx.objectStore(RUN_STORE);
        if (batch.runWrites) {
          for (const [tier, envelope] of Object.entries(batch.runWrites) as [RunCheckpointTier, unknown][]) {
            runStore.put(envelope, tier);
          }
        }
        if (batch.clearRunTiers) {
          for (const tier of batch.clearRunTiers) {
            runStore.delete(tier);
          }
        }
      });
    },
  };
}
