import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { createSaveSystem, type SaveSystem } from '../../src/engine/save/SaveSystem';
import type { RunCheckpointTier, SaveBatch, SaveRepository } from '../../src/engine/save/SaveRepository';
import { RUN_SAVE_SCHEMA_VERSION, type RunSaveEnvelope, type RunSavePayload } from '../../src/engine/save/RunSave';
import type { BattleActor, BattleEngineSnapshot } from '../../src/engine/battle/BattleEngine.types';

afterEach(cleanup);

function Harness({ saveSystem }: { saveSystem: SaveSystem }) {
  return <>{useBaseController({ saveSystem })}</>;
}

/** Seeded repository: pre-populates specific run checkpoint tiers with raw envelopes, nothing else. */
function seededRepository(seed: Partial<Record<RunCheckpointTier, RunSaveEnvelope>>): SaveRepository {
  const run: Record<RunCheckpointTier, unknown> = {
    live: seed.live ?? null,
    zoneStart: seed.zoneStart ?? null,
    stageStart: seed.stageStart ?? null,
  };
  return {
    async loadPermanent() {
      return null;
    },
    async loadLearningHistory() {
      return null;
    },
    async loadRunCheckpoint(tier) {
      return run[tier];
    },
    async commit(batch: SaveBatch) {
      if (batch.runWrites) {
        for (const [tier, envelope] of Object.entries(batch.runWrites) as [RunCheckpointTier, unknown][]) {
          run[tier] = envelope;
        }
      }
      if (batch.clearRunTiers) {
        for (const tier of batch.clearRunTiers) run[tier] = null;
      }
    },
  };
}

function actor(overrides: Partial<BattleActor> & { id: string; definitionId: string; kind: 'player' | 'enemy' }): BattleActor {
  return { name: overrides.id, attack: 10, defense: 5, speed: 10, maxHp: 50, currentHp: 50, maxMp: 0, currentMp: 0, guard: null, ...overrides };
}

function snapshotWithEnemies(enemyActors: BattleActor[]): BattleEngineSnapshot {
  return {
    state: {
      phase: 'COMMAND_SELECT',
      players: [actor({ id: 'char_hero_placeholder', definitionId: 'char_hero_placeholder', kind: 'player' })],
      enemies: enemyActors,
      currentActorId: 'char_hero_placeholder',
      upcomingActorIds: [],
      timeline: { gauges: {} },
      pendingCommand: null,
      pendingTargetSelection: null,
      pendingOutcome: null,
      lastPlayerOutcome: null,
      lastNonQuestionOutcome: null,
      enemyActionLog: [],
      searchByEnemyId: {},
      battleItems: [],
      knownSpellsByPlayerId: {},
      outcome: null,
    },
    randomState: { algorithm: 'mulberry32', state: 1 },
    timelineRandomState: { algorithm: 'mulberry32', state: 2 },
    enemyPlannedActions: {},
    revealedCountByEnemyId: {},
    questionEngineSnapshot: { lastPicked: null },
  };
}

/** MVP-9's actual old zone_3_final (index 2) mid-battle: incompatible under MVP-10's 4-Zone Stage1. */
function incompatibleOldFinalZonePayload(): RunSavePayload {
  return {
    areaId: 'area_sample_placeholder',
    stageId: 'stage_sample_placeholder',
    resolvedParty: [
      { id: 'char_hero_placeholder', name: '主人公', baseStats: { attack: 24, defense: 8, speed: 12, maxHp: 60, maxMp: 5 }, initialSpellId: 'spell_firebolt_placeholder', additionalSpellPoolIds: [] },
    ],
    questionScope: [{ subject: '数学', field: '計算', unit: '四則演算' }],
    itemSlotSelection: [null, null, null],
    stageRunState: {
      stageId: 'stage_sample_placeholder',
      runSeed: 1,
      currentZoneIndex: 2,
      phase: 'ZONE_BATTLE',
      runState: { build: { characters: {} }, currentHpByCharacterId: {}, rewardPhase: null },
      clearedZoneIds: ['zone_1', 'zone_2'],
      battleItems: [],
      result: null,
    },
    liveBattleSnapshot: snapshotWithEnemies([
      actor({ id: 'zone3_slime_1', definitionId: 'enemy_slime_placeholder', kind: 'enemy' }),
      actor({ id: 'zone3_boss_1', definitionId: 'enemy_boss_ogre_placeholder', kind: 'enemy' }),
    ]),
    liveRewardSnapshot: null,
  };
}

/** A still-valid MVP-10 Zone1-start checkpoint (what a real `stageStart` tier looks like). */
function validZone1StartPayload(): RunSavePayload {
  return {
    areaId: 'area_sample_placeholder',
    stageId: 'stage_sample_placeholder',
    resolvedParty: [
      { id: 'char_hero_placeholder', name: '主人公', baseStats: { attack: 24, defense: 8, speed: 12, maxHp: 60, maxMp: 5 }, initialSpellId: 'spell_firebolt_placeholder', additionalSpellPoolIds: [] },
    ],
    questionScope: [{ subject: '数学', field: '計算', unit: '四則演算' }],
    itemSlotSelection: [null, null, null],
    stageRunState: {
      stageId: 'stage_sample_placeholder',
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
  };
}

function envelope(payload: RunSavePayload): RunSaveEnvelope {
  return { schemaVersion: RUN_SAVE_SCHEMA_VERSION, savedAt: 0, payload };
}

describe('useBaseController boot — MVP-9 3-Zone RunSave incompatibility never crashes or mis-resumes (acceptance audit item 1)', () => {
  it('an incompatible `live` tier alone (no zoneStart/stageStart) falls all the way through to Base Home — never crashes, never shows 途中から再開', async () => {
    const repo = seededRepository({ live: envelope(incompatibleOldFinalZonePayload()) });
    const saveSystem = createSaveSystem({ repository: repo, clock: { now: () => 0 } });
    render(<Harness saveSystem={saveSystem} />);

    await screen.findByRole('button', { name: '出撃' });
    expect(screen.queryByRole('button', { name: '途中から再開' })).toBeNull();
  });

  it('an incompatible `live` tier falls back to a still-valid `stageStart` tier — resumes from stageStart, not a mis-decoded live', async () => {
    const repo = seededRepository({
      live: envelope(incompatibleOldFinalZonePayload()),
      stageStart: envelope(validZone1StartPayload()),
    });
    const saveSystem = createSaveSystem({ repository: repo, clock: { now: () => 0 } });
    render(<Harness saveSystem={saveSystem} />);

    // RUN_RESUME_CHOICE should appear, backed by the compatible stageStart tier.
    expect(await screen.findByRole('button', { name: '途中から再開' })).toBeTruthy();
  });

  it('an incompatible `live` AND incompatible `zoneStart`, with a valid `stageStart`, still resumes from stageStart', async () => {
    const repo = seededRepository({
      live: envelope(incompatibleOldFinalZonePayload()),
      zoneStart: envelope(incompatibleOldFinalZonePayload()),
      stageStart: envelope(validZone1StartPayload()),
    });
    const saveSystem = createSaveSystem({ repository: repo, clock: { now: () => 0 } });
    render(<Harness saveSystem={saveSystem} />);

    expect(await screen.findByRole('button', { name: '途中から再開' })).toBeTruthy();
  });
});
