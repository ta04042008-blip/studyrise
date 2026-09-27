import { describe, expect, it } from 'vitest';
import { mc, setup, withForcedChance } from './BattleEngine.test';
import { battleConfig } from '../../../src/config/battleConfig';

function search(engine: ReturnType<typeof setup>, star: 1 | 2 | 3 | 4 | 5, selectedIndex: number) {
  engine.selectCommand('search');
  engine.selectSubjectAndStar('数学', star);
  engine.submitAnswer({ type: 'multiple_choice', selectedIndex });
  engine.advance();
}

describe('BattleEngine — Search', () => {
  it('reveals the ★-based number of upcoming actions on success (2/3/4/6/8)', () => {
    for (const star of [1, 2, 3, 4, 5] as const) {
      const engine = setup({ random: withForcedChance(false), questions: [mc({ star })] });
      search(engine, star, 1); // correct
      const state = engine.getState();
      const revealed = state.searchByEnemyId['enemy'];
      expect(revealed).toHaveLength(battleConfig.searchRevealCountByStar[star]);
      for (const action of revealed) {
        expect(action).toEqual({ actionName: 'アタック', targetId: 'player' });
      }
    }
  });

  it('reveals nothing on an incorrect/dont_know answer (complete failure)', () => {
    const engine = setup({ random: withForcedChance(false) });
    search(engine, 1, 0); // wrong
    const state = engine.getState();
    expect(state.searchByEnemyId['enemy']).toBeUndefined();
    const outcome = state.lastPlayerOutcome;
    if (outcome?.command === 'search') {
      expect(outcome.success).toBe(false);
      expect(outcome.revealedActions).toEqual([]);
    }
  });

  it('re-searching the same enemy overwrites the previous reveal (fresh list at the new ★)', () => {
    const engine = setup({
      random: withForcedChance(false),
      questions: [mc({ id: 'q1', star: 1 }), mc({ id: 'q2', star: 3, unit: '別単元' })],
    });
    search(engine, 1, 1); // ★1 -> 2 revealed
    expect(engine.getState().searchByEnemyId['enemy']).toHaveLength(2);
    engine.advance(); // EXPLANATION -> back to COMMAND_SELECT (player is faster here, no enemy action yet)

    search(engine, 3, 1); // ★3 -> 4 revealed, overwrites
    expect(engine.getState().searchByEnemyId['enemy']).toHaveLength(4);
  });

  it('the content shown is only actionName + targetId — no power/probability fields', () => {
    const engine = setup({ random: withForcedChance(false) });
    search(engine, 1, 1);
    const revealed = engine.getState().searchByEnemyId['enemy'];
    for (const action of revealed) {
      expect(Object.keys(action).sort()).toEqual(['actionName', 'targetId']);
    }
  });

  it('the enemy actually acting consumes one revealed entry, and the revealed list is the same queue the enemy executes from', () => {
    const engine = setup({
      random: withForcedChance(false),
      playerSpeed: 10,
      enemySpeed: 9, // exactly one enemy action fires per player turn (see Guard tests)
      playerMaxHp: 1000,
    });
    search(engine, 1, 1); // ★1 -> 2 revealed: [アタック, アタック]
    expect(engine.getState().searchByEnemyId['enemy']).toHaveLength(2);

    engine.advance(); // resolve the enemy's turn — should consume one queue entry
    const state = engine.getState();
    expect(state.enemyActionLog).toHaveLength(1);
    expect(state.enemyActionLog[0].sourceActorId).toBe('enemy');
    expect(state.searchByEnemyId['enemy']).toHaveLength(1); // one fewer than before
  });

  it('does not clear a previous successful reveal when the enemy has not yet acted and no re-search happened', () => {
    const engine = setup({ random: withForcedChance(false) });
    search(engine, 1, 1);
    const first = engine.getState().searchByEnemyId['enemy'];
    expect(first).toHaveLength(2);
    // Reading state again without any further action must not change it.
    expect(engine.getState().searchByEnemyId['enemy']).toEqual(first);
  });
});
