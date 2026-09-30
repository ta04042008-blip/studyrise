import { describe, expect, it } from 'vitest';
import { progressionConfig, UPGRADE_MATERIAL_ID } from '../../../src/config/progressionConfig';
import type { ProgressionConfig } from '../../../src/config/progressionConfig';
import type { StageDefinition, StageResult } from '../../../src/engine/stage/StageEngine.types';
import type { StageEndContext, CharacterUnlockRule, StageUnlockRule } from '../../../src/engine/progression/ProgressionSystem.types';
import {
  makeDeterministicInstanceIdFactory,
  makeTestPermanentState,
  makeTestProgressionSystem,
  testCharacterA,
  testCharacterB,
  testWeaponNormal,
} from './fixtures';
import { createProgressionSystem } from '../../../src/engine/progression/ProgressionSystem';

/**
 * A deliberately separate, simplified ProgressionConfig for reconcile
 * mechanism tests (guaranteed 100% equipment drop, round exp/currency/
 * material numbers) — kept independent of the real decision-doc numbers
 * (verified separately in progressionConfigValues.test.ts) so these tests
 * exercise the MECHANISM, not memorized magic numbers.
 */
const testProgressionConfig: ProgressionConfig = {
  ...progressionConfig,
  zoneRewardProfiles: {
    TEST_NORMAL: {
      id: 'TEST_NORMAL',
      expPerCharacter: 10,
      currency: 20,
      material: 3,
      equipmentDropChance: 1, // guaranteed, for deterministic drop assertions
      equipmentDropTableId: 'test_drop_table',
    },
    TEST_NO_DROP: {
      id: 'TEST_NO_DROP',
      expPerCharacter: 5,
      currency: 10,
      material: 1,
      equipmentDropChance: 0,
      equipmentDropTableId: 'test_drop_table',
    },
  },
  stageClearBonus: { currency: 100, material: 5 },
  firstClearBonus: { rareUnlockResource: 1 },
  defeatLoss: { defeatResourceLossRate: 0.3 },
};

const testDropTablesById = {
  test_drop_table: { id: 'test_drop_table', entries: [{ equipmentDefinitionId: testWeaponNormal.id, weight: 1 }] },
};

function oneZoneStage(profileId: string, stageId = 'stage_1', zoneId = 'zone_1'): StageDefinition {
  return {
    id: stageId,
    name: 'Test Stage',
    zones: [
      {
        id: zoneId,
        enemies: [{ enemyDefinitionId: 'enemy_x', instanceId: 'e1' }],
        isRareRewardEvent: false,
        permanentRewardProfileId: profileId,
        isFinalZone: true,
      },
    ],
  };
}

function makeStageResult(overrides: Partial<StageResult> & { outcome: StageResult['outcome']; clearedZoneIds: string[] }): StageResult {
  return { stageId: 'stage_1', zonesCleared: overrides.clearedZoneIds.length, ...overrides };
}

function makeEndContext(overrides: Partial<StageEndContext> & { stageResult: StageResult; stage: StageDefinition }): StageEndContext {
  return { partyCharacterIds: [testCharacterA.id], runSeed: 1, consumedItemCounts: {}, ...overrides };
}

describe('reconcileStageResult — Zone EXP/currency/material (decision doc §3)', () => {
  it('grants EXP/currency/material for each cleared zone to every deployed character', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const permanentState = makeTestPermanentState();
    const stage = oneZoneStage('TEST_NO_DROP');
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage,
      partyCharacterIds: [testCharacterA.id, testCharacterB.id],
    });

    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(permanentState, context);
    expect(next.characters[testCharacterA.id].exp).toBe(5);
    expect(next.characters[testCharacterB.id].exp).toBe(5);
    expect(next.currency).toBe(10);
    expect(next.materials[UPGRADE_MATERIAL_ID]).toBe(1);
    expect(summary.levelUps).toHaveLength(2);
  });

  it('a character not in partyCharacterIds (non-deployed) gains no EXP', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const permanentState = makeTestPermanentState();
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'),
      partyCharacterIds: [testCharacterA.id], // charB not deployed
    });
    const { permanentState: next } = progressionSystem.reconcileStageResult(permanentState, context);
    expect(next.characters[testCharacterA.id].exp).toBe(5);
    expect(next.characters[testCharacterB.id].exp).toBe(0);
  });

  it('a KO character deployed for the stage still gains EXP — KO status is never part of StageEndContext, so it cannot suppress it', () => {
    // partyCharacterIds represents "出撃キャラ全員" regardless of KO state at
    // any point during the run — there is no separate "who was KO'd" input
    // to reconcileStageResult, which is exactly what makes "KO中でもEXPを
    // 得る" true by construction rather than by a special case.
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const permanentState = makeTestPermanentState();
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'),
      partyCharacterIds: [testCharacterA.id],
    });
    const { permanentState: next } = progressionSystem.reconcileStageResult(permanentState, context);
    expect(next.characters[testCharacterA.id].exp).toBeGreaterThan(0);
  });

  it('BOSS-style profile grants more than a normal zone profile (relative check, not a magic number)', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const normalResult = progressionSystem.reconcileStageResult(
      makeTestPermanentState(),
      makeEndContext({
        stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
        stage: oneZoneStage('TEST_NO_DROP'),
      }),
    );
    const richResult = progressionSystem.reconcileStageResult(
      makeTestPermanentState(),
      makeEndContext({
        stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
        stage: oneZoneStage('TEST_NORMAL'),
      }),
    );
    expect(richResult.permanentState.characters[testCharacterA.id].exp).toBeGreaterThan(
      normalResult.permanentState.characters[testCharacterA.id].exp,
    );
  });
});

