import { describe, expect, it } from 'vitest';
import { createStageEngine } from '../../../src/engine/stage/StageEngine';
import type { StageDefinition } from '../../../src/engine/stage/StageEngine.types';
import type { StageConfig } from '../../../src/config/stageConfig';
import { createRogueliteEngine, type RogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import type { RewardSession, RunState } from '../../../src/engine/roguelite/RogueliteEngine.types';
import { createRandomService, deriveSeed } from '../../../src/engine/random/RandomService';
import type { CharacterDefinition, EnemyDefinition, ItemBattleSlot } from '../../../src/engine/battle/BattleEngine.types';
import {
  testCharacterA,
  testConfig,
  testParty,
  testRewardDefinitions,
  testSpellsById,
} from '../roguelite/fixtures';

const testStageConfig: StageConfig = { officialZoneCount: 10, enemyStatMultiplierPerLap: 1.5, koReviveHpPercent: 0.3 };
const stageEngine = createStageEngine({ config: testStageConfig });

/** No departure items needed for these fixtures — StageEngine's item-pool threading is covered by its own dedicated test file. */
const NO_ITEMS: ItemBattleSlot[] = [];

function makeRunResolver(seed = 0): RogueliteEngine {
  return createRogueliteEngine({
    spellsById: testSpellsById,
    rewardDefinitions: testRewardDefinitions,
    config: testConfig,
    random: createRandomService(seed),
  });
}

const normalEnemy: EnemyDefinition = {
  id: 'enemy_normal',
  name: 'Slime',
  baseStats: { attack: 5, defense: 2, speed: 5, maxHp: 20 },
};
const bossEnemy: EnemyDefinition = {
  id: 'enemy_boss',
  name: 'Boss',
  isBoss: true,
  baseStats: { attack: 10, defense: 5, speed: 8, maxHp: 100 },
};
const enemyDefinitionsById: Record<string, EnemyDefinition> = {
  [normalEnemy.id]: normalEnemy,
  [bossEnemy.id]: bossEnemy,
};

const oneZoneStage: StageDefinition = {
  id: 'stage_one_zone',
  name: '1-Zone Stage',
  zones: [
    {
      id: 'zone_1_final',
      enemies: [{ enemyDefinitionId: bossEnemy.id, instanceId: 'boss_1' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};

const threeZoneStage: StageDefinition = {
  id: 'stage_three_zone',
  name: '3-Zone Stage',
  zones: [
    {
      id: 'zone_1',
      enemies: [{ enemyDefinitionId: normalEnemy.id, instanceId: 'z1_e1' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_2',
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e1' },
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e2' }, // same species twice
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_3_final',
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z3_e1' },
        { enemyDefinitionId: bossEnemy.id, instanceId: 'z3_boss' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};

/** Drives every deployed character's reward selection to completion, picking each one's first offered candidate, and returns the final RunState (with rewardPhase.complete === true). */
function completeRewardPhase(
  rogueliteEngine: RogueliteEngine,
  party: CharacterDefinition[],
  runState: RunState,
  isRareRewardEvent: boolean,
): RunState {
  let phase = rogueliteEngine.startRewardPhase(party, runState.build, isRareRewardEvent);
  let rs = runState;
  while (!phase.complete) {
    const candidateKey = phase.currentRewardSession.candidates[0].candidateKey;
    phase = rogueliteEngine.selectCandidate(phase, candidateKey);
    const result = rogueliteEngine.confirmAndApply(phase, rs, party);
    phase = result.phase;
    rs = result.runState;
  }
  return rs;
}

describe('StageEngine — createInitialState / retry', () => {
  it('always starts at Zone 1, phase ZONE_BATTLE, with a fresh default RunBuild', () => {
    const runResolver = makeRunResolver();
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    expect(state.currentZoneIndex).toBe(0);
    expect(state.completedLaps).toBe(0);
    expect(state.phase).toBe('ZONE_BATTLE');
    expect(state.result).toBeNull();
    expect(state.clearedZoneIds).toEqual([]);
    expect(stageEngine.currentZone(threeZoneStage, state).id).toBe('zone_1');
    for (const c of testParty) {
      expect(state.runState.build.characters[c.id].knownSpells).toHaveLength(1);
    }
  });
});

describe('StageEngine — Zone resolution (enemyDefinitionId vs instanceId, MVP-5 correction 1)', () => {
  it('resolves each EnemyInstanceDefinition to a BattleEngine-ready instance keeping both ids', () => {
    const runResolver = makeRunResolver();
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    // Advance to zone_2 (same-species-twice zone) by simulating a win + full reward + continue.
    const afterWin = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 100 }, NO_ITEMS);
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, afterWin.runState, false);
    const synced = stageEngine.updateRunState(afterWin, rewardedRunState);
    const afterReward = stageEngine.completeZoneReward(threeZoneStage, synced, testParty, runResolver);
    expect(afterReward.phase).toBe('INTER_ZONE_CHOICE');
    const nextZoneState = stageEngine.continueToNextZone(threeZoneStage, afterReward, testParty, runResolver);
    expect(stageEngine.currentZone(threeZoneStage, nextZoneState).id).toBe('zone_2');

    const enemies = stageEngine.resolveZoneEnemies(threeZoneStage, nextZoneState, enemyDefinitionsById);
    expect(enemies).toHaveLength(2);
    expect(enemies.map((e) => e.instanceId).sort()).toEqual(['z2_e1', 'z2_e2']);
    for (const e of enemies) {
      expect(e.definition.id).toBe(normalEnemy.id); // both share the same stable content definition
    }
    expect(normalEnemy.id).toBe('enemy_normal'); // EnemyDefinition.id itself was never overwritten
  });
});

describe('StageEngine — seed derivation (MVP-5 correction 3)', () => {
  it('battle/reward seeds are derived from runSeed + zone id, independent of each other', () => {
    const runResolver = makeRunResolver();
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 123, runResolver, NO_ITEMS);
    const battleSeed = stageEngine.deriveZoneBattleSeed(threeZoneStage, state);
    const rewardSeed = stageEngine.deriveZoneRewardSeed(threeZoneStage, state);
    expect(battleSeed).toBe(deriveSeed(123, 'zone_1', 'battle'));
    expect(rewardSeed).toBe(deriveSeed(123, 'zone_1', 'reward'));
    expect(battleSeed).not.toBe(rewardSeed);
  });

  it('the same runSeed reproduces identical per-zone seeds across two independent StageEngine runs', () => {
    const runResolver = makeRunResolver();
    const stateA = stageEngine.createInitialState(threeZoneStage, testParty, 7, runResolver, NO_ITEMS);
    const stateB = stageEngine.createInitialState(threeZoneStage, testParty, 7, runResolver, NO_ITEMS);
    expect(stageEngine.deriveZoneBattleSeed(threeZoneStage, stateA)).toBe(
      stageEngine.deriveZoneBattleSeed(threeZoneStage, stateB),
    );
  });

  it('a different runSeed on the same stage yields different per-zone seeds', () => {
    const runResolver = makeRunResolver();
    const stateA = stageEngine.createInitialState(threeZoneStage, testParty, 7, runResolver, NO_ITEMS);
    const stateB = stageEngine.createInitialState(threeZoneStage, testParty, 8, runResolver, NO_ITEMS);
    expect(stageEngine.deriveZoneBattleSeed(threeZoneStage, stateA)).not.toBe(
      stageEngine.deriveZoneBattleSeed(threeZoneStage, stateB),
    );
  });
});

describe('StageEngine — HP carryover and KO revival', () => {
  it("a survivor's HP carries into the next zone unchanged", () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 42, charB: 100 }, NO_ITEMS);
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);
    expect(state.runState.currentHpByCharacterId[testCharacterA.id]).toBe(42);
  });

  it('a KO\'d (0 HP) character revives at ceil(effectiveMaxHp * 30%) at the next zone, minimum 1', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    // testCharacterA.baseStats.maxHp === 100 → 30% == 30 exactly.
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 0, charB: 100 }, NO_ITEMS);
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);
    expect(state.runState.currentHpByCharacterId[testCharacterA.id]).toBe(30);
    expect(state.runState.currentHpByCharacterId['charB']).toBe(100); // survivor untouched
  });

  it('revival uses effectiveMaxHp (RunBuild HP boosts included), not the raw base maxHp — via the same resolveBattleInputsForRun single source', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, [testCharacterA], 1, runResolver, NO_ITEMS);
    // Manually grant a +10 HP temp-stat-boost stack, matching what RogueliteEngine's own applyRewardToBuild would do.
    state = {
      ...state,
      runState: {
        ...state.runState,
        build: {
          characters: {
            [testCharacterA.id]: {
              ...state.runState.build.characters[testCharacterA.id],
              tempStatBoosts: { hp: 1 }, // testConfig.tempStatBoostPerLevel.hp === 10
            },
          },
        },
      },
    };
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 0 }, NO_ITEMS);
    // Synthesize an already-complete, no-op reward phase (bypassing real
    // candidate generation) so this test's only variable is the HP boost
    // already on the build, not whatever reward would randomly be rolled.
    const dummySession: RewardSession = {
      targetCharacterId: testCharacterA.id,
      isRareRewardEvent: false,
      candidates: [],
      rerollRemaining: 0,
      status: 'APPLIED',
      selectedCandidateKey: null,
    };
    state = stageEngine.updateRunState(state, {
      ...state.runState,
      rewardPhase: {
        characterOrder: [testCharacterA.id],
        currentCharacterIndex: 0,
        isRareRewardEvent: false,
        complete: true,
        currentRewardSession: dummySession,
      },
    });
    state = stageEngine.completeZoneReward(threeZoneStage, state, [testCharacterA], runResolver);
    state = stageEngine.continueToNextZone(threeZoneStage, state, [testCharacterA], runResolver);
    // effectiveMaxHp = 100 (base) + 10 (boost) = 110 → ceil(110 * 0.3) = 33.
    expect(state.runState.currentHpByCharacterId[testCharacterA.id]).toBe(33);
  });
});

