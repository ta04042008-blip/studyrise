import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRogueliteController } from '../../src/state/useRogueliteController';
import { createRogueliteEngine } from '../../src/engine/roguelite/RogueliteEngine';
import { createRandomService, createRandomServiceFromState, exportRandomState } from '../../src/engine/random/RandomService';
import { testCharacterA, testConfig, testRewardDefinitions, testSpellsById } from '../engine/roguelite/fixtures';
import type { RewardPhaseSnapshot, RunState } from '../../src/engine/roguelite/RogueliteEngine.types';

/**
 * MVP-9: a resumed reward phase must continue the exact same future RNG
 * sequence a non-reloaded session would have — including for a reroll the
 * player performs only AFTER reloading (user's explicit MVP-9 instruction:
 * no reseeding, no free rerolls via reload).
 */
function buildRunState(): RunState {
  const engine = createRogueliteEngine({
    spellsById: testSpellsById,
    rewardDefinitions: testRewardDefinitions,
    config: testConfig,
    random: createRandomService(0),
  });
  return engine.createInitialRunState([testCharacterA]);
}

describe('useRogueliteController — reward RNG snapshot/restore (MVP-9)', () => {
  it('onSnapshotChange fires with the initial candidates + RNG state right after mount, and again after reroll — never after a bare selectCandidate', () => {
    const random = createRandomService(5);
    const engine = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random,
    });
    const runState = buildRunState();
    const snapshots: RewardPhaseSnapshot[] = [];

    const { result } = renderHook(() =>
      useRogueliteController({
        characters: [testCharacterA],
        runState,
        isRareRewardEvent: false,
        engine,
        random,
        onComplete: () => {},
        onSnapshotChange: (s) => snapshots.push(s),
      }),
    );

    expect(snapshots).toHaveLength(1); // initial candidate generation

    act(() => {
      result.current.selectCandidate(result.current.phase.currentRewardSession.candidates[0].candidateKey);
    });
    expect(snapshots).toHaveLength(1); // selection alone must not autosave

    act(() => {
      result.current.reroll();
    });
    expect(snapshots).toHaveLength(2); // reroll is a confirmed, RNG-consuming event
    expect(snapshots[1].phase.currentRewardSession.rerollRemaining).toBe(
      snapshots[0].phase.currentRewardSession.rerollRemaining - 1,
    );
  });

  it('restoring from a snapshot and then rerolling produces the exact same candidates a non-reloaded reroll would have', () => {
    const seed = 123;
    const runState = buildRunState();

    // Path A: never "reloaded" — reroll once, then reroll again.
    const randomA = createRandomService(seed);
    const engineA = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random: randomA,
    });
    let latestSnapshotA: RewardPhaseSnapshot | null = null;
    const hookA = renderHook(() =>
      useRogueliteController({
        characters: [testCharacterA],
        runState,
        isRareRewardEvent: false,
        engine: engineA,
        random: randomA,
        onComplete: () => {},
        onSnapshotChange: (s) => (latestSnapshotA = s),
      }),
    );
    act(() => hookA.result.current.reroll()); // first reroll — this is the point we'll "reload" from
    const snapshotAfterFirstReroll = latestSnapshotA!;
    act(() => hookA.result.current.reroll()); // second reroll — never reloaded
    const neverReloadedSecondReroll = latestSnapshotA!;

    // Path B: "reload" right after the first reroll (fresh engine/random
    // restored purely from the exported snapshot, seed discarded), then
    // reroll again — must match Path A's second reroll exactly.
    const randomB = createRandomServiceFromState(snapshotAfterFirstReroll.randomState);
    const engineB = createRogueliteEngine({
      spellsById: testSpellsById,
      rewardDefinitions: testRewardDefinitions,
      config: testConfig,
      random: randomB,
    });
    let latestSnapshotB: RewardPhaseSnapshot | null = null;
    const hookB = renderHook(() =>
      useRogueliteController({
        characters: [testCharacterA],
        runState,
        isRareRewardEvent: false,
        engine: engineB,
        random: randomB,
        onComplete: () => {},
        restoreSnapshot: snapshotAfterFirstReroll,
        onSnapshotChange: (s) => (latestSnapshotB = s),
      }),
    );
    expect(hookB.result.current.phase).toEqual(snapshotAfterFirstReroll.phase);
    act(() => hookB.result.current.reroll());
    const resumedSecondReroll = latestSnapshotB!;

    expect(resumedSecondReroll.phase.currentRewardSession.candidates).toEqual(
      neverReloadedSecondReroll.phase.currentRewardSession.candidates,
    );
    expect(exportRandomState(randomB)).toEqual(exportRandomState(randomA));
  });
});
