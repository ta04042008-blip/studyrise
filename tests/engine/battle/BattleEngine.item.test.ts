import { describe, expect, it } from 'vitest';
import { setup, testItem } from './BattleEngine.test';

describe('BattleEngine — Item', () => {
  it('goes straight from COMMAND_SELECT to a resting RESULT_APPLY, no question involved', () => {
    const engine = setup({ initialItems: [{ item: testItem, remainingUses: 2 }] });
    engine.useItem(testItem.id);
    const state = engine.getState();
    expect(state.phase).toBe('RESULT_APPLY');
    expect(state.lastNonQuestionOutcome?.command).toBe('item');
    expect(state.phase).not.toBe('QUESTION');
  });

  it('applies its HEAL effect to the player and decrements remaining uses', () => {
    const engine = setup({
      playerMaxHp: 100,
      initialItems: [{ item: testItem, remainingUses: 2 }],
    });
    // Knock the player down first via a forced-loss-free enemy hit is unnecessary here —
    // just verify the HEAL clamp behavior directly by checking HP stays <= maxHp and the
    // slot's remaining count decreases.
    const before = engine.getState();
    expect(before.battleItems.find((s) => s.item.id === testItem.id)?.remainingUses).toBe(2);

    engine.useItem(testItem.id);
    const after = engine.getState();
    expect(after.players[0].currentHp).toBeLessThanOrEqual(after.players[0].maxHp);
    expect(after.battleItems.find((s) => s.item.id === testItem.id)?.remainingUses).toBe(1);
  });

  it('heals a damaged player by the item amount (clamped at maxHp)', () => {
    const engine = setup({
      playerMaxHp: 100,
      playerDefense: 10,
      playerSpeed: 9,
      enemySpeed: 10, // close enough that exactly one enemy action fires before the player's first turn
      enemyAttack: 30,
      initialItems: [{ item: testItem, remainingUses: 1 }],
    });
    // With the enemy slightly faster, it has already hit the player once at battle start.
    const hpAfterHit = engine.getState().players[0].currentHp;
    expect(hpAfterHit).toBeLessThan(100);

    engine.useItem(testItem.id);
    const hpAfterHeal = engine.getState().players[0].currentHp;
    expect(hpAfterHeal).toBe(Math.min(100, hpAfterHit + 20)); // testItem: HEAL 20
  });

  it('is rejected (no-op) once remaining uses reach 0', () => {
    const engine = setup({ initialItems: [{ item: testItem, remainingUses: 1 }] });
    engine.useItem(testItem.id);
    expect(engine.getState().phase).toBe('RESULT_APPLY');
    engine.advance(); // back to COMMAND_SELECT

    const before = engine.getState();
    engine.useItem(testItem.id); // no uses left
    const after = engine.getState();

    expect(after.phase).toBe(before.phase); // still COMMAND_SELECT, nothing happened
    expect(after.players[0].currentHp).toBe(before.players[0].currentHp);
  });

  it('is rejected (no-op) for an unknown item id', () => {
    const engine = setup({ initialItems: [{ item: testItem, remainingUses: 2 }] });
    const before = engine.getState();
    engine.useItem('not_a_real_item');
    const after = engine.getState();
    expect(after.phase).toBe(before.phase);
  });

  it('is rejected (no-op) when not the player\'s turn', () => {
    const engine = setup({ initialItems: [{ item: testItem, remainingUses: 2 }] });
    engine.selectCommand('charge');
    const before = engine.getState(); // SUBJECT_DIFFICULTY_SELECT, not COMMAND_SELECT
    engine.useItem(testItem.id);
    const after = engine.getState();
    expect(after.phase).toBe(before.phase);
  });
});