describe('reconcileStageResult — Stage Clear bonus and first-clear reward (decision doc §4)', () => {
  it('Stage Clear grants the stage-clear currency/material bonus with no extra EXP', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const permanentState = makeTestPermanentState();
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'CLEARED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'),
    });
    const { permanentState: next } = progressionSystem.reconcileStageResult(permanentState, context);
    // zone gain (10 currency / 1 material) + stage clear bonus (100 / 5).
    expect(next.currency).toBe(110);
    expect(next.materials[UPGRADE_MATERIAL_ID]).toBe(6);
    expect(next.characters[testCharacterA.id].exp).toBe(5); // EXP only from the zone, never boosted by Stage Clear
  });

  it('first clear grants rareUnlockResource and marks clearedStageIds; a repeat clear does not', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const stage = oneZoneStage('TEST_NO_DROP');
    const firstContext = makeEndContext({ stageResult: makeStageResult({ outcome: 'CLEARED', clearedZoneIds: ['zone_1'] }), stage });
    const first = progressionSystem.reconcileStageResult(makeTestPermanentState(), firstContext);
    expect(first.summary.isFirstClear).toBe(true);
    expect(first.permanentState.rareUnlockResource).toBe(1);
    expect(first.permanentState.clearedStageIds).toEqual(['stage_1']);

    const secondContext = makeEndContext({ stageResult: makeStageResult({ outcome: 'CLEARED', clearedZoneIds: ['zone_1'] }), stage });
    const second = progressionSystem.reconcileStageResult(first.permanentState, secondContext);
    expect(second.summary.isFirstClear).toBe(false);
    expect(second.permanentState.rareUnlockResource).toBe(1); // unchanged
    expect(second.permanentState.clearedStageIds).toEqual(['stage_1']); // not duplicated
    // Repeat clear still earns normal currency/material (spec §2.4 "周回クリア報酬は取得可能").
    expect(second.permanentState.currency).toBeGreaterThan(first.permanentState.currency);
  });
});

describe('reconcileStageResult — Self Return / Defeat retention rules (decision doc §5)', () => {
  it('Self Return retains 100% of everything gained this attempt', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NORMAL'),
    });
    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(makeTestPermanentState(), context);
    expect(next.currency).toBe(20); // full zone gain, no loss
    expect(next.materials[UPGRADE_MATERIAL_ID]).toBe(3);
    expect(summary.currencyLostToDefeat).toBe(0);
    expect(summary.equipmentDropped).toHaveLength(1); // guaranteed drop, fully kept
  });

  it('Defeat keeps EXP and equipment 100%, but loses floor(30%) of THIS RUN\'S currency/material only', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const existingPermanentState = makeTestPermanentState({ currency: 500, materials: { [UPGRADE_MATERIAL_ID]: 50 } });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'DEFEATED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NORMAL'), // currency 20, material 3 gained this run
    });
    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(existingPermanentState, context);

    // loss = floor(20 * 0.3) = 6 → net +14. floor(3 * 0.3) = 0 → net +3.
    expect(summary.currencyLostToDefeat).toBe(6);
    expect(summary.materialLostToDefeat).toBe(0);
    expect(next.currency).toBe(500 + 14);
    expect(next.materials[UPGRADE_MATERIAL_ID]).toBe(50 + 3);
    // EXP and equipment drop are never touched by the loss.
    expect(next.characters[testCharacterA.id].exp).toBe(10);
    expect(summary.equipmentDropped).toHaveLength(1);
    expect(next.inventory.equipment).toHaveLength(1);
  });

  it('Defeat never reduces PermanentState assets that already existed before this attempt', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const existingEquipment = [{ instanceId: 'preexisting', definitionId: testWeaponNormal.id, enhancementLevel: 3, locked: false }];
    const existingPermanentState = makeTestPermanentState({
      currency: 1000,
      materials: { [UPGRADE_MATERIAL_ID]: 100 },
      rareUnlockResource: 7,
      inventory: { equipment: existingEquipment, consumables: {} },
    });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'DEFEATED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'), // no drop this run
    });
    const { permanentState: next } = progressionSystem.reconcileStageResult(existingPermanentState, context);
    expect(next.currency).toBeGreaterThanOrEqual(1000); // never below the pre-existing amount
    expect(next.materials[UPGRADE_MATERIAL_ID]).toBeGreaterThanOrEqual(100);
    expect(next.rareUnlockResource).toBe(7); // defeat never grants/removes rareUnlockResource
    expect(next.inventory.equipment).toContainEqual(existingEquipment[0]);
  });

  it('Defeat never grants the first-clear reward even on a stage never cleared before', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'DEFEATED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'),
    });
    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(makeTestPermanentState(), context);
    expect(summary.isFirstClear).toBe(false);
    expect(next.clearedStageIds).toEqual([]);
  });
});

