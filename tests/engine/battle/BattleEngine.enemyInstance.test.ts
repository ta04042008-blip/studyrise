import { describe, expect, it } from 'vitest';
import { createBattleEngine } from '../../../src/engine/battle/BattleEngine';
import { createQuestionEngine } from '../../../src/engine/question/QuestionEngine';
import type { RandomService } from '../../../src/engine/random/RandomService';
import { battleConfig } from '../../../src/config/battleConfig';
import { mc, testItem, testSpell } from './BattleEngine.test';
import type { CharacterDefinition, EnemyDefinition } from '../../../src/engine/battle/BattleEngine.types';

/** Fully deterministic: no variance, no critical, no great-success, and pick() always the first candidate. */
const deterministicRandom: RandomService = {
  uniform: () => 1,
  chance: () => false,
  int: () => 0,
  pick: (items) => items[0],
};

const playerDef: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 50, defense: 10, speed: 20, maxHp: 100, maxMp: 5 },
  initialSpellId: testSpell.id,
  additionalSpellPoolIds: [],
};

const goblinDef: EnemyDefinition = {
  id: 'enemy_goblin', // one stable content definition id
  name: 'ゴブリン',
  baseStats: { attack: 8, defense: 3, speed: 5, maxHp: 25 },
};

function makeEngine(enemies: Parameters<typeof createBattleEngine>[0]['enemies']) {
  const random = deterministicRandom;
  const questionEngine = createQuestionEngine([mc()], random);
  return createBattleEngine({
    players: [playerDef],
    enemies,
    questionEngine,
    config: battleConfig,
    random,
    spellsById: { [testSpell.id]: testSpell },
    initialItems: [{ item: testItem, remainingUses: 2 }],
  });
}

describe('BattleEngine — enemy content-id vs battle-instance-id separation (MVP-5 correction 1)', () => {
  it('a bare EnemyDefinition[] normalizes to instanceId === definitionId (pre-MVP-5 behavior, unchanged)', () => {
    const engine = makeEngine([goblinDef]);
    const [actor] = engine.getState().enemies;
    expect(actor.id).toBe('enemy_goblin');
    expect(actor.definitionId).toBe('enemy_goblin');
  });

  it('the same EnemyDefinition can be placed twice in one Zone via distinct EnemyBattleInstance ids, without collision', () => {
    const engine = makeEngine([
      { instanceId: 'goblin_1', definition: goblinDef },
      { instanceId: 'goblin_2', definition: goblinDef },
    ]);
    const state = engine.getState();
    expect(state.enemies).toHaveLength(2);

    const ids = state.enemies.map((e) => e.id).sort();
    expect(ids).toEqual(['goblin_1', 'goblin_2']);

    // Both instances share the same stable content definition id...
    for (const actor of state.enemies) {
      expect(actor.definitionId).toBe('enemy_goblin');
      expect(actor.name).toBe('ゴブリン');
      expect(actor.maxHp).toBe(25);
    }
    // ...but EnemyDefinition.id itself was never mutated to the instance id.
    expect(goblinDef.id).toBe('enemy_goblin');
  });

  it('damaging one instance never affects the other instance sharing the same definition', () => {
    const engine = makeEngine([
      { instanceId: 'goblin_1', definition: goblinDef },
      { instanceId: 'goblin_2', definition: goblinDef },
    ]);

    engine.selectCommand('attack');
    expect(engine.getState().phase).toBe('TARGET_SELECT');
    engine.selectTarget('goblin_2');
    engine.selectSubjectAndStar('数学', 1);
    engine.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 });
    engine.advance();

    const state = engine.getState();
    const byId = Object.fromEntries(state.enemies.map((e) => [e.id, e]));
    expect(byId['goblin_2'].currentHp).toBeLessThan(25);
    expect(byId['goblin_1'].currentHp).toBe(25); // untouched
  });

  it('the player actor also carries its stable definitionId', () => {
    const engine = makeEngine([goblinDef]);
    expect(engine.getState().players[0].definitionId).toBe('player');
  });
});
