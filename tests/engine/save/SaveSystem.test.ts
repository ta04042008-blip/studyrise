import { describe, expect, it } from 'vitest';
import { createInMemorySaveRepository } from '../../../src/engine/save/InMemorySaveRepository';
import { createSaveSystem } from '../../../src/engine/save/SaveSystem';
import type { Clock } from '../../../src/engine/learningHistory/clock';
import type { PermanentState } from '../../../src/engine/progression/ProgressionSystem.types';
import type { LearningHistoryState } from '../../../src/engine/learningHistory/LearningHistory.types';
import type { RunSavePayload } from '../../../src/engine/save/RunSave';

function fixedClock(t: number): Clock {
  return { now: () => t };
}

function samplePermanent(): PermanentState {
  return {
    characters: { hero: { characterId: 'hero', exp: 100, level: 3, equipped: { weaponInstanceId: 'w1', armorInstanceId: null, accessoryInstanceId: null } } },
    unlockedCharacterIds: ['hero'],
    unlockedStageIds: ['stage1'],
    clearedStageIds: [],
    currency: 500,
    materials: { ore: 3 },
    rareUnlockResource: 1,
    inventory: {
      equipment: [{ instanceId: 'w1', definitionId: 'sword', enhancementLevel: 2, locked: false }],
      consumables: { potion: 2 },
    },
  };
}

function sampleHistory(): LearningHistoryState {
  return {
    records: [
      {
        id: 'r1',
        questionId: 'q1',
        subject: '数学',
        field: '計算',
        unit: '四則演算',
        star: 1,
        answerResult: 'CORRECT',
        recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 1 },
        answeredAt: 1000,
      },
    ],
  };
}

function sampleRunPayload(overrides: Partial<RunSavePayload> = {}): RunSavePayload {
  return {
    areaId: 'area1',
    stageId: 'stage1',
    resolvedParty: [
      { id: 'hero', name: 'Hero', baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 100, maxMp: 5 }, initialSpellId: 'spell1', additionalSpellPoolIds: [] },
    ],
    questionScope: [{ subject: '数学', field: '計算', unit: '四則演算' }],
    itemSlotSelection: ['potion', null, null],
    stageRunState: {
      stageId: 'stage1',
      runSeed: 42,
      currentZoneIndex: 0,
      phase: 'ZONE_BATTLE',
      runState: { build: { characters: {} }, currentHpByCharacterId: { hero: 100 }, rewardPhase: null },
      clearedZoneIds: [],
      battleItems: [],
      result: null,
    },
    liveBattleSnapshot: null,
    liveRewardSnapshot: null,
    ...overrides,
  };
}