describe('reconcileStageResult — completed-lap clear credit', () => {
  it('self-return after one completed lap grants first-clear credit and stage-clear bonus', () => {
    const progressionSystem = makeTestProgressionSystem({
      config: testProgressionConfig,
      equipmentDropTablesById: testDropTablesById,
    });
    const permanentState = makeTestPermanentState();
    const stage = oneZoneStage('TEST_NO_DROP');
    const context = makeEndContext({
      stageResult: makeStageResult({
        outcome: 'SELF_RETURNED',
        completedLaps: 1,
        clearedZoneIds: ['zone_1'],
      }),
      stage,
    });

    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(permanentState, context);

    expect(summary.isFirstClear).toBe(true);
    expect(next.clearedStageIds).toContain(stage.id);
    expect(summary.currencyGained).toBe(
      testProgressionConfig.zoneRewardProfiles.TEST_NO_DROP.currency + testProgressionConfig.stageClearBonus.currency,
    );
    expect(summary.rareUnlockResourceGained).toBe(testProgressionConfig.firstClearBonus.rareUnlockResource);
  });

  it('defeat on a later lap still preserves first-clear credit from an already completed lap', () => {
    const progressionSystem = makeTestProgressionSystem({
      config: testProgressionConfig,
      equipmentDropTablesById: testDropTablesById,
    });
    const permanentState = makeTestPermanentState();
    const stage = oneZoneStage('TEST_NO_DROP');
    const context = makeEndContext({
      stageResult: makeStageResult({
        outcome: 'DEFEATED',
        completedLaps: 1,
        clearedZoneIds: ['zone_1'],
      }),
      stage,
    });

    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(permanentState, context);

    expect(summary.isFirstClear).toBe(true);
    expect(next.clearedStageIds).toContain(stage.id);
    expect(summary.rareUnlockResourceGained).toBe(testProgressionConfig.firstClearBonus.rareUnlockResource);
  });
});

describe('reconcileStageResult — character/stage unlock rules (decision doc §12/§13)', () => {
  const unlockStageId = 'stage_unlocker';
  const lockedCharacterId = 'char_locked';
  const lockedStageId = 'stage_locked_content';

  function progressionSystemWithUnlocks() {
    const characterUnlockRules: CharacterUnlockRule[] = [
      { type: 'STAGE_FIRST_CLEAR', stageId: unlockStageId, characterId: lockedCharacterId },
    ];
    const stageUnlockRules: StageUnlockRule[] = [{ type: 'STAGE_FIRST_CLEAR', stageId: unlockStageId, unlocksStageIds: [lockedStageId] }];
    return createProgressionSystem({
      config: testProgressionConfig,
      growthProfileByCharacterId: {},
      equipmentDefsById: {},
      equipmentDropTablesById: testDropTablesById,
      characterUnlockRules,
      stageUnlockRules,
      instanceIdFactory: makeDeterministicInstanceIdFactory(),
    });
  }

  it('unlocks the configured character/stage on first clear of the trigger stage', () => {
    const progressionSystem = progressionSystemWithUnlocks();
    const stage = oneZoneStage('TEST_NO_DROP', unlockStageId);
    const context = makeEndContext({
      stageResult: makeStageResult({ stageId: unlockStageId, outcome: 'CLEARED', clearedZoneIds: ['zone_1'] }),
      stage,
    });
    const { permanentState: next, summary } = progressionSystem.reconcileStageResult(makeTestPermanentState(), context);
    expect(next.unlockedCharacterIds).toContain(lockedCharacterId);
    expect(next.unlockedStageIds).toContain(lockedStageId);
    expect(summary.unlockedCharacterIds).toEqual([lockedCharacterId]);
    expect(summary.unlockedStageIds).toEqual([lockedStageId]);
  });

  it('a repeat clear of the trigger stage does not re-report the unlock', () => {
    const progressionSystem = progressionSystemWithUnlocks();
    const stage = oneZoneStage('TEST_NO_DROP', unlockStageId);
    const context = makeEndContext({
      stageResult: makeStageResult({ stageId: unlockStageId, outcome: 'CLEARED', clearedZoneIds: ['zone_1'] }),
      stage,
    });
    const first = progressionSystem.reconcileStageResult(makeTestPermanentState(), context);
    const second = progressionSystem.reconcileStageResult(first.permanentState, context);
    expect(second.summary.unlockedCharacterIds).toEqual([]);
    expect(second.summary.unlockedStageIds).toEqual([]);
  });
});

