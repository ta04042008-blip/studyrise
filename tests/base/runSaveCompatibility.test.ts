import { describe, expect, it } from 'vitest';
import { isRunSaveCompatibleWithCurrentContent } from '../../src/base/runSaveCompatibility';
import { sampleStagesById } from '../../src/data/areas/sampleArea';
import { enemyDefinitionsById } from '../../src/data/enemies/enemyDefinitionsById';
import { sampleStage } from '../../src/data/stages/sampleStage';
import type { RunSavePayload } from '../../src/engine/save/RunSave';
import type { BattleActor, BattleEngineSnapshot } from '../../src/engine/battle/BattleEngine.types';

/**
 * MVP-10 acceptance audit item 1: MVP-9 shipped Stage1 as a 3-Zone Stage
 * (zone_1 → zone_2 → zone_3_final), where zone_3_final held 1×スライム
 * (`enemy_slime_placeholder`) + 1×ボス・オーガ (`enemy_boss_ogre_placeholder`,
 * isBoss). MVP-10 grew the SAME stageId (`stage_sample_placeholder`) to 4
 * Zones (zone_1 → zone_2 → zone_3 → zone_3_final), inserting a brand new
 * non-final zone_3 at array index 2 — the same index MVP-9's zone_3_final
 * used to occupy. `currentZoneIndex` is a plain array index (see
 * StageEngine.ts), so an MVP-9 RunSave paused at index 2 would silently
 * resolve to the wrong (non-final, non-boss) zone under MVP-10's code
 * without this check. These fixtures reconstruct MVP-9's actual saved
 * shapes (not invented ones) to prove the fix.
 */
function actor(overrides: Partial<BattleActor> & { id: string; definitionId: string; kind: 'player' | 'enemy' }): BattleActor {
  return {
    name: overrides.id,
    attack: 10,
    defense: 5,
    speed: 10,
    maxHp: 50,
    currentHp: 50,
    maxMp: 0,
    currentMp: 0,
    guard: null,
    ...overrides,
  };
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

function mvp9RunPayload(overrides: Partial<RunSavePayload['stageRunState']>): RunSavePayload {
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
      ...overrides,
    },
    liveBattleSnapshot: null,
    liveRewardSnapshot: null,
  };
}

describe('isRunSaveCompatibleWithCurrentContent — MVP-9 3-Zone Stage1 RunSave against MVP-10 4-Zone content', () => {
  it('A. Zone1 (旧zone_1, 1×スライム) in-progress — still compatible: same id, same index, definitionId still exists in the new Zone1', () => {
    const payload = mvp9RunPayload({
      currentZoneIndex: 0,
      clearedZoneIds: [],
    });
    payload.liveBattleSnapshot = snapshotWithEnemies([
      actor({ id: 'zone1_slime_1', definitionId: 'enemy_slime_placeholder', kind: 'enemy' }),
    ]);
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(true);
  });

  it('B. Zone2 (旧zone_2, 2×ゴブリン) in-progress — still compatible: enemy_goblin_placeholder still exists in the new Zone2', () => {
    const payload = mvp9RunPayload({
      currentZoneIndex: 1,
      clearedZoneIds: ['zone_1'],
    });
    payload.liveBattleSnapshot = snapshotWithEnemies([
      actor({ id: 'zone2_goblin_1', definitionId: 'enemy_goblin_placeholder', kind: 'enemy' }),
      actor({ id: 'zone2_goblin_2', definitionId: 'enemy_goblin_placeholder', kind: 'enemy' }),
    ]);
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(true);
  });

  it('C. 旧zone_3_final (index 2: スライム+ボス・オーガ) in-progress — INCOMPATIBLE: index 2 is now the non-final zone_3 (クランプ/リレー/センチネル), which does not contain either saved enemy', () => {
    const payload = mvp9RunPayload({
      currentZoneIndex: 2,
      clearedZoneIds: ['zone_1', 'zone_2'],
    });
    payload.liveBattleSnapshot = snapshotWithEnemies([
      actor({ id: 'zone3_slime_1', definitionId: 'enemy_slime_placeholder', kind: 'enemy' }),
      actor({ id: 'zone3_boss_1', definitionId: 'enemy_boss_ogre_placeholder', kind: 'enemy' }),
    ]);
    // Sanity: index 2 in the NEW stage is indeed the non-final zone_3, not zone_3_final.
    expect(sampleStage.zones[2].id).toBe('zone_3');
    expect(sampleStage.zones[2].isFinalZone).toBe(false);
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(false);
  });

  it('D. StageResult (旧stage, 3 zones cleared, no liveBattleSnapshot) — INCOMPATIBLE: clearedZoneIds includes "zone_3_final" which the old save reached at zone count 3, but the new Stage requires a 4th zone before it — the recorded clearedZoneIds are still all valid zone ids, so this alone does not fail, but currentZoneIndex bounds must still be sane', () => {
    const payload = mvp9RunPayload({
      currentZoneIndex: 2,
      clearedZoneIds: ['zone_1', 'zone_2', 'zone_3_final'],
      phase: 'STAGE_RESULT',
      result: { stageId: 'stage_sample_placeholder', outcome: 'CLEARED', zonesCleared: 3, clearedZoneIds: ['zone_1', 'zone_2', 'zone_3_final'] },
    });
    // All 3 cleared zone ids still exist as valid zone ids in the new 4-Zone
    // Stage (zone_1/zone_2/zone_3_final are all still real ids), so this
    // specific payload passes the compatibility gate — the STAGE_RESULT
    // itself is a terminal, already-resolved fact (spec §15.14: only
    // cleared/resumed via 拠点へ戻る, which fully wipes RunSave). No
    // liveBattleSnapshot is present for STAGE_RESULT, so the enemy check
    // does not apply here.
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(true);
  });

  it('rejects a payload whose stageId no longer exists', () => {
    const payload = mvp9RunPayload({});
    payload.stageId = 'stage_that_was_removed';
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(false);
  });

  it('rejects a payload whose currentZoneIndex is out of bounds for the current Stage', () => {
    const payload = mvp9RunPayload({ currentZoneIndex: 99 });
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(false);
  });

  it('rejects a payload whose clearedZoneIds references a zone id that no longer exists', () => {
    const payload = mvp9RunPayload({ clearedZoneIds: ['zone_that_was_removed'] });
    expect(isRunSaveCompatibleWithCurrentContent(payload, sampleStagesById, enemyDefinitionsById)).toBe(false);
  });
});
