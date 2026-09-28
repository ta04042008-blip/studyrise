import { describe, expect, it } from 'vitest';
import { createBattleEngine, type CreateBattleEngineOptions } from '../../../src/engine/battle/BattleEngine';
import { createQuestionEngine } from '../../../src/engine/question/QuestionEngine';
import { createRandomService, type RandomService } from '../../../src/engine/random/RandomService';
import { battleConfig } from '../../../src/config/battleConfig';
import { createRogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';
import {
  phaseWithSingleCandidate,
  testCharacterA,
  testConfig,
  testInitialSpell,
  testPoolSpellA,
  testRewardDefinitions,
  testSpellsById,
} from './fixtures';

function question(): MultipleChoiceQuestion {
  return {
    id: 'q1',
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    format: 'multiple_choice',
    text: '1 + 1 は？',
    choices: ['1', '2'],
    correctIndex: 1,
    explanation: '1 + 1 = 2 です。',
  };
}

function makeBattle(seed: number, overrides: Partial<CreateBattleEngineOptions> = {}) {
  const random = createRandomService(seed);
  const questionEngine = createQuestionEngine([question()], random);
  return createBattleEngine({
    players: [testCharacterA],
    enemies: [{ id: 'enemy', name: 'Enemy', baseStats: { attack: 5, defense: 0, speed: 1, maxHp: 999 } }],
    questionEngine,
    config: battleConfig,
    random,
    spellsById: testSpellsById,
    initialItems: [],
    ...overrides,
  });
}

function doCorrectAttack(engine: ReturnType<typeof createBattleEngine>) {
  engine.selectCommand('attack');
  engine.selectSubjectAndStar('数学', 1);
  engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
  return engine.getState().pendingOutcome;
}

function doCorrectGuard(engine: ReturnType<typeof createBattleEngine>) {
  engine.selectCommand('guard');
  engine.selectSubjectAndStar('数学', 1);
  engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
  return engine.getState().pendingOutcome;
}

describe('RogueliteEngine → BattleEngine — COMMAND_BOOST actually changes battle math', () => {
  it('an attackDamageBonusPercent raises final Attack damage by exactly that percent (same seed, same rolls)', () => {
    const baseline = makeBattle(101);
    const boosted = makeBattle(101, { playerCommandModifiers: { [testCharacterA.id]: { attackDamageBonusPercent: 20 } } });

    const baseOutcome = doCorrectAttack(baseline);
    const boostedOutcome = doCorrectAttack(boosted);
    if (baseOutcome?.command !== 'attack' || boostedOutcome?.command !== 'attack') throw new Error('expected attack outcomes');

    const expected = Math.max(battleConfig.minimumDamage, Math.round(baseOutcome.damage * 1.2));
    expect(boostedOutcome.damage).toBe(expected);
    expect(boostedOutcome.damage).toBeGreaterThan(baseOutcome.damage);
  });

  it('a guardMitigationBonus raises Guard mitigation by exactly that many percentage points, still capped at guardMaxMitigation', () => {
    const baseline = makeBattle(103, { random: forcedChance(false, 103) });
    const boosted = makeBattle(103, {
      random: forcedChance(false, 103),
      playerCommandModifiers: { [testCharacterA.id]: { guardMitigationBonus: 0.05 } },
    });

    const baseOutcome = doCorrectGuard(baseline);
    const boostedOutcome = doCorrectGuard(boosted);
    if (baseOutcome?.command !== 'guard' || boostedOutcome?.command !== 'guard') throw new Error('expected guard outcomes');

    expect(boostedOutcome.mitigationPercent).toBeCloseTo(Math.min(battleConfig.guardMaxMitigation, baseOutcome.mitigationPercent + 0.05), 10);
  });

  it('a chargeGreatSuccessBonus is added directly to the probability passed to RandomService.chance()', () => {
    const seenChances: number[] = [];
    const recording: RandomService = {
      uniform: (min) => min,
      chance: (c) => {
        seenChances.push(c);
        return false;
      },
      int: () => 0,
      pick: (items) => items[0],
    };
    const engine = makeBattle(1, {
      random: recording,
      playerCommandModifiers: { [testCharacterA.id]: { chargeGreatSuccessBonus: 0.02 } },
    });
    engine.selectCommand('charge');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    expect(seenChances).toContain(battleConfig.chargeGreatSuccessChance + 0.02);
  });

  it('a searchRevealBonusCount adds directly to the ★-based revealed-action count', () => {
    const boosted = makeBattle(107, { playerCommandModifiers: { [testCharacterA.id]: { searchRevealBonusCount: 2 } } });
    boosted.selectCommand('search');
    boosted.selectSubjectAndStar('数学', 1);
    boosted.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    const outcome = boosted.getState().pendingOutcome;
    if (outcome?.command !== 'search') throw new Error('expected search outcome');
    expect(outcome.revealedActions).toHaveLength(battleConfig.searchRevealCountByStar[1] + 2);
  });
});

function forcedChance(result: boolean, seed: number): RandomService {
  const real = createRandomService(seed);
  return { uniform: real.uniform, chance: () => result, int: real.int, pick: real.pick };
}

describe('RogueliteEngine → BattleEngine — full Battle1 → Reward → Battle2 carryover', () => {
  it('a NEW_SPELL, a COMMAND_BOOST and a TEMP_STAT_BOOST reward all show up in the next battle\'s construction', () => {
    const rogueliteEngine = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random: createRandomService(1),
    });

    let runState = rogueliteEngine.createInitialRunState([testCharacterA]);

    // Battle 1: fresh build — resolveBattleInputsForRun must be the MVP-1〜3 default shape.
    const battle1Inputs = rogueliteEngine.resolveBattleInputsForRun([testCharacterA], runState);
    expect(battle1Inputs.knownSpellsByPlayerId[testCharacterA.id]).toEqual([{ spellId: testInitialSpell.id, level: 1 }]);
    expect(battle1Inputs.playerCommandModifiers[testCharacterA.id]).toEqual({});
    expect(battle1Inputs.players[0].baseStats).toEqual(testCharacterA.baseStats);

    // Apply 3 hand-picked rewards in sequence (bypassing random generation — see phaseWithSingleCandidate).
    const rewardIds = ['r_new_a', 'r_boost_attack', 'r_stat_attack'];
    for (const rewardId of rewardIds) {
      const reward = testRewardDefinitions.find((r) => r.id === rewardId)!;
      const phase = phaseWithSingleCandidate(testCharacterA.id, reward);
      const key = phase.currentRewardSession.candidates[0].candidateKey;
      const selected = rogueliteEngine.selectCandidate(phase, key);
      const result = rogueliteEngine.confirmAndApply(selected, runState, [testCharacterA]);
      runState = result.runState;
    }

    // Battle 2: must reflect all three rewards.
    const battle2Inputs = rogueliteEngine.resolveBattleInputsForRun([testCharacterA], runState);
    expect(battle2Inputs.knownSpellsByPlayerId[testCharacterA.id]).toContainEqual({ spellId: testPoolSpellA.id, level: 1 });
    expect(battle2Inputs.playerCommandModifiers[testCharacterA.id].attackDamageBonusPercent).toBe(testConfig.commandBoostPerLevel.attack);
    expect(battle2Inputs.players[0].baseStats.attack).toBe(testCharacterA.baseStats.attack + testConfig.tempStatBoostPerLevel.attack);

    // And it must actually construct and run in BattleEngine without error.
    const random = createRandomService(9);
    const questionEngine = createQuestionEngine([question()], random);
    const battle2 = createBattleEngine({
      players: battle2Inputs.players,
      enemies: [{ id: 'enemy', name: 'Enemy', baseStats: { attack: 5, defense: 0, speed: 1, maxHp: 999 } }],
      questionEngine,
      config: battleConfig,
      random,
      spellsById: testSpellsById,
      initialItems: [],
      knownSpellsByPlayerId: battle2Inputs.knownSpellsByPlayerId,
      playerCommandModifiers: battle2Inputs.playerCommandModifiers,
      initialHpByPlayerId: battle2Inputs.initialHpByPlayerId,
    });
    expect(battle2.getState().knownSpellsByPlayerId[testCharacterA.id]).toHaveLength(2); // initial + the granted NEW_SPELL
  });
});

