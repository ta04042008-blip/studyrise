import { describe, expect, it } from 'vitest';
import { createBattleEngine } from '../../../src/engine/battle/BattleEngine';
import { createQuestionEngine } from '../../../src/engine/question/QuestionEngine';
import { createRandomService, type RandomService } from '../../../src/engine/random/RandomService';
import { battleConfig } from '../../../src/config/battleConfig';
import type { BattleConfig } from '../../../src/config/battleConfig';
import type {
  CharacterDefinition,
  EnemyDefinition,
  ItemBattleSlot,
  SpellDefinition,
} from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

export function mc(overrides: Partial<MultipleChoiceQuestion> = {}): MultipleChoiceQuestion {
  return {
    id: 'q1',
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    format: 'multiple_choice',
    text: '1 + 1 は？',
    choices: ['1', '2'],
    correctIndex: 1,
    explanation: '1 + 1 = 2 です。',
    ...overrides,
  };
}

export const testSpell: SpellDefinition = {
  id: 'spell_test',
  name: 'テストスペル',
  mpCost: 3,
  targetType: 'enemy',
  effects: [{ type: 'DAMAGE', amount: 15 }],
};

export const testHealSpell: SpellDefinition = {
  id: 'spell_test_heal',
  name: 'テスト回復スペル',
  mpCost: 2,
  targetType: 'self',
  effects: [{ type: 'HEAL', amount: 10 }],
};

export const testItem = {
  id: 'item_test_potion',
  name: 'テスト回復薬',
  targetType: 'self' as const,
  effects: [{ type: 'HEAL' as const, amount: 20 }],
};

/** A RandomService whose `chance()` always returns a fixed result; everything else delegates to a real seeded RNG. */
export function withForcedChance(result: boolean, seed = 1): RandomService {
  const real = createRandomService(seed);
  return {
    uniform: real.uniform,
    chance: () => result,
    int: real.int,
    pick: real.pick,
  };
}

export function setup(opts?: {
  playerAttack?: number;
  playerDefense?: number;
  playerSpeed?: number;
  playerMaxHp?: number;
  playerMaxMp?: number;
  enemyAttack?: number;
  enemyDefense?: number;
  enemySpeed?: number;
  enemyMaxHp?: number;
  questions?: MultipleChoiceQuestion[];
  seed?: number;
  /** Overrides the seeded RandomService (e.g. to force/forbid a great-success roll deterministically). */
  random?: RandomService;
  spellsById?: Record<string, SpellDefinition>;
  initialSpellId?: string;
  initialItems?: ItemBattleSlot[];
  config?: BattleConfig;
}) {
  const playerDef: CharacterDefinition = {
    id: 'player',
    name: 'Hero',
    baseStats: {
      attack: opts?.playerAttack ?? 50,
      defense: opts?.playerDefense ?? 10,
      speed: opts?.playerSpeed ?? 20,
      maxHp: opts?.playerMaxHp ?? 100,
      maxMp: opts?.playerMaxMp ?? 5,
    },
    initialSpellId: opts?.initialSpellId ?? testSpell.id,
  };
  const enemyDef: EnemyDefinition = {
    id: 'enemy',
    name: 'Slime',
    baseStats: {
      attack: opts?.enemyAttack ?? 10,
      defense: opts?.enemyDefense ?? 5,
      speed: opts?.enemySpeed ?? 5,
      maxHp: opts?.enemyMaxHp ?? 30,
    },
  };
  const random = opts?.random ?? createRandomService(opts?.seed ?? 1);
  const questionEngine = createQuestionEngine(opts?.questions ?? [mc()], random);
  const engine = createBattleEngine({
    player: playerDef,
    enemy: enemyDef,
    questionEngine,
    config: opts?.config ?? battleConfig,
    random,
    spellsById: opts?.spellsById ?? { [testSpell.id]: testSpell },
    initialItems: opts?.initialItems ?? [{ item: testItem, remainingUses: 2 }],
  });
  return engine;
}

