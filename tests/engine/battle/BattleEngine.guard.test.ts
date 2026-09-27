import { describe, expect, it } from 'vitest';
import { mc, setup, withForcedChance } from './BattleEngine.test';
import { battleConfig } from '../../../src/config/battleConfig';
import type { RandomService } from '../../../src/engine/random/RandomService';

/** Fully deterministic: no variance, no critical, no great-success. */
const deterministicRandom: RandomService = {
  uniform: () => 1,
  chance: () => false,
  int: () => 0,
  pick: (items) => items[0],
};

describe('BattleEngine — Guard', () => {
  it('on a correct answer (normal), applies ★-based mitigation with isGreatSuccess=false', () => {
    const engine = setup({ random: withForcedChance(false) });
    engine.selectCommand('guard');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct
    engine.advance(); // RESULT_APPLY -> EXPLANATION

    const state = engine.getState();
    expect(state.players[0].guard).toEqual({ mitigationPercent: battleConfig.guardMitigationByStar[1] });
    const outcome = state.lastPlayerOutcome;
    expect(outcome?.command).toBe('guard');
    if (outcome?.command === 'guard') {
      expect(outcome.applied).toBe(true);
      expect(outcome.isGreatSuccess).toBe(false);
      expect(outcome.mitigationPercent).toBe(battleConfig.guardMitigationByStar[1]);
    }
  });

  it('great success (independently rolled) adds +20pp to the ★ mitigation', () => {
    const engine = setup({ random: withForcedChance(true), questions: [mc({ star: 3 })] });
    engine.selectCommand('guard');
    engine.selectSubjectAndStar('数学', 3);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct
    engine.advance();

    const expected = battleConfig.guardMitigationByStar[3] + battleConfig.guardGreatSuccessBonusMitigation;
    const state = engine.getState();
    expect(state.players[0].guard?.mitigationPercent).toBeCloseTo(expected);
    const outcome = state.lastPlayerOutcome;
    if (outcome?.command === 'guard') {
      expect(outcome.isGreatSuccess).toBe(true);
    }
  });

  it('caps total mitigation at guardMaxMitigation even when ★ + bonus would exceed it', () => {
    const customConfig = {
      ...battleConfig,
      guardMitigationByStar: { ...battleConfig.guardMitigationByStar, 5: 0.85 },
    };
    const engine = setup({ random: withForcedChance(true), config: customConfig, questions: [mc({ star: 5 })] });
    engine.selectCommand('guard');
    engine.selectSubjectAndStar('数学', 5);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance();

    // 0.85 + 0.20 = 1.05, must be capped at 0.90
    expect(engine.getState().players[0].guard?.mitigationPercent).toBe(customConfig.guardMaxMitigation);
  });

  it('on an incorrect/dont_know answer, guard is NOT applied (complete failure)', () => {
    const engine = setup({ random: withForcedChance(true) }); // even if great-success would roll true, correct=false must win
    engine.selectCommand('guard');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 }); // wrong
    engine.advance();

    const state = engine.getState();
    expect(state.players[0].guard).toBeNull();
    const outcome = state.lastPlayerOutcome;
    if (outcome?.command === 'guard') {
      expect(outcome.applied).toBe(false);
      expect(outcome.isGreatSuccess).toBe(false);
      expect(outcome.mitigationPercent).toBe(0);
    }
  });

  it('mitigates exactly one incoming enemy attack, then is consumed', () => {
    const engine = setup({
      random: deterministicRandom,
      playerSpeed: 10,
      enemySpeed: 9, // close enough that exactly one enemy action fires per player turn here
      playerMaxHp: 1000,
      playerDefense: 0,
      enemyAttack: 50, // base damage = 50 exactly, with deterministic random (variance=1, no crit)
    });

    // Round 1: Guard (correct, ★1 -> 20% mitigation) — the next enemy attack should be reduced.
    engine.selectCommand('guard');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance(); // COMMAND_ANIMATION -> EXPLANATION
    engine.advance(); // EXPLANATION -> resolves the enemy's turn

    const afterGuardedHit = engine.getState();
    expect(afterGuardedHit.enemyActionLog).toHaveLength(1);
    expect(afterGuardedHit.enemyActionLog[0].damage).toBe(40); // 50 * (1 - 0.2)
    expect(afterGuardedHit.players[0].guard).toBeNull(); // consumed

    // Round 2: any other command (Attack, answered wrong so it has no side effect) — guard is gone, so the
    // next enemy attack should be full damage again.
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 }); // wrong
    engine.advance();
    engine.advance();

    const afterUnguardedHit = engine.getState();
    expect(afterUnguardedHit.enemyActionLog).toHaveLength(1);
    expect(afterUnguardedHit.enemyActionLog[0].damage).toBe(50); // full damage, no mitigation
  });
});
