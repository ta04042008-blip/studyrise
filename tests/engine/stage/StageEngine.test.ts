import { describe, expect, it } from 'vitest';
import { createStageEngine } from '../../../src/engine/stage/StageEngine';
import type { StageDefinition } from '../../../src/engine/stage/StageEngine.types';
import type { StageConfig } from '../../../src/config/stageConfig';
import { createRogueliteEngine, type RogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import type { RewardSession, RunState } from '../../../src/engine/roguelite/RogueliteEngine.types';
import { createRandomService, deriveSeed } from '../../../src/engine/random/RandomService';
import type { CharacterDefinition, EnemyDefinition } from '../../../src/engine/battle/BattleEngine.types';
import {
  testCharacterA,
  testConfig,
  testParty,
  testRewardDefinitions,
  testSpellsById,
} from '../roguelite/fixtures';

const testStageConfig: StageConfig = { koReviveHpPercent: 0.3 };
const stageEngine = createStageEngine({ config: testStageConfig });

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
      isFinalZone: false,
    },
    {
      id: 'zone_2',
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e1' },
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e2' }, // same species twice
      ],
      isRareRewardEvent: true,
      isFinalZone: false,
    },
    {
      id: 'zone_3_final',
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z3_e1' },
        { enemyDefinitionId: bossEnemy.id, instanceId: 'z3_boss' },
      ],
      isRareRewardEvent: false,
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
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    expect(state.currentZoneIndex).toBe(0);
    expect(state.phase).toBe('ZONE_BATTLE');
    expect(state.result).toBeNull();
    expect(stageEngine.currentZone(threeZoneStage, state).id).toBe('zone_1');
    for (const c of testParty) {
      expect(state.runState.build.characters[c.id].knownSpells).toHaveLength(1);
    }
  });
});

describe('StageEngine — Zone resolution (enemyDefinitionId vs instanceId, MVP-5 correction 1)', () => {
  it('resolves each EnemyInstanceDefinition to a BattleEngine-ready instance keeping both ids', () => {
    const runResolver = makeRunResolver();
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    // Advance to zone_2 (same-species-twice zone) by simulating a win + full reward + continue.
    const afterWin = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100 });
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
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 123, runResolver);
    const battleSeed = stageEngine.deriveZoneBattleSeed(threeZoneStage, state);
    const rewardSeed = stageEngine.deriveZoneRewardSeed(threeZoneStage, state);
    expect(battleSeed).toBe(deriveSeed(123, 'zone_1', 'battle'));
    expect(rewardSeed).toBe(deriveSeed(123, 'zone_1', 'reward'));
    expect(battleSeed).not.toBe(rewardSeed);
  });

  it('the same runSeed reproduces identical per-zone seeds across two independent StageEngine runs', () => {
    const runResolver = makeRunResolver();
    const stateA = stageEngine.createInitialState(threeZoneStage, testParty, 7, runResolver);
    const stateB = stageEngine.createInitialState(threeZoneStage, testParty, 7, runResolver);
    expect(stageEngine.deriveZoneBattleSeed(threeZoneStage, stateA)).toBe(
      stageEngine.deriveZoneBattleSeed(threeZoneStage, stateB),
    );
  });

  it('a different runSeed on the same stage yields different per-zone seeds', () => {
    const runResolver = makeRunResolver();
    const stateA = stageEngine.createInitialState(threeZoneStage, testParty, 7, runResolver);
    const stateB = stageEngine.createInitialState(threeZoneStage, testParty, 8, runResolver);
    expect(stageEngine.deriveZoneBattleSeed(threeZoneStage, stateA)).not.toBe(
      stageEngine.deriveZoneBattleSeed(threeZoneStage, stateB),
    );
  });
});

describe('StageEngine — HP carryover and KO revival', () => {
  it("a survivor's HP carries into the next zone unchanged", () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 42, charB: 100 });
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);
    expect(state.runState.currentHpByCharacterId[testCharacterA.id]).toBe(42);
  });

  it('a KO\'d (0 HP) character revives at ceil(effectiveMaxHp * 30%) at the next zone, minimum 1', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    // testCharacterA.baseStats.maxHp === 100 → 30% == 30 exactly.
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 0, charB: 100 });
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);
    expect(state.runState.currentHpByCharacterId[testCharacterA.id]).toBe(30);
    expect(state.runState.currentHpByCharacterId['charB']).toBe(100); // survivor untouched
  });

  it('revival uses effectiveMaxHp (RunBuild HP boosts included), not the raw base maxHp — via the same resolveBattleInputsForRun single source', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, [testCharacterA], 1, runResolver);
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
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 0 });
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
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
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
    const state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    expect(state.phase).toBe('ZONE_BATTLE');
    const afterAttempt = stageEngine.selfReturn(state, testParty, runResolver);
    expect(afterAttempt).toBe(state); // untouched — structurally still ZONE_BATTLE
  });

  it('is impossible during ZONE_REWARD (no-op)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
    expect(state.phase).toBe('ZONE_REWARD');
    const afterAttempt = stageEngine.selfReturn(state, testParty, runResolver);
    expect(afterAttempt).toBe(state);
  });

  it('from INTER_ZONE_CHOICE, ends the stage as SELF_RETURNED and discards RunBuild', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    expect(state.phase).toBe('INTER_ZONE_CHOICE');

    // Prove the build is non-default before self-returning, so the reset assertion below is meaningful.
    const defaultBuild = runResolver.createDefaultRunBuild(testParty);
    expect(state.runState.build).not.toEqual(defaultBuild);

    state = stageEngine.selfReturn(state, testParty, runResolver);
    expect(state.phase).toBe('STAGE_RESULT');
    expect(state.result).toEqual({ stageId: threeZoneStage.id, outcome: 'SELF_RETURNED', zonesCleared: 1 });
    expect(state.runState.build).toEqual(defaultBuild);
  });
});

