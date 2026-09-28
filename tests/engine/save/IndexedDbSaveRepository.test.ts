import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { createIndexedDbSaveRepository } from '../../../src/engine/save/IndexedDbSaveRepository';
import { createSaveSystem } from '../../../src/engine/save/SaveSystem';
import type { PermanentState } from '../../../src/engine/progression/ProgressionSystem.types';

/**
 * Dedicated real-IndexedDB tests (MVP-9 §29: fake-indexeddb, devDependency
 * only) — everything else in SaveSystem is covered against
 * InMemorySaveRepository instead. This file only needs to prove the
 * IndexedDB-specific plumbing (transactions/object stores/db versioning)
 * actually round-trips and stays atomic — the envelope/validation/migration
 * logic itself is exercised exhaustively in SaveSystem.test.ts already.
 */

function samplePermanent(): PermanentState {
  return {
    characters: {},
    unlockedCharacterIds: [],
    unlockedStageIds: ['stage1'],
    clearedStageIds: [],
    currency: 10,
    materials: {},
    rareUnlockResource: 0,
    inventory: { equipment: [], consumables: {} },
  };
}

beforeEach(() => {
  // Each test gets a clean fake-indexeddb instance (module-level singleton).
  indexedDB = new IDBFactory();
});

describe('IndexedDbSaveRepository', () => {
  it('round-trips a PermanentState through a real IndexedDB transaction', async () => {
    const repo = createIndexedDbSaveRepository();
    const system = createSaveSystem({ repository: repo, clock: { now: () => 1 } });
    const permanent = samplePermanent();

    await system.commit({ permanent });
    const boot = await system.loadBoot();
    expect(boot.permanent).toEqual(permanent);
  });

  it('persists across separate repository instances against the same database (survives a simulated reload)', async () => {
    const firstRepo = createIndexedDbSaveRepository();
    await createSaveSystem({ repository: firstRepo, clock: { now: () => 1 } }).commit({
      runWrites: {
        stageStart: {
          areaId: 'area1',
          stageId: 'stage1',
          resolvedParty: [{ id: 'hero', name: 'Hero', baseStats: { attack: 1, defense: 1, speed: 1, maxHp: 1, maxMp: 1 }, initialSpellId: 's', additionalSpellPoolIds: [] }],
          questionScope: [],
          itemSlotSelection: [null, null, null],
          stageRunState: {
            stageId: 'stage1',
            runSeed: 1,
            currentZoneIndex: 0,
            phase: 'ZONE_BATTLE',
            runState: { build: { characters: {} }, currentHpByCharacterId: {}, rewardPhase: null },
            clearedZoneIds: [],
            battleItems: [],
            result: null,
          },
          liveBattleSnapshot: null,
          liveRewardSnapshot: null,
        },
      },
    });

    // A brand-new repository instance — simulates a fresh page load talking
    // to the same on-disk (here: fake) IndexedDB database.
    const secondRepo = createIndexedDbSaveRepository();
    const boot = await createSaveSystem({ repository: secondRepo, clock: { now: () => 2 } }).loadBoot();
    expect(boot.run?.tier).toBe('stageStart');
    expect(boot.run?.payload.stageId).toBe('stage1');
  });

  it('commits permanent + learningHistory + run-tier clears atomically in one transaction', async () => {
    const repo = createIndexedDbSaveRepository();
    const system = createSaveSystem({ repository: repo, clock: { now: () => 1 } });
    await system.commit({
      runWrites: {
        live: {
          areaId: 'a',
          stageId: 's',
          resolvedParty: [{ id: 'hero', name: 'Hero', baseStats: { attack: 1, defense: 1, speed: 1, maxHp: 1, maxMp: 1 }, initialSpellId: 's', additionalSpellPoolIds: [] }],
          questionScope: [],
          itemSlotSelection: [null, null, null],
          stageRunState: {
            stageId: 's',
            runSeed: 1,
            currentZoneIndex: 0,
            phase: 'STAGE_RESULT',
            runState: { build: { characters: {} }, currentHpByCharacterId: {}, rewardPhase: null },
            clearedZoneIds: ['zone1'],
            battleItems: [],
            result: { stageId: 's', outcome: 'CLEARED', zonesCleared: 1, clearedZoneIds: ['zone1'] },
          },
          liveBattleSnapshot: null,
          liveRewardSnapshot: null,
        },
      },
    });

    const permanent = samplePermanent();
    await system.commit({
      permanent,
      learningHistory: { records: [] },
      clearRunTiers: ['live', 'zoneStart', 'stageStart'],
    });

    const boot = await system.loadBoot();
    expect(boot.permanent).toEqual(permanent);
    expect(boot.learningHistory).toEqual({ records: [] });
    expect(boot.run).toBeNull();
  });
});
