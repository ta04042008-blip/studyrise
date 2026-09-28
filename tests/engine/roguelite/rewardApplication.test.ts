import { describe, expect, it } from 'vitest';
import { createRogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import type { RewardDefinition } from '../../../src/engine/roguelite/RogueliteEngine.types';
import {
  phaseWithSingleCandidate,
  testCharacterA,
  testConfig,
  testInitialSpell,
  testParty,
  testPoolSpellA,
  testRewardDefinitions,
  testSpellsById,
} from './fixtures';

function makeEngine(seed = 1) {
  return createRogueliteEngine({
    spellsById: testSpellsById,
    rewardDefinitions: testRewardDefinitions,
    config: testConfig,
    random: createRandomService(seed),
  });
}

function rewardById(id: string): RewardDefinition {
  const reward = testRewardDefinitions.find((r) => r.id === id);
  if (!reward) throw new Error(`fixture reward "${id}" not found`);
  return reward;
}

/** Selects the single candidate in a phaseWithSingleCandidate() and confirms+applies it in one step. */
function applyOnly(engine: ReturnType<typeof makeEngine>, phase: ReturnType<typeof phaseWithSingleCandidate>, runState: any, characters: any) {
  const key = phase.currentRewardSession.candidates[0].candidateKey;
  const selected = engine.selectCandidate(phase, key);
  return engine.confirmAndApply(selected, runState, characters);
}

describe('RogueliteEngine — RunBuild/RunState separation', () => {
  it('RunBuild carries no HP field; RunState alone tracks currentHpByCharacterId', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState(testParty);
    expect(runState.build).not.toHaveProperty('currentHpByCharacterId');
    expect(runState.currentHpByCharacterId[testCharacterA.id]).toBe(testCharacterA.baseStats.maxHp);
    for (const c of testParty) {
      expect(runState.build.characters[c.id]).not.toHaveProperty('currentHp');
    }
  });
});

describe('RogueliteEngine — NEW_SPELL application', () => {
  it('adds the spell to knownSpells at level 1', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_new_a'));
    const result = applyOnly(engine, phase, runState, [testCharacterA]);
    const known = result.runState.build.characters[testCharacterA.id].knownSpells;
    expect(known.some((k: { spellId: string; level: number }) => k.spellId === testPoolSpellA.id && k.level === 1)).toBe(true);
  });
});

describe('RogueliteEngine — SPELL_UPGRADE application', () => {
  it('increments the spell level by 1, capped at the spell\'s own maxLevel', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_upgrade_initial'));
    const result = applyOnly(engine, phase, runState, [testCharacterA]);
    const known = result.runState.build.characters[testCharacterA.id].knownSpells;
    expect(known.find((k: { spellId: string }) => k.spellId === testInitialSpell.id)!.level).toBe(2); // testInitialSpell.maxLevel === 2

    // Applying it again from the already-Lv2 build must not exceed maxLevel.
    const phase2 = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_upgrade_initial'));
    const result2 = applyOnly(engine, phase2, result.runState, [testCharacterA]);
    const known2 = result2.runState.build.characters[testCharacterA.id].knownSpells;
    expect(known2.find((k: { spellId: string }) => k.spellId === testInitialSpell.id)!.level).toBe(2); // still capped
  });
});

describe('RogueliteEngine — COMMAND_BOOST repeated picks upgrade the stack, capped at commandBoostMaxLevel', () => {
  it('increments by 1 each apply and never exceeds the configured max', () => {
    const engine = makeEngine();
    let runState = engine.createInitialRunState([testCharacterA]);
    for (let i = 0; i < testConfig.commandBoostMaxLevel + 2; i++) {
      const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_boost_attack'));
      const result = applyOnly(engine, phase, runState, [testCharacterA]);
      runState = result.runState;
      expect(runState.build.characters[testCharacterA.id].commandBoosts.attack).toBe(
        Math.min(i + 1, testConfig.commandBoostMaxLevel),
      );
    }
  });
});

describe('RogueliteEngine — TEMP_STAT_BOOST repeated picks upgrade the stack, capped at tempStatBoostMaxLevel', () => {
  it('increments by 1 each apply and never exceeds the configured max', () => {
    const engine = makeEngine();
    let runState = engine.createInitialRunState([testCharacterA]);
    for (let i = 0; i < testConfig.tempStatBoostMaxLevel + 2; i++) {
      const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_stat_attack'));
      const result = applyOnly(engine, phase, runState, [testCharacterA]);
      runState = result.runState;
      expect(runState.build.characters[testCharacterA.id].tempStatBoosts.attack).toBe(
        Math.min(i + 1, testConfig.tempStatBoostMaxLevel),
      );
    }
  });
});