describe('StageEngine — defeat', () => {
  it('any zone defeat ends the stage as DEFEATED and discards RunBuild', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneDefeat(state, testParty, runResolver);
    expect(state.phase).toBe('STAGE_RESULT');
    expect(state.result).toEqual({ stageId: threeZoneStage.id, outcome: 'DEFEATED', zonesCleared: 0 });
    expect(state.runState.build).toEqual(runResolver.createDefaultRunBuild(testParty));
  });

  it('is impossible outside ZONE_BATTLE (no-op)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
    const afterAttempt = stageEngine.recordZoneDefeat(state, testParty, runResolver);
    expect(afterAttempt).toBe(state);
  });
});

describe('StageEngine — Final Zone / boss / Stage Clear', () => {
  it('a 1-zone Stage (already the final zone) clears immediately after its reward phase completes, with no INTER_ZONE_CHOICE', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(oneZoneStage, testParty, 1, runResolver);
    expect(stageEngine.currentZone(oneZoneStage, state).isFinalZone).toBe(true);

    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
    expect(state.phase).toBe('ZONE_REWARD');

    const rewardedRunState = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewardedRunState);
    state = stageEngine.completeZoneReward(oneZoneStage, state, testParty, runResolver);

    expect(state.phase).toBe('STAGE_RESULT');
    expect(state.result).toEqual({ stageId: oneZoneStage.id, outcome: 'CLEARED', zonesCleared: 1 });
    expect(state.runState.build).toEqual(runResolver.createDefaultRunBuild(testParty)); // RunBuild discarded on clear
  });

  it('a 3-zone Stage requires all zones cleared, offers Zone reward after the boss too, then clears', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);

    // Zone 1 (normal).
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
    let rewarded = completeRewardPhase(makeRunResolver(1), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewarded);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    expect(state.phase).toBe('INTER_ZONE_CHOICE'); // not the final zone yet
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);
    expect(stageEngine.currentZone(threeZoneStage, state).id).toBe('zone_2');

    // Zone 2 (same-species-twice, rare reward event).
    expect(stageEngine.currentZone(threeZoneStage, state).isRareRewardEvent).toBe(true);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 80, charB: 90 });
    rewarded = completeRewardPhase(makeRunResolver(2), testParty, state.runState, true);
    state = stageEngine.updateRunState(state, rewarded);
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    expect(state.phase).toBe('INTER_ZONE_CHOICE');
    state = stageEngine.continueToNextZone(threeZoneStage, state, testParty, runResolver);
    expect(stageEngine.currentZone(threeZoneStage, state).id).toBe('zone_3_final');
    expect(stageEngine.currentZone(threeZoneStage, state).isFinalZone).toBe(true);

    // Zone 3 (final, boss present alongside a normal enemy).
    const finalZoneEnemies = stageEngine.resolveZoneEnemies(threeZoneStage, state, enemyDefinitionsById);
    expect(finalZoneEnemies.some((e) => e.definition.isBoss)).toBe(true);
    expect(finalZoneEnemies.some((e) => !e.definition.isBoss)).toBe(true);

    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 50, charB: 60 });
    expect(state.phase).toBe('ZONE_REWARD'); // boss defeat still runs the normal Zone reward flow (spec §11.4)
    rewarded = completeRewardPhase(makeRunResolver(3), testParty, state.runState, false);
    state = stageEngine.updateRunState(state, rewarded);
    // Not yet complete-and-confirmed as far as StageEngine is concerned until completeZoneReward runs:
    state = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);

    expect(state.phase).toBe('STAGE_RESULT');
    expect(state.result).toEqual({ stageId: threeZoneStage.id, outcome: 'CLEARED', zonesCleared: 3 });
    expect(state.runState.build).toEqual(runResolver.createDefaultRunBuild(testParty));
  });

  it('completeZoneReward no-ops until the reward phase is actually complete (idempotency, CLAUDE.md §13)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(threeZoneStage, testParty, 1, runResolver);
    state = stageEngine.recordZoneWin(state, { [testCharacterA.id]: 100, charB: 100 });
    // rewardPhase is still null (no reward-phase driving happened) — must no-op, not throw.
    const afterAttempt = stageEngine.completeZoneReward(threeZoneStage, state, testParty, runResolver);
    expect(afterAttempt).toBe(state);
  });
});
