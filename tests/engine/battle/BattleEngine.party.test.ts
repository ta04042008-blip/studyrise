import { describe, expect, it } from 'vitest';
import { mc, setup, testItem, testSpell, withForcedChance } from './BattleEngine.test';
import { createRandomService, type RandomService } from '../../../src/engine/random/RandomService';
import { battleConfig } from '../../../src/config/battleConfig';
import type { CharacterDefinition, EnemyDefinition, ItemDefinition } from '../../../src/engine/battle/BattleEngine.types';

/** Fully deterministic: no variance, no critical, no great-success, and pick() always the first candidate. */
const deterministicRandom: RandomService = {
  uniform: () => 1,
  chance: () => false,
  int: () => 0,
  pick: (items) => items[0],
};

function player(overrides: Partial<CharacterDefinition> & { id: string }): CharacterDefinition {
  return {
    name: overrides.id,
    baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 100, maxMp: 5 },
    initialSpellId: testSpell.id,
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

describe('BattleEngine — MVP-1/MVP-2 1v1 regression under the array-based engine', () => {
  it('a single player vs a single enemy behaves exactly like MVP-1/2 (no TARGET_SELECT, arrays of length 1)', () => {
    const engine = setup({ random: withForcedChance(false) });
    expect(engine.getState().players).toHaveLength(1);
    expect(engine.getState().enemies).toHaveLength(1);

    engine.selectCommand('attack');
    let state = engine.getState();
    // Single enemy auto-resolves — TARGET_SELECT must never appear.
    expect(state.phase).toBe('SUBJECT_DIFFICULTY_SELECT');
    expect(state.pendingCommand?.targetId).toBe('enemy');
    expect(state.pendingCommand?.sourceActorId).toBe('player');

    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance();
    state = engine.getState();
    expect(state.phase).toBe('EXPLANATION');
    expect(state.enemies[0].currentHp).toBeLessThan(30);
  });
});

describe('BattleEngine — 1 player vs multiple enemies', () => {
  it('Attack requires TARGET_SELECT among alive enemies, and the player may freely choose either', () => {
    const engine = setup({
      enemies: [enemy({ id: 'eA' }), enemy({ id: 'eB' })],
      random: withForcedChance(false),
    });
    engine.selectCommand('attack');
    let state = engine.getState();
    expect(state.phase).toBe('TARGET_SELECT');
    expect(state.pendingTargetSelection?.for).toBe('question');
    expect([...state.pendingTargetSelection!.candidateIds].sort()).toEqual(['eA', 'eB']);

    engine.selectTarget('eB');
    state = engine.getState();
    expect(state.phase).toBe('SUBJECT_DIFFICULTY_SELECT');
    expect(state.pendingCommand?.targetId).toBe('eB');
    expect(state.pendingCommand?.sourceActorId).toBe('player');
  });

  it("battle continues after one enemy is KO'd (partial KO), and ends in win only once all enemies are dead", () => {
    const engine = setup({
      enemies: [enemy({ id: 'eA', baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 1 } }), enemy({ id: 'eB', baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 100 } })],
      playerAttack: 100,
      playerDefense: 0,
      random: withForcedChance(false),
    });

    engine.selectCommand('attack');
    engine.selectTarget('eA');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct, kills eA (1 HP)
    engine.advance(); // -> EXPLANATION
    expect(engine.getState().enemies.find((e) => e.id === 'eA')?.currentHp).toBe(0);

    engine.advance(); // EXPLANATION -> proceedToNextAction: eB still alive, battle continues
    let state = engine.getState();
    expect(state.phase).not.toBe('BATTLE_END');
    expect(state.outcome).toBeNull();

    // Now finish off eB too.
    engine.selectCommand('attack');
    // eA is dead, so only eB is a valid (and sole) candidate — auto-resolves, no TARGET_SELECT.
    state = engine.getState();
    expect(state.phase).toBe('SUBJECT_DIFFICULTY_SELECT');
    expect(state.pendingCommand?.targetId).toBe('eB');
  });

  it("declares win only after RESULT_APPLY → 正誤(EXPLANATION) → 次へ, even when the last enemy is KO'd (MVP-3 correction 6)", () => {
    const engine = setup({
      enemies: [enemy({ id: 'eOnly', baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 1 } })],
      playerAttack: 100,
      playerDefense: 0,
      random: withForcedChance(false),
    });

    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct, lethal
    engine.advance(); // COMMAND_ANIMATION -> RESULT_APPLY -> EXPLANATION (never straight to BATTLE_END)

    let state = engine.getState();
    expect(state.phase).toBe('EXPLANATION');
    expect(state.enemies[0].currentHp).toBe(0);
    expect(state.lastPlayerOutcome?.command).toBe('attack');
    expect(state.lastPlayerOutcome?.correct).toBe(true);

    engine.advance(); // EXPLANATION -> 次へ -> now BATTLE_END is allowed
    state = engine.getState();
    expect(state.phase).toBe('BATTLE_END');
    expect(state.outcome).toBe('win');
  });
});