describe('StageEngine — RunBuild persistence and reward reflection', () => {
  it('RunBuild is preserved across zone transitions (not reset) until the stage ends', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);

    // Whatever reward each character picked in zone_1 must still be present in RunBuild at zone_2's start.
    const buildAfterZone1 = state.runState.build;
    const nonTrivial = testParty.some(
      (c) =>
        buildAfterZone1.characters[c.id].knownSpells.length > 1 ||
        Object.keys(buildAfterZone1.characters[c.id].commandBoosts).length > 0 ||
        Object.keys(buildAfterZone1.characters[c.id].tempStatBoosts).length > 0 ||
        buildAfterZone1.characters[c.id].knownSpells.some((s) => s.level > 1),
    );
    expect(nonTrivial).toBe(true);
  });

  it('ZoneDefinition.isRareRewardEvent controls the candidate count offered for that zone', () => {
    const runResolver = makeRunResolver();
    const normalPhase = runResolver.startRewardPhase(testParty, runResolver.createInitialRunState(testParty).build, false);
    const rarePhase = runResolver.startRewardPhase(testParty, runResolver.createInitialRunState(testParty).build, true);
    expect(normalPhase.currentRewardSession.candidates).toHaveLength(testConfig.candidateCountNormal);
    expect(rarePhase.currentRewardSession.candidates).toHaveLength(testConfig.candidateCountRareEvent);
  });
});

