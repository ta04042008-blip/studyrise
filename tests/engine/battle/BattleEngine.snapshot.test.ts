import { describe, expect, it } from 'vitest';
import { mc, setup, testItem, testSpell } from './BattleEngine.test';
import { createBattleEngine, restoreBattleEngine } from '../../../src/engine/battle/BattleEngine';
import { createQuestionEngine } from '../../../src/engine/question/QuestionEngine';
import { createRandomService, type RandomService } from '../../../src/engine/random/RandomService';
import { battleConfig } from '../../../src/config/battleConfig';
import type { CharacterDefinition, EnemyDefinition } from '../../../src/engine/battle/BattleEngine.types';

/**
 * MVP-9: BattleEngineSnapshot must let a reload continue the EXACT same
 * future random sequence, timeline, and enemy planned-action queue a
 * non-reloaded session would have produced (user's explicit MVP-9
 * instruction — no reseeding, no reconstruction from the player-visible
 * `searchByEnemyId` subset).
 */

function player(overrides: Partial<CharacterDefinition> & { id: string }): CharacterDefinition {
  return {
    name: overrides.id,
    baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 100, maxMp: 5 },
    initialSpellId: testSpell.id,
    additionalSpellPoolIds: [],
    ...overrides,
  };
}

function enemy(overrides: Partial<EnemyDefinition> & { id: string }): EnemyDefinition {
  return {
    name: overrides.id,
    baseStats: { attack: 10, defense: 5, speed: 5, maxHp: 30 },
    ...overrides,
  };
}

describe('BattleEngine — exportSnapshot()/restoreBattleEngine() (MVP-9)', () => {
  it('round-trips getState() unchanged when restored immediately after export', () => {
    const engine = setup();
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });

    const snap = engine.exportSnapshot();
    const random = createRandomService(999); // irrelevant seed — restore must ignore it and use snap.randomState
    const questionEngine = createQuestionEngine([mc()], random, snap.questionEngineSnapshot);
    const restored = restoreBattleEngine(snap, {
      questionEngine,
      config: battleConfig,
      random,
      spellsById: { [testSpell.id]: testSpell },
      playerCommandModifiers: {},
    });

    expect(restored.getState()).toEqual(engine.getState());
  });

  it('throws a clear error if exportSnapshot() is called with a non-stateful RandomService', () => {
    const plainRandom: RandomService = {
      uniform: () => 0.5,
      chance: () => false,
      int: () => 0,
      pick: (items) => items[0],
    };
    const engine = setup({ random: plainRandom });
    expect(() => engine.exportSnapshot()).toThrow(/exportState/);
  });

  it('a restored engine continues the exact same future main-RNG sequence as the un-reloaded original', () => {
    // Two independently-constructed engines from the same seed/content, so
    // they start perfectly in sync.
    const build = () => {
      const random = createRandomService(42);
      const questionEngine = createQuestionEngine([mc({ star: 1 }), mc({ id: 'q2', star: 1, unit: 'u2' })], random);
      return createBattleEngine({
        // Two players so decideNextEnemyAction's random target pick (and
        // the timeline's same-speed tie-break) are both actually exercised
        // — if enemyPlannedActions/timelineRandomState were reconstructed
        // incorrectly, `original` and `resumed` would diverge on exactly
        // this kind of roll.
        players: [player({ id: 'p1' }), player({ id: 'p2' })],
        enemies: [enemy({ id: 'enemy' })],
        questionEngine,
        config: battleConfig,
        random,
        spellsById: { [testSpell.id]: testSpell },
        initialItems: [{ item: testItem, remainingUses: 2 }],
      });
    };

    const original = build();
    const reloaded = build();

    // Drive both identically up to a checkpoint.
    function attackOnce(e: ReturnType<typeof build>) {
      e.selectCommand('attack');
      e.selectSubjectAndStar('数学', 1);
      e.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      e.advance(); // -> EXPLANATION
      e.advance(); // -> next action (enemy turn or COMMAND_SELECT)
    }
    attackOnce(original);
    attackOnce(reloaded);
    expect(reloaded.getState()).toEqual(original.getState());

    // "Reload" only the second engine: export + restore from scratch,
    // discarding the live `reloaded` instance and its in-memory random.
    const snap = reloaded.exportSnapshot();
    const freshRandom = createRandomService(1); // must be ignored — restore continues from snap.randomState
    const freshQuestionEngine = createQuestionEngine(
      [mc({ star: 1 }), mc({ id: 'q2', star: 1, unit: 'u2' })],
      freshRandom,
      snap.questionEngineSnapshot,
    );
    const resumed = restoreBattleEngine(snap, {
      questionEngine: freshQuestionEngine,
      config: battleConfig,
      random: freshRandom,
      spellsById: { [testSpell.id]: testSpell },
      playerCommandModifiers: {},
    });

    // Continue BOTH the original (never reloaded) and the resumed clone
    // through several more identical actions — every future roll (damage
    // variance, crit, question pick) must match exactly.
    for (let i = 0; i < 3; i++) {
      if (original.getState().phase === 'BATTLE_END') break;
      attackOnce(original);
      attackOnce(resumed);
      expect(resumed.getState()).toEqual(original.getState());
    }
  });

  it('preserves the full enemy planned-action queue (not just the player-visible searchByEnemyId prefix) across a reload', () => {
    // Two players so decideNextEnemyAction's random target pick is
    // meaningful (with one player it would always be forced).
    const build = () => {
      const random = createRandomService(7);
      const questionEngine = createQuestionEngine(
        [mc({ id: 'q1', star: 3 }), mc({ id: 'q2', star: 1, unit: 'u2' })],
        random,
      );
      return createBattleEngine({
        players: [player({ id: 'p1' }), player({ id: 'p2' })],
        enemies: [enemy({ id: 'enemy' })],
        questionEngine,
        config: battleConfig,
        random,
        spellsById: { [testSpell.id]: testSpell },
        initialItems: [{ item: testItem, remainingUses: 2 }],
      });
    };

    const engine = build();
    // Search at ★3 reveals more than one action ahead (battleConfig.searchRevealCountByStar[3] >= 2).
    // A single enemy auto-resolves the target — no TARGET_SELECT step.
    engine.selectCommand('search');
    engine.selectSubjectAndStar('数学', 3);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance(); // -> EXPLANATION
    const revealedBeforeReload = engine.getState().searchByEnemyId['enemy'];
    expect(revealedBeforeReload.length).toBeGreaterThan(1);

    const snap = engine.exportSnapshot();
    expect(snap.enemyPlannedActions['enemy']).toEqual(revealedBeforeReload);
    expect(snap.revealedCountByEnemyId['enemy']).toBe(revealedBeforeReload.length);

    const random = createRandomService(1); // must be ignored
    const questionEngine = createQuestionEngine(
      [mc({ id: 'q1', star: 3 }), mc({ id: 'q2', star: 1, unit: 'u2' })],
      random,
      snap.questionEngineSnapshot,
    );
    const restored = restoreBattleEngine(snap, {
      questionEngine,
      config: battleConfig,
      random,
      spellsById: { [testSpell.id]: testSpell },
      playerCommandModifiers: {},
    });

    expect(restored.getState().searchByEnemyId['enemy']).toEqual(revealedBeforeReload);
  });
});
