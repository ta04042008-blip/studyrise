import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';
import {
  applyExpAndLevelUp,
  computeLevelFromTotalExp,
  createEmptyPermanentCharacterState,
  expRequiredForLevel,
} from '../../../src/engine/progression/ProgressionSystem';

/**
 * MVP-7 decision doc §1: nextLevelExpCost(level) = round(20 * level^1.35 + 10).
 * User-confirmed worked examples: Lv1→2 = 30, Lv2→3 = 61, Lv3→4 = 98.
 */
describe('expRequiredForLevel (decision doc §1 exp curve)', () => {
  it('matches the user-confirmed worked examples exactly', () => {
    expect(expRequiredForLevel(1, progressionConfig.expCurve)).toBe(30);
    expect(expRequiredForLevel(2, progressionConfig.expCurve)).toBe(61);
    expect(expRequiredForLevel(3, progressionConfig.expCurve)).toBe(98);
  });
});

describe('computeLevelFromTotalExp — cumulative EXP → level, no cap', () => {
  it('exp 0 is Level 1 ("Lv1開始")', () => {
    expect(computeLevelFromTotalExp(0, progressionConfig.expCurve)).toBe(1);
  });

  it('stays at Level 1 for any exp below the Lv1→2 threshold (30)', () => {
    expect(computeLevelFromTotalExp(29, progressionConfig.expCurve)).toBe(1);
  });

  it('reaches exactly Level boundaries at the cumulative threshold', () => {
    expect(computeLevelFromTotalExp(30, progressionConfig.expCurve)).toBe(2);
    expect(computeLevelFromTotalExp(30 + 61, progressionConfig.expCurve)).toBe(3);
    expect(computeLevelFromTotalExp(30 + 61 + 98, progressionConfig.expCurve)).toBe(4);
  });

  it('is consistent one EXP below and at a boundary', () => {
    const boundary = 30 + 61;
    expect(computeLevelFromTotalExp(boundary - 1, progressionConfig.expCurve)).toBe(2);
    expect(computeLevelFromTotalExp(boundary, progressionConfig.expCurve)).toBe(3);
  });

  it('has no level cap — computes a high level for a very large cumulative EXP without error', () => {
    const level = computeLevelFromTotalExp(1_000_000, progressionConfig.expCurve);
    expect(level).toBeGreaterThan(50);
    expect(Number.isFinite(level)).toBe(true);
  });
});

describe('applyExpAndLevelUp', () => {
  it('a single reward can jump multiple levels at once (decision doc §1)', () => {
    const state = createEmptyPermanentCharacterState('char_x');
    const result = applyExpAndLevelUp(state, 30 + 61 + 5, progressionConfig.expCurve);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(3);
    expect(result.next.exp).toBe(30 + 61 + 5);
  });

  it('EXP is cumulative and never resets on level-up', () => {
    const state = createEmptyPermanentCharacterState('char_x');
    const first = applyExpAndLevelUp(state, 30, progressionConfig.expCurve);
    expect(first.next.exp).toBe(30);
    const second = applyExpAndLevelUp(first.next, 10, progressionConfig.expCurve);
    expect(second.next.exp).toBe(40);
    expect(second.levelBefore).toBe(2);
  });

  it('zero EXP gained never changes level', () => {
    const state = createEmptyPermanentCharacterState('char_x');
    const result = applyExpAndLevelUp(state, 0, progressionConfig.expCurve);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(1);
  });
});
