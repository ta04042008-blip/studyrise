import { describe, expect, it } from 'vitest';
import { setup, testHealSpell, testSpell } from './BattleEngine.test';

describe('BattleEngine — Spell', () => {
  it('costs no question: goes straight from COMMAND_SELECT to a resting RESULT_APPLY', () => {
    const engine = setup({ playerMaxMp: 5 });
    // Charge to afford the 3-MP test spell first.
    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    expect(engine.getState().player.currentMp).toBeGreaterThanOrEqual(testSpell.mpCost);

    engine.useSpell();
    const state = engine.getState();
    expect(state.phase).toBe('RESULT_APPLY');
    expect(state.pendingCommand).toBeNull();
    expect(state.lastNonQuestionOutcome?.command).toBe('spell');
  });

  it('deducts the spell MP cost and applies its DAMAGE effect to the enemy', () => {
    const engine = setup({ playerMaxMp: 5 });
    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    const mpBefore = engine.getState().player.currentMp;
    const hpBefore = engine.getState().enemy.currentHp;

    engine.useSpell();

    const state = engine.getState();
    expect(state.player.currentMp).toBe(mpBefore - testSpell.mpCost);
    expect(state.enemy.currentHp).toBe(hpBefore - 15); // testSpell: DAMAGE 15
  });

  it('a self-targeted HEAL spell applies to the caster, not the enemy', () => {
    const engine = setup({
      playerMaxMp: 5,
      playerMaxHp: 100,
      enemyMaxHp: 40,
      spellsById: { [testHealSpell.id]: testHealSpell },
      initialSpellId: testHealSpell.id,
    });
    for (let i = 0; i < 2; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    const before = engine.getState();
    engine.useSpell();
    const after = engine.getState();

    expect(after.enemy.currentHp).toBe(before.enemy.currentHp); // untouched — HEAL never targets the enemy
    expect(after.player.currentHp).toBe(before.player.currentHp); // was already full HP, HEAL clamps at maxHp
  });

  it('is rejected (no-op) when the player does not have enough MP', () => {
    const engine = setup({ playerMaxMp: 5 }); // starts at 0 MP, spell costs 3
    const before = engine.getState();
    engine.useSpell();
    const after = engine.getState();

    expect(after.phase).toBe(before.phase); // still COMMAND_SELECT
    expect(after.player.currentMp).toBe(before.player.currentMp);
    expect(after.enemy.currentHp).toBe(before.enemy.currentHp);
  });

  it('is rejected (no-op) when not the player\'s turn', () => {
    const engine = setup({ playerSpeed: 1, enemySpeed: 100, enemyAttack: 1, playerMaxHp: 1000 });
    // With these speeds the enemy has already acted at construction, but the player still gets a turn
    // eventually; force a mid-QUESTION state and try to cast then.
    engine.selectCommand('charge');
    engine.selectSubjectAndStar('数学', 1);
    // still QUESTION phase, not COMMAND_SELECT
    const before = engine.getState();
    engine.useSpell();
    const after = engine.getState();
    expect(after.phase).toBe(before.phase);
  });

  it('never passes through QUESTION or EXPLANATION', () => {
    const engine = setup({ playerMaxMp: 5 });
    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    engine.useSpell();
    expect(engine.getState().phase).not.toBe('QUESTION');
    expect(engine.getState().phase).not.toBe('EXPLANATION');
  });
});