describe('RogueliteEngine → BattleEngine — HP carryover honesty (spec §2.4/§8)', () => {
  it('a survivor\'s exact ending HP (not full HP) is what the next battle actually starts with', () => {
    const rogueliteEngine = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random: createRandomService(1),
    });
    const runState = rogueliteEngine.createInitialRunState([testCharacterA]);
    // Simulate "Battle1 ended with this character damaged but alive" —
    // this is exactly what useRunScreen's handleProceedToReward must snapshot
    // from the just-finished BattleEngine before entering the reward phase.
    runState.currentHpByCharacterId[testCharacterA.id] = 37;

    const inputs = rogueliteEngine.resolveBattleInputsForRun([testCharacterA], runState);
    expect(inputs.initialHpByPlayerId[testCharacterA.id]).toBe(37); // never reset to maxHp

    const random = createRandomService(1);
    const battle2 = createBattleEngine({
      players: inputs.players,
      enemies: [{ id: 'enemy', name: 'Enemy', baseStats: { attack: 5, defense: 0, speed: 1, maxHp: 999 } }],
      questionEngine: createQuestionEngine([question()], random),
      config: battleConfig,
      random,
      spellsById: testSpellsById,
      initialItems: [],
      knownSpellsByPlayerId: inputs.knownSpellsByPlayerId,
      playerCommandModifiers: inputs.playerCommandModifiers,
      initialHpByPlayerId: inputs.initialHpByPlayerId,
    });
    expect(battle2.getState().players[0].currentHp).toBe(37);
    expect(battle2.getState().players[0].currentMp).toBe(0); // MP always resets to 0 regardless of HP carryover
  });

  it('a new zone\'s enemies always start at their own full initial HP, unaffected by the previous battle', () => {
    const rogueliteEngine = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random: createRandomService(1),
    });
    const runState = rogueliteEngine.createInitialRunState([testCharacterA]);
    const inputs = rogueliteEngine.resolveBattleInputsForRun([testCharacterA], runState);
    const random = createRandomService(1);
    const battle2 = createBattleEngine({
      players: inputs.players,
      enemies: [{ id: 'enemy', name: 'Enemy', baseStats: { attack: 5, defense: 0, speed: 1, maxHp: 42 } }],
      questionEngine: createQuestionEngine([question()], random),
      config: battleConfig,
      random,
      spellsById: testSpellsById,
      initialItems: [],
      knownSpellsByPlayerId: inputs.knownSpellsByPlayerId,
      playerCommandModifiers: inputs.playerCommandModifiers,
      initialHpByPlayerId: inputs.initialHpByPlayerId,
    });
    expect(battle2.getState().enemies[0].currentHp).toBe(42);
  });

  it('a KO\'d character (HP 0) carries over at exactly 0 — MVP-4 invents no revival percentage', () => {
    const rogueliteEngine = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random: createRandomService(1),
    });
    const runState = rogueliteEngine.createInitialRunState([testCharacterA]);
    runState.currentHpByCharacterId[testCharacterA.id] = 0; // KO'd at the end of Battle1

    const inputs = rogueliteEngine.resolveBattleInputsForRun([testCharacterA], runState);
    // Not revived to any fraction of maxHp — spec §8's revival rate is
    // explicitly unconfirmed, so RogueliteEngine must not invent one.
    expect(inputs.initialHpByPlayerId[testCharacterA.id]).toBe(0);
  });
});