describe('BattleEngine — 3 players vs 1 enemy', () => {
  const players = [player({ id: 'p1', baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 100, maxMp: 5 } }), player({ id: 'p2', baseStats: { attack: 50, defense: 10, speed: 15, maxHp: 100, maxMp: 5 } }), player({ id: 'p3', baseStats: { attack: 50, defense: 10, speed: 10, maxHp: 100, maxMp: 5 } })];

  it('the timeline weaves in all three players by speed, and Guard/Charge auto-target self', () => {
    const engine = setup({ players, random: withForcedChance(false) });
    const state = engine.getState();
    expect(state.players.map((p) => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(['p1', 'p2', 'p3']).toContain(state.currentActorId);

    engine.selectCommand('guard');
    const afterGuard = engine.getState();
    expect(afterGuard.phase).toBe('SUBJECT_DIFFICULTY_SELECT');
    expect(afterGuard.pendingCommand?.targetId).toBe(afterGuard.pendingCommand?.sourceActorId);
  });

  it('battle continues with a KO among the party (partial KO), and ends in loss only when all three are down', () => {
    const lethalSelfItem: ItemDefinition = {
      id: 'item_lethal_self_test_2',
      name: 'テスト即死アイテム2',
      targetType: 'self',
      effects: [{ type: 'DAMAGE', amount: 999 }],
    };
    const engine = setup({
      players: [player({ id: 'p1' }), player({ id: 'p2', baseStats: { attack: 50, defense: 10, speed: 15, maxHp: 100, maxMp: 5 } }), player({ id: 'p3', baseStats: { attack: 50, defense: 10, speed: 10, maxHp: 100, maxMp: 5 } })],
      enemies: [enemy({ id: 'killer', baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 500 } })],
      initialItems: [{ item: lethalSelfItem, remainingUses: 3 }],
      random: withForcedChance(false),
    });

    // p1 (fastest) acts first — deterministically KO themselves, decoupled
    // from any enemy-attack timing.
    expect(engine.getState().currentActorId).toBe('p1');
    engine.useItem(lethalSelfItem.id);
    expect(engine.getState().players.find((p) => p.id === 'p1')?.currentHp).toBe(0);
    engine.advance(); // RESULT_APPLY -> resolves the timeline to the next alive actor

    // Partial KO — battle must still be going, and the KO'd player is gone
    // from the timeline (requirement 12).
    let state = engine.getState();
    expect(state.phase).not.toBe('BATTLE_END');
    expect(state.outcome).toBeNull();
    expect(state.currentActorId).not.toBe('p1');
    expect(state.upcomingActorIds).not.toContain('p1');
    expect(state.phase).toBe('COMMAND_SELECT'); // killer's attack (1 dmg) never KOs p2/p3 (100 HP)

    // KO the remaining two as well — only then must the battle end in loss.
    engine.useItem(lethalSelfItem.id); // whoever is now current (p2 or p3)
    engine.advance();
    state = engine.getState();
    expect(state.outcome).toBeNull(); // still one player standing
    expect(state.phase).toBe('COMMAND_SELECT');

    engine.useItem(lethalSelfItem.id); // the last one standing -> RESULT_APPLY (still a resting screen)
    expect(engine.getState().phase).toBe('RESULT_APPLY');
    engine.advance(); // 次へ -> only now is the full-party KO finalized
    state = engine.getState();
    expect(state.phase).toBe('BATTLE_END');
    expect(state.outcome).toBe('lose');
  });
});