describe('reconcileStageResult — consumable Inventory deduction (decision doc §14)', () => {
  it('deducts only the consumed count, never touching unused stock', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [], consumables: { potion: 5 } } });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'),
      consumedItemCounts: { potion: 2 },
    });
    const { permanentState: next } = progressionSystem.reconcileStageResult(permanentState, context);
    expect(next.inventory.consumables.potion).toBe(3);
  });

  it('never touches an item that was not consumed at all', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [], consumables: { potion: 5, ether: 2 } } });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NO_DROP'),
      consumedItemCounts: { potion: 1 },
    });
    const { permanentState: next } = progressionSystem.reconcileStageResult(permanentState, context);
    expect(next.inventory.consumables.ether).toBe(2);
  });

  it('applies the same consumption rule on Stage Clear, Defeat, and Self Return alike', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    for (const outcome of ['CLEARED', 'DEFEATED', 'SELF_RETURNED'] as const) {
      const permanentState = makeTestPermanentState({ inventory: { equipment: [], consumables: { potion: 5 } } });
      const context = makeEndContext({
        stageResult: makeStageResult({ outcome, clearedZoneIds: ['zone_1'] }),
        stage: oneZoneStage('TEST_NO_DROP'),
        consumedItemCounts: { potion: 2 },
      });
      const { permanentState: next } = progressionSystem.reconcileStageResult(permanentState, context);
      expect(next.inventory.consumables.potion).toBe(3);
    }
  });
});

describe('reconcileStageResult — equipment drop RNG (decision doc §11)', () => {
  it('is fully determined by runSeed + zoneId — the same runSeed reproduces the identical drop table roll', () => {
    // Two separate ProgressionSystem instances (each with its own fresh
    // instanceIdFactory) so this isolates the DROP RNG's determinism from
    // instanceId generation, which is intentionally its own independent,
    // stateful concern (decision doc §11) — production's crypto.randomUUID()
    // factory is never expected to repeat, only the drop-table roll itself is.
    const stage = oneZoneStage('TEST_NORMAL');
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage,
      runSeed: 42,
    });
    const runA = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById }).reconcileStageResult(
      makeTestPermanentState(),
      context,
    );
    const runB = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById }).reconcileStageResult(
      makeTestPermanentState(),
      context,
    );
    expect(runA.summary.equipmentDropped.map((d) => d.equipmentDefinitionId)).toEqual(
      runB.summary.equipmentDropped.map((d) => d.equipmentDefinitionId),
    );
  });

  it('a zero-chance profile never drops equipment even across many different seeds', () => {
    const progressionSystem = makeTestProgressionSystem({ config: testProgressionConfig, equipmentDropTablesById: testDropTablesById });
    const stage = oneZoneStage('TEST_NO_DROP');
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const context = makeEndContext({
        stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
        stage,
        runSeed: seed,
      });
      const { summary } = progressionSystem.reconcileStageResult(makeTestPermanentState(), context);
      expect(summary.equipmentDropped).toHaveLength(0);
    }
  });

  it('instanceId generation is independent of the drop RNG (decision doc §11) — the injected factory alone determines ids', () => {
    let factoryCalls = 0;
    const progressionSystem = createProgressionSystem({
      config: testProgressionConfig,
      growthProfileByCharacterId: {},
      equipmentDefsById: {},
      equipmentDropTablesById: testDropTablesById,
      characterUnlockRules: [],
      stageUnlockRules: [],
      instanceIdFactory: () => `fixed_id_${++factoryCalls}`,
    });
    const context = makeEndContext({
      stageResult: makeStageResult({ outcome: 'SELF_RETURNED', clearedZoneIds: ['zone_1'] }),
      stage: oneZoneStage('TEST_NORMAL'),
    });
    const { summary } = progressionSystem.reconcileStageResult(makeTestPermanentState(), context);
    expect(summary.equipmentDropped[0].instanceId).toBe('fixed_id_1');
  });
});
