import { describe, expect, it } from 'vitest';
import { mc, setup, withForcedChance } from './BattleEngine.test';
import { battleConfig } from '../../../src/config/battleConfig';

describe('BattleEngine — Charge', () => {
  it('on a correct answer (normal), gains +1 MP', () => {
    const engine = setup({ random: withForcedChance(false), playerMaxMp: 5 });
    engine.selectCommand('charge');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct
    engine.advance();

    const state = engine.getState();
    expect(state.player.currentMp).toBe(battleConfig.chargeMpGainNormal);
    const outcome = state.lastPlayerOutcome;
    if (outcome?.command === 'charge') {
      expect(outcome.mpGained).toBe(1);
      expect(outcome.isGreatSuccess).toBe(false);
    }
  });

  it('great success gains +2 MP instead of +1', () => {
    const engine = setup({ random: withForcedChance(true), playerMaxMp: 5 });
    engine.selectCommand('charge');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance();

    expect(engine.getState().player.currentMp).toBe(battleConfig.chargeMpGainGreatSuccess);
  });

  it('on an incorrect/dont_know answer, MP does not change', () => {
    const engine = setup({ random: withForcedChance(true) }); // great-success would roll true, but correct=false wins
    engine.selectCommand('charge');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 }); // wrong
    engine.advance();

    const state = engine.getState();
    expect(state.player.currentMp).toBe(0);
    const outcome = state.lastPlayerOutcome;
    if (outcome?.command === 'charge') {
      expect(outcome.mpGained).toBe(0);
    }
  });

  it('★ does not affect MP gained — ★1 and ★5 grant the same amount', () => {
    const engineStar1 = setup({ random: withForcedChance(false), questions: [mc({ star: 1 })] });
    engineStar1.selectCommand('charge');
    engineStar1.selectSubjectAndStar('数学', 1);
    engineStar1.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engineStar1.advance();

    const engineStar5 = setup({ random: withForcedChance(false), questions: [mc({ star: 5 })] });
    engineStar5.selectCommand('charge');
    engineStar5.selectSubjectAndStar('数学', 5);
    engineStar5.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engineStar5.advance();

    expect(engineStar1.getState().player.currentMp).toBe(engineStar5.getState().player.currentMp);
  });

  it('MP is clamped at maxMp (5) even when repeated great-success charges would overflow it', () => {
    // Every charge is forced to great-success (+2): 0 -> 2 -> 4 -> would be 6, clamped to 5.
    const engine = setup({ random: withForcedChance(true), playerMaxMp: 5 });

    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance(); // -> EXPLANATION
      engine.advance(); // -> back to COMMAND_SELECT (player is faster here, no enemy action yet)
    }

    expect(engine.getState().player.currentMp).toBe(5);
  });
});