describe('RogueliteEngine — maxHP temp stat boost also bumps current HP by the same absolute amount', () => {
  it('HP +10 raises both the boost level and RunState currentHp by 10 immediately', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    const hpBefore = runState.currentHpByCharacterId[testCharacterA.id];
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_stat_hp'));
    const result = applyOnly(engine, phase, runState, [testCharacterA]);
    expect(result.runState.build.characters[testCharacterA.id].tempStatBoosts.hp).toBe(1);
    expect(result.runState.currentHpByCharacterId[testCharacterA.id]).toBe(hpBefore + testConfig.tempStatBoostPerLevel.hp);
  });
});

describe('RogueliteEngine — HEAL_SPECIAL heals for the configured percent of maxHp, applied immediately', () => {
  it('heals for exactly healPercentOfMaxHp × maxHp, clamped at maxHp', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    runState.currentHpByCharacterId[testCharacterA.id] = 10; // damage first so the heal is observable
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_heal'));
    const result = applyOnly(engine, phase, runState, [testCharacterA]);
    const expectedHeal = Math.round(testCharacterA.baseStats.maxHp * testConfig.healSpecialSamplePercentOfMaxHp);
    expect(result.runState.currentHpByCharacterId[testCharacterA.id]).toBe(Math.min(testCharacterA.baseStats.maxHp, 10 + expectedHeal));
  });

  it('never exceeds maxHp even when already near-full', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    runState.currentHpByCharacterId[testCharacterA.id] = testCharacterA.baseStats.maxHp - 1;
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_heal'));
    const result = applyOnly(engine, phase, runState, [testCharacterA]);
    expect(result.runState.currentHpByCharacterId[testCharacterA.id]).toBe(testCharacterA.baseStats.maxHp);
  });
});

describe('RogueliteEngine — double-apply prevention', () => {
  it('applyLockedIn is a no-op the second time it is called on an already-applied session', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_heal'));
    const key = phase.currentRewardSession.candidates[0].candidateKey;
    const selected = engine.selectCandidate(phase, key);
    const lockedIn = engine.confirmSelection(selected);
    expect(lockedIn.currentRewardSession.status).toBe('LOCKED_IN');

    const first = engine.applyLockedIn(lockedIn, runState, [testCharacterA]);
    expect(first.phase.complete).toBe(true); // only 1 character in this party

    const second = engine.applyLockedIn(first.phase, first.runState, [testCharacterA]);
    expect(second.runState).toBe(first.runState); // no-op — same reference, not re-applied
    expect(second.phase).toBe(first.phase);
  });

  it('confirmAndApply is a no-op on a second call using the up-to-date (already-advanced) phase — the real double-tap scenario', () => {
    // useRogueliteController's confirm() uses React's functional setState
    // updater, which always hands the *latest committed* phase to the
    // engine call — so a genuine rapid double-tap is simulated here by
    // replaying confirmAndApply against firstResult.phase (the fresh state
    // after the first tap), never against a stale pre-advance snapshot.
    const engine = makeEngine();
    const runState = engine.createInitialRunState(testParty); // 2 characters
    const phase = phaseWithSingleCandidate(testParty[0].id, rewardById('r_heal'), { characterOrder: testParty.map((c) => c.id) });
    const key = phase.currentRewardSession.candidates[0].candidateKey;
    const selected = engine.selectCandidate(phase, key);
    const firstResult = engine.confirmAndApply(selected, runState, testParty);
    expect(firstResult.phase.currentCharacterIndex).toBe(1); // advanced to 2nd character
    expect(firstResult.phase.complete).toBe(false);

    // The 2nd character's fresh session has no selection yet, so a repeat
    // tap on the same "決定" button (still wired to confirmAndApply) is a
    // guaranteed no-op rather than silently re-granting the 1st character's reward.
    const duplicateAttempt = engine.confirmAndApply(firstResult.phase, firstResult.runState, testParty);
    expect(duplicateAttempt.runState).toBe(firstResult.runState);
    expect(duplicateAttempt.phase).toBe(firstResult.phase);
  });
});

describe('RogueliteEngine — run reset wipes the build identically for every reason', () => {
  it('clear / self-return / defeat all restore knownSpells to [initial Lv1] and clear all boosts', () => {
    const engine = makeEngine();
    const runState = engine.createInitialRunState([testCharacterA]);
    const phase = phaseWithSingleCandidate(testCharacterA.id, rewardById('r_stat_hp'));
    const applied = applyOnly(engine, phase, runState, [testCharacterA]);
    expect(applied.runState.build.characters[testCharacterA.id].tempStatBoosts.hp).toBe(1);

    for (const reason of ['CLEAR', 'SELF_RETURN', 'DEFEAT']) {
      const resetState = engine.resetRunBuild(applied.runState, [testCharacterA]);
      const state = resetState.build.characters[testCharacterA.id];
      expect(state.knownSpells).toEqual([{ spellId: testCharacterA.initialSpellId, level: 1 }]);
      expect(state.commandBoosts).toEqual({});
      expect(state.tempStatBoosts).toEqual({});
      expect(resetState.rewardPhase).toBeNull();
      expect(reason).toBeTruthy(); // documents that all three reasons produce the identical wipe (spec §9.8)
    }
  });
});
