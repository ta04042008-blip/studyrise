import { describe, expect, it } from 'vitest';
import { createRogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import { testCharacterA, testConfig, testRewardDefinitions, testSpellsById } from './fixtures';

function makeEngine(seed = 1) {
  return createRogueliteEngine({
    spellsById: testSpellsById,
    rewardDefinitions: testRewardDefinitions,
    config: testConfig,
    random: createRandomService(seed),
  });
}

describe('RogueliteEngine — reroll', () => {
  it('is free exactly once: a second reroll attempt is a no-op', () => {
    const engine = makeEngine(31);
    const build = engine.createDefaultRunBuild([testCharacterA]);
    let phase = engine.startRewardPhase([testCharacterA], build, false);
    expect(phase.currentRewardSession.rerollRemaining).toBe(1);

    phase = engine.rerollCurrent(phase, [testCharacterA], build);
    expect(phase.currentRewardSession.rerollRemaining).toBe(0);
    const afterFirstReroll = phase.currentRewardSession.candidates;

    const afterSecondAttempt = engine.rerollCurrent(phase, [testCharacterA], build);
    expect(afterSecondAttempt.currentRewardSession.rerollRemaining).toBe(0);
    expect(afterSecondAttempt.currentRewardSession.candidates).toEqual(afterFirstReroll); // unchanged (no-op)
  });

  it('replaces all candidates on reroll', () => {
    const engine = makeEngine(33);
    const build = engine.createDefaultRunBuild([testCharacterA]);
    const before = engine.startRewardPhase([testCharacterA], build, false);
    const beforeKeys = before.currentRewardSession.candidates.map((c) => c.candidateKey);

    const after = engine.rerollCurrent(before, [testCharacterA], build);
    const afterKeys = after.currentRewardSession.candidates.map((c) => c.candidateKey);

    expect(afterKeys).toHaveLength(beforeKeys.length);
    // Best-effort non-repeat: none of the new reward ids should match the old ones' reward ids.
    const beforeRewardIds = new Set(before.currentRewardSession.candidates.map((c) => c.reward.id));
    const afterRewardIds = after.currentRewardSession.candidates.map((c) => c.reward.id);
    for (const id of afterRewardIds) {
      expect(beforeRewardIds.has(id)).toBe(false);
    }
  });

  it('clears any pending selection on reroll', () => {
    const engine = makeEngine(35);
    const build = engine.createDefaultRunBuild([testCharacterA]);
    let phase = engine.startRewardPhase([testCharacterA], build, false);
    const key = phase.currentRewardSession.candidates[0].candidateKey;
    phase = engine.selectCandidate(phase, key);
    expect(phase.currentRewardSession.selectedCandidateKey).toBe(key);

    phase = engine.rerollCurrent(phase, [testCharacterA], build);
    expect(phase.currentRewardSession.selectedCandidateKey).toBeNull();
  });

  it('cannot reroll once LOCKED_IN (selection already confirmed)', () => {
    const engine = makeEngine(37);
    const runState = engine.createInitialRunState([testCharacterA]);
    let phase = engine.startRewardPhase([testCharacterA], runState.build, false);
    const key = phase.currentRewardSession.candidates[0].candidateKey;
    phase = engine.selectCandidate(phase, key);
    phase = engine.confirmSelection(phase);
    expect(phase.currentRewardSession.status).toBe('LOCKED_IN');

    const rerollAttempt = engine.rerollCurrent(phase, [testCharacterA], runState.build);
    expect(rerollAttempt).toBe(phase); // no-op, same reference
  });

  it('never returns to the pre-reroll candidates (no undo path exists)', () => {
    const engine = makeEngine(39);
    const build = engine.createDefaultRunBuild([testCharacterA]);
    const before = engine.startRewardPhase([testCharacterA], build, false);
    const after = engine.rerollCurrent(before, [testCharacterA], build);
    // There is no engine function that takes a RewardPhaseSession and
    // returns a previous one — the only transitions are selectCandidate,
    // rerollCurrent (forward-only) and confirmAndApply (forward-only).
    expect(after).not.toBe(before);
    expect(after.currentRewardSession.candidates).not.toBe(before.currentRewardSession.candidates);
  });
});