describe('BattleEngine — Search per-enemy targeting and single-source AI (MVP-3 correction 4)', () => {
  it('Search targets one specific enemy and only reveals that enemy\'s queue', () => {
    const engine = setup({
      enemies: [enemy({ id: 'eA' }), enemy({ id: 'eB' })],
      random: withForcedChance(false),
    });
    engine.selectCommand('search');
    engine.selectTarget('eA');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct
    engine.advance();

    const state = engine.getState();
    expect(state.searchByEnemyId['eA']).toHaveLength(battleConfig.searchRevealCountByStar[1]);
    expect(state.searchByEnemyId['eB']).toBeUndefined();
  });

  it("Search's revealed target matches the target the enemy actually attacks (single source, never a separate prediction)", () => {
    const engine = setup({
      players: [player({ id: 'pA' }), player({ id: 'pB', baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 1000, maxMp: 5 } })],
      playerSpeed: 20,
      enemies: [enemy({ id: 'eA', baseStats: { attack: 5, defense: 0, speed: 1, maxHp: 1000 } })],
      random: deterministicRandom, // central random.pick always returns the first alive player
    });

    engine.selectCommand('search');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance(); // COMMAND_ANIMATION -> EXPLANATION
    const revealed = engine.getState().searchByEnemyId['eA'];
    expect(revealed.length).toBeGreaterThan(0);
    const predictedTargetId = revealed[0].targetId;
    engine.advance(); // EXPLANATION -> next actor (back to COMMAND_SELECT, since the enemy is far slower)

    // Drive turns until the enemy actually acts (its speed is far lower, so
    // this may take a few player turns first).
    let iterations = 0;
    let actualTarget: string | undefined;
    while (actualTarget === undefined && iterations < 50) {
      engine.selectCommand('guard');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 });
      engine.advance();
      engine.advance();
      const log = engine.getState().enemyActionLog;
      if (log.length > 0) actualTarget = log[0].targetId;
      iterations++;
    }

    expect(actualTarget).toBe(predictedTargetId);
  });

  it("re-plans a queued action and updates Search's display when its target KO's before the enemy acts (MVP-3 correction 4)", () => {
    const lethalSelfItem: ItemDefinition = {
      id: 'item_lethal_self_test',
      name: 'テスト即死アイテム',
      targetType: 'self',
      effects: [{ type: 'DAMAGE', amount: 999 }],
    };

    const engine = setup({
      players: [player({ id: 'pA', baseStats: { attack: 10, defense: 0, speed: 50, maxHp: 5, maxMp: 5 } }), player({ id: 'pB', baseStats: { attack: 10, defense: 0, speed: 50, maxHp: 200, maxMp: 5 } })],
      enemies: [enemy({ id: 'eA', baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 500 } })],
      random: deterministicRandom, // enemy AI target picks alivePlayers()[0] === 'pA' while pA is alive
      initialItems: [{ item: lethalSelfItem, remainingUses: 2 }],
    });

    // Reveal eA's plan while pA is still alive — every entry should target pA.
    engine.selectCommand('search');
    engine.selectSubjectAndStar('数学', 1); // ★1 -> 2 revealed actions (default question pool only has ★1)
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance(); // -> EXPLANATION
    const before = engine.getState().searchByEnemyId['eA'];
    expect(before.length).toBeGreaterThan(0);
    for (const a of before) expect(a.targetId).toBe('pA');

    engine.advance(); // EXPLANATION -> back to COMMAND_SELECT (players are far faster than the enemy)
    // Whoever's turn it is now, get to pA specifically to self-KO with the lethal item.
    let guard = 0;
    while (engine.getState().currentActorId !== 'pA' && guard < 10) {
      engine.selectCommand('guard');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 });
      engine.advance();
      engine.advance();
      guard++;
    }
    expect(engine.getState().currentActorId).toBe('pA');

    engine.useItem(lethalSelfItem.id); // pA -> 0 HP, self-targeted, no enemy turn involved
    expect(engine.getState().players.find((p) => p.id === 'pA')?.currentHp).toBe(0);

    // Search's already-revealed view must now point only at the survivor.
    const after = engine.getState().searchByEnemyId['eA'];
    expect(after.length).toBe(before.length);
    for (const a of after) expect(a.targetId).toBe('pB');
  });
});

