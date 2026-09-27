import { describe, expect, it } from 'vitest';
import { setup, testHealSpell, testSpell } from './BattleEngine.test';

/**
 * MVP-4 (spec §4.5): a character can know up to 3 spells at once via
 * roguelite NEW_SPELL rewards. useSpell(spellId) must let the caller pick
 * among them, while the MVP-1〜3 single-known-spell case (exercised
 * throughout BattleEngine.spell.test.ts) stays byte-identical.
 */
describe('BattleEngine — multiple known spells (spec §4.5)', () => {
  it('can cast either of two known spells by id, each with its own MP cost and effect', () => {
    const engine = setup({
      playerMaxMp: 5,
      playerMaxHp: 100,
      enemyMaxHp: 100,
      spellsById: { [testSpell.id]: testSpell, [testHealSpell.id]: testHealSpell },
      knownSpellsByPlayerId: { player: [{ spellId: testSpell.id, level: 1 }, { spellId: testHealSpell.id, level: 1 }] },
    });

    expect(engine.getState().knownSpellsByPlayerId['player']).toHaveLength(2);

    // Charge to 5 MP (enough for either spell).
    for (let i = 0; i < 5; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    const mpBefore = engine.getState().players[0].currentMp;
    const enemyHpBefore = engine.getState().enemies[0].currentHp;

    engine.useSpell(testSpell.id); // the enemy-targeted DAMAGE spell
    const afterFirst = engine.getState();
    expect(afterFirst.players[0].currentMp).toBe(mpBefore - testSpell.levels[0].mpCost);
    expect(afterFirst.enemies[0].currentHp).toBeLessThan(enemyHpBefore);
  });

  it('rejects (no-op) a spellId the current actor does not know', () => {
    const engine = setup({
      playerMaxMp: 5,
      spellsById: { [testSpell.id]: testSpell, [testHealSpell.id]: testHealSpell },
      knownSpellsByPlayerId: { player: [{ spellId: testSpell.id, level: 1 }] }, // only testSpell known
    });
    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    const before = engine.getState();
    engine.useSpell(testHealSpell.id); // not known
    const after = engine.getState();
    expect(after.phase).toBe(before.phase);
    expect(after.players[0].currentMp).toBe(before.players[0].currentMp);
  });

  it('resolves MP cost and effects from the known spell\'s current level, not always level 1', () => {
    const engine = setup({
      playerMaxMp: 5,
      enemyMaxHp: 100,
      spellsById: { [testSpell.id]: testSpell },
      knownSpellsByPlayerId: { player: [{ spellId: testSpell.id, level: 2 }] }, // pre-leveled, as RogueliteEngine would provide
    });
    expect(engine.getState().knownSpellsByPlayerId['player'][0]).toMatchObject({
      spellId: testSpell.id,
      level: 2,
      mpCost: testSpell.levels[1].mpCost,
    });

    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    const enemyHpBefore = engine.getState().enemies[0].currentHp;
    engine.useSpell(testSpell.id);
    const state = engine.getState();
    expect(enemyHpBefore - state.enemies[0].currentHp).toBe(testSpell.levels[1].effects[0].type === 'DAMAGE' ? (testSpell.levels[1].effects[0] as { amount: number }).amount : -1);
  });
});