describe('StageEngine — self-return', () => {
  it('is impossible during ZONE_BATTLE (no-op)', () => {
    const runResolver = makeRunResolver();
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    expect(state.phase).toBe('ZONE_BATTLE');
    const afterAttempt = stageEngine.selfReturn(state, testParty, runResolver);
    expect(afterAttempt).toBe(state); // untouched — structurally still ZONE_BATTLE
  });

  it('is impossible during ZONE_REWARD (no-op)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    expect(state.phase).toBe('ZONE_REWARD');
    const afterAttempt = stageEngine.selfReturn(state, testParty, runResolver);
    expect(afterAttempt).toBe(state);
  });

  it('from INTER_ZONE_CHOICE, ends the stage as SELF_RETURNED and discards RunBuild', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    expect(state.phase).toBe('INTER_ZONE_CHOICE');

    // Prove the build is non-default before self-returning, so the reset assertion below is meaningful.
    const defaultBuild = runResolver.createDefaultRunBuild(testParty);
    expect(state.runState.build).not.toEqual(defaultBuild);

    state = stageEngine.selfReturn(state, testParty, runResolver);
    expect(state.phase).toBe('STAGE_RESULT');
    expect(state.result).toEqual({
      stageId: threeZoneStage.id,
      outcome: 'SELF_RETURNED',
      zonesCleared: 1,
      completedLaps: 0,
      clearedZoneIds: ['zone_1'],
    });
    expect(state.runState.build).toEqual(defaultBuild);
  });
});