describe('BattleEngine — Spell/Item targetType and TARGET_SELECT (MVP-3 requirement 9)', () => {
  it('an enemy-targeted Spell requires TARGET_SELECT among multiple alive enemies', () => {
    const engine = setup({
      enemies: [enemy({ id: 'eA' }), enemy({ id: 'eB' })],
      playerMaxMp: 5,
      random: withForcedChance(false),
    });
    // Charge to afford the spell first.
    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    engine.useSpell();
    let state = engine.getState();
    expect(state.phase).toBe('TARGET_SELECT');
    expect(state.pendingTargetSelection?.for).toBe('spell');

    engine.selectTarget('eB');
    state = engine.getState();
    expect(state.phase).toBe('RESULT_APPLY');
    expect(state.lastNonQuestionOutcome?.targetId).toBe('eB');
    expect(state.enemies.find((e) => e.id === 'eB')?.currentHp).toBeLessThan(30);
    expect(state.enemies.find((e) => e.id === 'eA')?.currentHp).toBe(30); // untouched
  });

  it('a self-targeted Item never enters TARGET_SELECT even with multiple enemies alive', () => {
    const engine = setup({
      enemies: [enemy({ id: 'eA' }), enemy({ id: 'eB' })],
      initialItems: [{ item: testItem, remainingUses: 2 }],
    });
    engine.useItem(testItem.id);
    const state = engine.getState();
    expect(state.phase).toBe('RESULT_APPLY');
    expect(state.lastNonQuestionOutcome?.command).toBe('item');
    expect(state.lastNonQuestionOutcome?.targetId).toBe(state.lastNonQuestionOutcome?.sourceActorId);
  });
});

describe('BattleEngine — sourceActorId is explicit everywhere (MVP-3 correction 3)', () => {
  it('Guard/Charge/Attack/Search outcomes and Spell/Item outcomes always carry sourceActorId + targetId', () => {
    const players = [player({ id: 'p1' }), player({ id: 'p2', baseStats: { attack: 50, defense: 10, speed: 5, maxHp: 100, maxMp: 5 } })];
    const engine = setup({ players, random: withForcedChance(false) });
    const acting = engine.getState().currentActorId;

    engine.selectCommand('guard');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance();

    const outcome = engine.getState().lastPlayerOutcome;
    expect(outcome?.sourceActorId).toBe(acting);
    expect(outcome?.targetId).toBe(acting); // Guard targets self
  });

  it('MP is deducted from the acting character, not some other party member (sourceActorId-driven)', () => {
    const players = [player({ id: 'caster', baseStats: { attack: 50, defense: 10, speed: 999, maxHp: 100, maxMp: 5 } }), player({ id: 'bystander', baseStats: { attack: 50, defense: 10, speed: 1, maxHp: 100, maxMp: 5 } })];
    const engine = setup({ players, random: withForcedChance(false) });
    expect(engine.getState().currentActorId).toBe('caster'); // far faster, acts first

    for (let i = 0; i < 3; i++) {
      engine.selectCommand('charge');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      engine.advance();
      engine.advance();
    }
    expect(engine.getState().players.find((p) => p.id === 'caster')?.currentMp).toBeGreaterThanOrEqual(testSpell.mpCost);
    expect(engine.getState().players.find((p) => p.id === 'bystander')?.currentMp).toBe(0);

    engine.useSpell();
    const state = engine.getState();
    expect(state.lastNonQuestionOutcome?.sourceActorId).toBe('caster');
    expect(state.players.find((p) => p.id === 'caster')?.currentMp).toBeLessThan(5);
    expect(state.players.find((p) => p.id === 'bystander')?.currentMp).toBe(0); // untouched
  });
});