describe('SaveSystem — boot load (InMemorySaveRepository)', () => {
  it('returns null for everything on a first-ever boot (no saves exist)', async () => {
    const system = createSaveSystem({ repository: createInMemorySaveRepository(), clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.permanent).toBeNull();
    expect(boot.learningHistory).toBeNull();
    expect(boot.run).toBeNull();
  });

  it('round-trips PermanentState, including EquipmentInstance and consumable quantities', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(111) });
    const permanent = samplePermanent();

    const result = await system.commit({ permanent });
    expect(result.ok).toBe(true);

    const boot = await system.loadBoot();
    expect(boot.permanent).toEqual(permanent);
  });

  it('round-trips LearningHistoryState, preserving answeredAt and recordedAnswer', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(222) });
    const history = sampleHistory();

    await system.commit({ learningHistory: history });
    const boot = await system.loadBoot();
    expect(boot.learningHistory).toEqual(history);
  });

  it('stamps schemaVersion and savedAt (from the injected Clock, never Date.now) on every write', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(999) });
    await system.commit({ permanent: samplePermanent() });

    const raw = (await repo.loadPermanent()) as { schemaVersion: number; savedAt: number };
    expect(raw.schemaVersion).toBe(1);
    expect(raw.savedAt).toBe(999);
  });

  it('rejects a save with an unsupported/future schemaVersion rather than crashing', async () => {
    const repo = createInMemorySaveRepository();
    await repo.commit({ permanent: { schemaVersion: 999, savedAt: 1, payload: samplePermanent() } });
    const system = createSaveSystem({ repository: repo, clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.permanent).toBeNull();
  });

  it('rejects structurally invalid payloads (missing required fields) rather than crashing', async () => {
    const repo = createInMemorySaveRepository();
    await repo.commit({ permanent: { schemaVersion: 1, savedAt: 1, payload: { currency: 'not-a-number' } as unknown as PermanentState } });
    const system = createSaveSystem({ repository: repo, clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.permanent).toBeNull();
  });

  it("treats a corrupted permanent save as absent without blocking learningHistory/run from loading", async () => {
    const repo = createInMemorySaveRepository();
    await repo.commit({
      permanent: { schemaVersion: 1, savedAt: 1, payload: null as unknown as PermanentState },
      learningHistory: { schemaVersion: 1, savedAt: 1, payload: sampleHistory() },
      runWrites: { live: { schemaVersion: 1, savedAt: 1, payload: sampleRunPayload() } },
    });
    const system = createSaveSystem({ repository: repo, clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.permanent).toBeNull();
    expect(boot.learningHistory).toEqual(sampleHistory());
    expect(boot.run?.tier).toBe('live');
  });
});

describe('SaveSystem — RunSave 3-tier checkpoint fallback (spec §15.3)', () => {
  it('creates, loads, and round-trips a Run checkpoint, preserving runSeed/zone index/HP/RunBuild', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(1) });
    const payload = sampleRunPayload();

    await system.commit({ runWrites: { stageStart: payload } });
    const boot = await system.loadBoot();
    expect(boot.run).toEqual({ tier: 'stageStart', payload });
  });

  it('prefers live, then zoneStart, then stageStart, in that order', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(1) });
    await system.commit({
      runWrites: {
        stageStart: sampleRunPayload({ stageId: 'from-stageStart' }),
        zoneStart: sampleRunPayload({ stageId: 'from-zoneStart' }),
        live: sampleRunPayload({ stageId: 'from-live' }),
      },
    });
    const boot = await system.loadBoot();
    expect(boot.run?.tier).toBe('live');
    expect(boot.run?.payload.stageId).toBe('from-live');
  });

  it('falls back to zoneStart when live is corrupted, without touching zoneStart/stageStart', async () => {
    const repo = createInMemorySaveRepository();
    await repo.commit({
      runWrites: {
        live: { schemaVersion: 1, savedAt: 1, payload: { garbage: true } as unknown as RunSavePayload },
        zoneStart: { schemaVersion: 1, savedAt: 1, payload: sampleRunPayload({ stageId: 'from-zoneStart' }) },
        stageStart: { schemaVersion: 1, savedAt: 1, payload: sampleRunPayload({ stageId: 'from-stageStart' }) },
      },
    });
    const system = createSaveSystem({ repository: repo, clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.run?.tier).toBe('zoneStart');
    expect(boot.run?.payload.stageId).toBe('from-zoneStart');
    // The corrupted `live` tier itself must survive untouched by a mere load.
    expect(await repo.loadRunCheckpoint('zoneStart')).not.toBeNull();
    expect(await repo.loadRunCheckpoint('stageStart')).not.toBeNull();
  });

  it('falls back to stageStart when both live and zoneStart are corrupted', async () => {
    const repo = createInMemorySaveRepository();
    await repo.commit({
      runWrites: {
        live: { schemaVersion: 1, savedAt: 1, payload: {} as unknown as RunSavePayload },
        zoneStart: { schemaVersion: 1, savedAt: 1, payload: {} as unknown as RunSavePayload },
        stageStart: { schemaVersion: 1, savedAt: 1, payload: sampleRunPayload() },
      },
    });
    const system = createSaveSystem({ repository: repo, clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.run?.tier).toBe('stageStart');
  });

  it('falls back to Base (run: null) when all three tiers are corrupted or absent', async () => {
    const repo = createInMemorySaveRepository();
    await repo.commit({
      runWrites: {
        live: { schemaVersion: 1, savedAt: 1, payload: {} as unknown as RunSavePayload },
        zoneStart: { schemaVersion: 1, savedAt: 1, payload: {} as unknown as RunSavePayload },
        stageStart: { schemaVersion: 1, savedAt: 1, payload: {} as unknown as RunSavePayload },
      },
    });
    const system = createSaveSystem({ repository: repo, clock: fixedClock(0) });
    const boot = await system.loadBoot();
    expect(boot.run).toBeNull();
  });

  it('clearRunTiers removes all three tiers (explicit discard / Stage-finalize)', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(1) });
    await system.commit({
      runWrites: { live: sampleRunPayload(), zoneStart: sampleRunPayload(), stageStart: sampleRunPayload() },
    });
    await system.commit({ clearRunTiers: ['live', 'zoneStart', 'stageStart'] });

    const boot = await system.loadBoot();
    expect(boot.run).toBeNull();
  });
});

describe('SaveSystem — atomic commit', () => {
  it('a single commit() call can write permanent + learningHistory and clear all run tiers together (Stage finalize)', async () => {
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(1) });
    await system.commit({ runWrites: { live: sampleRunPayload() } });

    const permanent = samplePermanent();
    const history = sampleHistory();
    await system.commit({
      permanent,
      learningHistory: history,
      clearRunTiers: ['live', 'zoneStart', 'stageStart'],
    });

    const boot = await system.loadBoot();
    expect(boot.permanent).toEqual(permanent);
    expect(boot.learningHistory).toEqual(history);
    expect(boot.run).toBeNull();
  });

  it('a failed repository.commit() never crashes and never touches previously-saved checkpoints', async () => {
    const goodPermanent = samplePermanent();
    const repo = createInMemorySaveRepository();
    const system = createSaveSystem({ repository: repo, clock: fixedClock(1) });
    await system.commit({ permanent: goodPermanent });

    const failingRepo = {
      ...repo,
      commit: async () => {
        throw new Error('simulated IndexedDB write failure');
      },
    };
    const failingSystem = createSaveSystem({ repository: failingRepo, clock: fixedClock(2) });
    const result = await failingSystem.commit({ permanent: { ...goodPermanent, currency: 999999 } });

    expect(result.ok).toBe(false);
    // The earlier, successfully-committed PermanentState must still be there.
    const boot = await system.loadBoot();
    expect(boot.permanent?.currency).toBe(goodPermanent.currency);
  });
});