describe('StageEngine — defeat', () => {
  it('any zone defeat ends the stage as DEFEATED and discards RunBuild', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneDefeat(state, testParty, runResolver, NO_ITEMS);
    expect(state.phase).toBe('STAGE_RESULT');
    expect(state.result).toEqual({ stageId: threeZoneStage.id, outcome: 'DEFEATED', zonesCleared: 0, completedLaps: 0, clearedZoneIds: [] });
    expect(state.runState.build).toEqual(runResolver.createDefaultRunBuild(testParty));
  });

  it('is impossible outside ZONE_BATTLE (no-op)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    const afterAttempt = stageEngine.recordZoneDefeat(state, testParty, runResolver, NO_ITEMS);
    expect(afterAttempt).toBe(state);
  });
});

describe('StageEngine — final Zone / lap looping', () => {
  it('a final-zone reward completes one lap, preserves RunBuild, and offers an inter-zone choice', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(oneZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(oneZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    const buildBeforeLapBoundary = state.runState.build;
    state = stageEngine.completeZoneReward(oneZoneStage, state, testParty, runResolver);

    expect(state.phase).toBe('INTER_ZONE_CHOICE');
    expect(state.completedLaps).toBe(1);
    expect(state.result).toBeNull();
    expect(state.runState.build).toEqual(buildBeforeLapBoundary);
  });

  it('continuing after the final zone wraps to Zone 1 and compounds all enemy base stats by 1.5x per completed lap', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(oneZoneStage, testParty, 7, runResolver, NO_ITEMS);
    const firstLapEnemy = stageEngine.resolveZoneEnemies(oneZoneStage, state, enemyDefinitionsById)[0];
    const firstLapBattleSeed = stageEngine.deriveZoneBattleSeed(oneZoneStage, state);

    state = stageEngine.recordZoneWin(oneZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    const rewarded = completeRewardPhase(makeRunResolver(7), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewarded);
    state = stageEngine.completeZoneReward(oneZoneStage, state, testParty, runResolver);
    state = stageEngine.continueToNextZone(oneZoneStage, state, testParty, runResolver);

    expect(state.currentZoneIndex).toBe(0);
    expect(state.completedLaps).toBe(1);
    expect(state.phase).toBe('ZONE_BATTLE');
    const secondLapEnemy = stageEngine.resolveZoneEnemies(oneZoneStage, state, enemyDefinitionsById)[0];
    expect(secondLapEnemy.definition.baseStats).toEqual({
      attack: Math.ceil(firstLapEnemy.definition.baseStats.attack * 1.5),
      defense: Math.ceil(firstLapEnemy.definition.baseStats.defense * 1.5),
      speed: Math.ceil(firstLapEnemy.definition.baseStats.speed * 1.5),
      maxHp: Math.ceil(firstLapEnemy.definition.baseStats.maxHp * 1.5),
    });
    expect(stageEngine.deriveZoneBattleSeed(oneZoneStage, state)).not.toBe(firstLapBattleSeed);

    const thirdLapState = { ...state, completedLaps: 2 };
    const thirdLapEnemy = stageEngine.resolveZoneEnemies(oneZoneStage, thirdLapState, enemyDefinitionsById)[0];
    expect(thirdLapEnemy.definition.baseStats).toEqual({
      attack: Math.ceil(firstLapEnemy.definition.baseStats.attack * 2.25),
      defense: Math.ceil(firstLapEnemy.definition.baseStats.defense * 2.25),
      speed: Math.ceil(firstLapEnemy.definition.baseStats.speed * 2.25),
      maxHp: Math.ceil(firstLapEnemy.definition.baseStats.maxHp * 2.25),
    });
  });

  it('return after a completed lap records a CLEARED result with the lap and total cleared-zone count', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(oneZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(oneZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    const rewarded = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewarded);
    state = stageEngine.completeZoneReward(oneZoneStage, state, testParty, runResolver);
    state = stageEngine.selfReturn(state, testParty, runResolver);

    expect(state.result).toEqual({
      stageId: oneZoneStage.id,
      outcome: 'CLEARED',
      zonesCleared: 1,
      completedLaps: 1,
      clearedZoneIds: ['zone_1_final'],
    });
  });

  it('completeZoneReward no-ops until the reward phase is actually complete (idempotency, CLAUDE.md §13)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver, NO_ITEMS);
    state = stageEngine.recordZoneWin(threeZoneStage, state, { [testCharacterA.id]: 100, charB: 100 }, NO_ITEMS);
    // rewardPhase is still null (no reward-phase driving happened) — must no-op, not throw.
    const afterAttempt = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    expect(afterAttempt).toBe(state);
  });
});