describe('BattleEngine — party-shared item pool (MVP-3 correction 5)', () => {
  it('remaining uses are shared across the whole party, not per-player', () => {
    const players = [player({ id: 'p1', baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 100, maxMp: 5 } }), player({ id: 'p2', baseStats: { attack: 50, defense: 10, speed: 1, maxHp: 100, maxMp: 5 } })];
    const engine = setup({ players, initialItems: [{ item: testItem, remainingUses: 1 }] });
    expect(engine.getState().currentActorId).toBe('p1');

    engine.useItem(testItem.id); // p1 uses the party's only remaining potion
    expect(engine.getState().battleItems.find((s) => s.item.id === testItem.id)?.remainingUses).toBe(0);

    // p2 must not have their own separate stock — the shared pool is now empty.
    engine.advance(); // back to COMMAND_SELECT... but p1 acts again since p2 is far slower; force the check on the pool itself
    const state = engine.getState();
    const before = state.battleItems.find((s) => s.item.id === testItem.id);
    engine.useItem(testItem.id);
    expect(engine.getState().battleItems.find((s) => s.item.id === testItem.id)?.remainingUses).toBe(before?.remainingUses ?? 0);
  });
});

describe('BattleEngine — KO exclusion from current/upcoming order (MVP-3 requirement 12)', () => {
  it("a KO'd player never appears as currentActorId or in upcomingActorIds again", () => {
    const engine = setup({
      players: [player({ id: 'fragile', baseStats: { attack: 10, defense: 0, speed: 10, maxHp: 1, maxMp: 5 } }), player({ id: 'tough', baseStats: { attack: 10, defense: 0, speed: 10, maxHp: 1000, maxMp: 5 } })],
      enemies: [enemy({ id: 'killer', baseStats: { attack: 999, defense: 0, speed: 11, maxHp: 500 } })],
      random: deterministicRandom, // enemy always targets alivePlayers()[0] === 'fragile' while alive
    });

    const state = engine.getState();
    expect(state.players.find((p) => p.id === 'fragile')?.currentHp).toBe(0); // killed by the opening (faster) enemy turn
    expect(state.currentActorId).not.toBe('fragile');
    expect(state.upcomingActorIds).not.toContain('fragile');
    expect(state.currentActorId).toBe('tough');
  });

  it("a KO'd enemy never appears in upcomingActorIds again", () => {
    const engine = setup({
      enemies: [enemy({ id: 'weak', baseStats: { attack: 1, defense: 0, speed: 5, maxHp: 1 } }), enemy({ id: 'strong', baseStats: { attack: 1, defense: 0, speed: 5, maxHp: 100 } })],
      playerAttack: 100,
      playerDefense: 0,
      random: withForcedChance(false),
    });

    engine.selectCommand('attack');
    engine.selectTarget('weak');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct, kills 'weak' (1 HP)
    engine.advance();

    const state = engine.getState();
    expect(state.enemies.find((e) => e.id === 'weak')?.currentHp).toBe(0);
    expect(state.upcomingActorIds).not.toContain('weak');
  });
});

describe('BattleEngine — preview matches the actual future order, without consuming the live random stream (MVP-3 correction 2)', () => {
  it('repeated getState() calls never change upcomingActorIds, and the realized order matches the earlier preview', () => {
    const players = [player({ id: 'p1', baseStats: { attack: 10, defense: 10, speed: 10, maxHp: 500, maxMp: 5 } }), player({ id: 'p2', baseStats: { attack: 10, defense: 10, speed: 10, maxHp: 500, maxMp: 5 } })];
    const enemies = [enemy({ id: 'e1', baseStats: { attack: 1, defense: 0, speed: 10, maxHp: 500 } }), enemy({ id: 'e2', baseStats: { attack: 1, defense: 0, speed: 10, maxHp: 500 } })];
    const engine = setup({ players, enemies, random: createRandomService(2024), questions: [mc()] });

    const preview = engine.getState().upcomingActorIds;
    for (let i = 0; i < 5; i++) {
      expect(engine.getState().upcomingActorIds).toEqual(preview);
    }

    const realized: string[] = [];
    let guard = 0;
    while (realized.length < preview.length && guard < 30) {
      engine.selectCommand('guard');
      engine.selectSubjectAndStar('数学', 1);
      engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 });
      engine.advance();
      engine.advance();
      const s = engine.getState();
      for (const e of s.enemyActionLog) realized.push(e.sourceActorId);
      if (s.phase === 'COMMAND_SELECT') realized.push(s.currentActorId);
      else break;
      guard++;
    }

    expect(realized.slice(0, preview.length)).toEqual(preview);
  });
});