describe('BattleEngine — player Attack flow', () => {
  it('follows COMMAND_SELECT → SUBJECT_DIFFICULTY_SELECT → QUESTION, auto-resolving the target', () => {
    const engine = setup();
    expect(engine.getState().phase).toBe('COMMAND_SELECT');

    engine.selectCommand('attack');
    let state = engine.getState();
    expect(state.phase).toBe('SUBJECT_DIFFICULTY_SELECT');
    expect(state.pendingCommand?.targetId).toBe('enemy');

    engine.selectSubjectAndStar('数学', 1);
    state = engine.getState();
    expect(state.phase).toBe('QUESTION');
    expect(state.pendingCommand?.question?.id).toBe('q1');
  });

  it('locks command/target/subject/star/question after the question is shown', () => {
    const engine = setup();
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    const beforePhase = engine.getState().phase;

    // Attempting to re-select the command or re-pick subject/star while QUESTION is up must have no effect.
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);

    expect(engine.getState().phase).toBe(beforePhase);
  });

  it('on a correct answer, does NOT mutate enemy HP until advance() applies RESULT_APPLY', () => {
    const engine = setup();
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct

    const afterSubmit = engine.getState();
    expect(afterSubmit.phase).toBe('COMMAND_ANIMATION');
    expect(afterSubmit.enemy.currentHp).toBe(30); // unchanged

    engine.advance();
    const afterApply = engine.getState();
    expect(afterApply.phase).toBe('EXPLANATION');
    expect(afterApply.enemy.currentHp).toBeLessThan(30);
    const outcome = afterApply.lastPlayerOutcome;
    expect(outcome?.correct).toBe(true);
    expect(outcome?.command).toBe('attack');
    if (outcome?.command === 'attack') {
      expect(outcome.damage).toBeGreaterThan(0);
    }
  });

  it('on an incorrect answer, still passes through COMMAND_ANIMATION → RESULT_APPLY → EXPLANATION with 0 damage', () => {
    const engine = setup();
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 }); // wrong

    expect(engine.getState().phase).toBe('COMMAND_ANIMATION');
    engine.advance();

    const state = engine.getState();
    expect(state.phase).toBe('EXPLANATION');
    expect(state.enemy.currentHp).toBe(30);
    const outcome = state.lastPlayerOutcome;
    expect(outcome?.correct).toBe(false);
    if (outcome?.command === 'attack') {
      expect(outcome.damage).toBe(0);
    }
  });

  it('on "わからない" (dont_know), behaves like an incorrect answer', () => {
    const engine = setup();
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'dont_know' });
    engine.advance();

    const state = engine.getState();
    expect(state.enemy.currentHp).toBe(30);
    expect(state.lastPlayerOutcome?.correct).toBe(false);
    expect(state.lastPlayerOutcome?.selectedAnswerIndex).toBeNull();
  });
});

describe('BattleEngine — MP starts at 0 (spec §8: MP resets to 0 at zone start)', () => {
  it('player MP is 0 at battle start, not maxMp', () => {
    const engine = setup({ playerMaxMp: 5 });
    const state = engine.getState();
    expect(state.player.currentMp).toBe(0);
    expect(state.player.maxMp).toBe(5);
  });
});

describe('BattleEngine — idempotency', () => {
  it('ignores a duplicate submitAnswer after the first has already moved the phase forward', () => {
    const engine = setup();
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    const afterFirst = engine.getState();

    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 }); // duplicate tap, different answer
    const afterSecond = engine.getState();

    expect(afterSecond.phase).toBe(afterFirst.phase);
    expect(afterSecond.pendingOutcome).toEqual(afterFirst.pendingOutcome);
  });

  it('ignores advance() called from a phase where it has no meaning', () => {
    const engine = setup();
    expect(() => engine.advance()).not.toThrow();
    expect(engine.getState().phase).toBe('COMMAND_SELECT');
  });
});

describe('BattleEngine — enemy turn and win/loss', () => {
  it('lets a faster enemy act multiple times before the player gets its first turn (speed-driven order from battle start, spec §5.2)', () => {
    // enemy speed 20 vs player speed 5 -> 4:1 ratio, same math as actionTimeline.test.ts
    const engine = setup({ playerSpeed: 5, enemySpeed: 20, playerMaxHp: 500, enemyMaxHp: 500 });
    const state = engine.getState();

    expect(state.enemyActionLog).toHaveLength(4);
    expect(state.player.currentHp).toBeLessThan(500);
    expect(state.phase).toBe('COMMAND_SELECT');
    expect(state.outcome).toBeNull();
  });

  it('resolves a further enemy turn after the player acts, driven by the same timeline', () => {
    const engine = setup({ playerSpeed: 10, enemySpeed: 9, playerMaxHp: 500, enemyMaxHp: 500 });
    expect(engine.getState().enemyActionLog).toHaveLength(0); // player is faster, acts first

    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 0 }); // wrong on purpose, avoid killing enemy
    engine.advance(); // -> EXPLANATION

    engine.advance(); // -> resolves enemy turn(s)
    const state = engine.getState();

    expect(state.enemyActionLog.length).toBeGreaterThan(0);
    expect(state.player.currentHp).toBeLessThan(500);
    expect(state.phase).toBe('COMMAND_SELECT');
    expect(state.outcome).toBeNull();
  });

  it('declares a win as soon as the enemy is defeated, without resolving an enemy turn', () => {
    const engine = setup({ playerAttack: 100, playerDefense: 0, enemyDefense: 0, enemyMaxHp: 1 });
    engine.selectCommand('attack');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }); // correct, will surely kill a 1-HP enemy
    engine.advance(); // RESULT_APPLY -> EXPLANATION

    expect(engine.getState().enemy.currentHp).toBe(0);

    engine.advance(); // EXPLANATION -> BATTLE_END(win)
    const state = engine.getState();
    expect(state.phase).toBe('BATTLE_END');
    expect(state.outcome).toBe('win');
    expect(state.enemyActionLog).toHaveLength(0);
  });

  it('declares a loss when the player is KO\'d by a faster enemy, and rejects further actions', () => {
    // enemy is both stronger and faster, so the opening enemy turn (resolved
    // at battle start, see the speed-order test above) KOs the player
    // before any player action ever happens.
    const engine = setup({ playerMaxHp: 10, playerDefense: 0, enemyAttack: 50, enemySpeed: 100, playerSpeed: 1 });
    const state = engine.getState();

    expect(state.phase).toBe('BATTLE_END');
    expect(state.outcome).toBe('lose');
    expect(state.player.currentHp).toBe(0);

    engine.selectCommand('attack');
    expect(engine.getState().phase).toBe('BATTLE_END');
  });
});
