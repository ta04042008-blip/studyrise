import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useBattleController } from '../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition, SpellDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const question: MultipleChoiceQuestion = {
  id: 'q_bestiary',
  subject: '数学',
  field: '計算',
  unit: '四則演算',
  star: 1,
  format: 'multiple_choice',
  text: '1 + 1 は？',
  choices: ['1', '2'],
  correctIndex: 1,
  explanation: '1 + 1 = 2。',
};

const spell: SpellDefinition = {
  id: 'spell_test',
  name: 'テスト',
  targetType: 'enemy',
  maxLevel: 1,
  levels: [{ mpCost: 0, effects: [] }],
};

const player: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 999, defense: 10, speed: 20, maxHp: 100, maxMp: 0 },
  initialSpellId: spell.id,
  additionalSpellPoolIds: [],
};

function setup(enemy: EnemyDefinition, onEnemyObservation: ReturnType<typeof vi.fn>) {
  return renderHook(() =>
    useBattleController({
      players: [player],
      enemies: [enemy],
      questions: [question],
      spellsById: { [spell.id]: spell },
      initialItems: [],
      seed: 4,
      onEnemyObservation,
    }),
  );
}

describe('useBattleController — Bestiary observation boundary', () => {
  it('reports an enemy encounter on battle construction', () => {
    const onEnemyObservation = vi.fn();
    setup(
      { id: 'enemy_seen', name: 'Seen', baseStats: { attack: 1, defense: 1, speed: 1, maxHp: 50 } },
      onEnemyObservation,
    );

    expect(onEnemyObservation).toHaveBeenCalledWith({
      type: 'ENCOUNTERED',
      enemyDefinitionId: 'enemy_seen',
    });
  });

  it('records actions revealed by Search', () => {
    const onEnemyObservation = vi.fn();
    const { result } = setup(
      { id: 'enemy_search', name: 'SearchTarget', baseStats: { attack: 1, defense: 1, speed: 1, maxHp: 100 } },
      onEnemyObservation,
    );
    onEnemyObservation.mockClear();

    act(() => result.current.selectCommand('search'));
    act(() => result.current.selectSubjectAndStar('数学', 1));
    act(() => result.current.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }));
    act(() => result.current.advance());

    expect(onEnemyObservation).toHaveBeenCalledWith({
      type: 'ACTION_OBSERVED',
      enemyDefinitionId: 'enemy_search',
      actionName: 'アタック',
    });
  });

  it('reports defeat when an enemy reaches zero HP', () => {
    const onEnemyObservation = vi.fn();
    const { result } = setup(
      { id: 'enemy_defeat', name: 'Weak', baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 1 } },
      onEnemyObservation,
    );
    onEnemyObservation.mockClear();

    act(() => result.current.selectCommand('attack'));
    act(() => result.current.selectSubjectAndStar('数学', 1));
    act(() => result.current.submitAnswer({ type: 'multiple_choice', selectedIndex: 1 }));
    act(() => result.current.advance());

    expect(onEnemyObservation).toHaveBeenCalledWith({
      type: 'DEFEATED',
      enemyDefinitionId: 'enemy_defeat',
    });
  });
});
