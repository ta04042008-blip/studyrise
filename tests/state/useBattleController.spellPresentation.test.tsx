import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useBattleController } from '../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition, SpellDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const question: MultipleChoiceQuestion = {
  id: 'spell_feedback_q1',
  subject: '数学',
  field: '数学I',
  unit: '数と式',
  star: 1,
  format: 'multiple_choice',
  text: '1 + 1 は？',
  choices: ['1', '2'],
  correctIndex: 1,
  explanation: '1 + 1 = 2',
};

const spell: SpellDefinition = {
  id: 'spell_feedback_test',
  name: '演出テスト',
  targetType: 'self',
  questionStars: [1, 1, 1, 1, 1],
  powerByCorrect: [0, 1, 2, 3, 4, 5],
  maxLevel: 1,
  levelBonuses: [{ type: 'NONE' }],
  levels: [{ mpCost: 0, effects: [] }],
};

const player: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 20, defense: 10, speed: 50, maxHp: 100, maxMp: 0 },
  initialSpellId: spell.id,
  additionalSpellPoolIds: [],
};

const enemy: EnemyDefinition = {
  id: 'enemy',
  name: 'Dummy',
  baseStats: { attack: 0, defense: 1, speed: 1, maxHp: 9999 },
};

function setup() {
  return renderHook(() =>
    useBattleController({
      players: [player],
      enemies: [enemy],
      questions: [question],
      spellsById: { [spell.id]: spell },
      initialItems: [],
      seed: 7,
    }),
  );
}

describe('useBattleController spell preparation presentation signal', () => {
  it('emits a correct feedback event with the cumulative correct count', () => {
    const { result } = setup();

    act(() => result.current.useSpell(spell.id));
    expect(result.current.state.phase).toBe('SPELL_SUBJECT_SELECT');

    act(() => result.current.selectSpellSubject('数学'));
    expect(result.current.state.phase).toBe('SPELL_QUESTION');

    act(() => result.current.submitSpellAnswer({ type: 'multiple_choice', selectedIndex: 1 }));

    expect(result.current.state.phase).toBe('SPELL_EXPLANATION');
    expect(result.current.state.pendingSpellQuestionOutcome?.question.id).toBe('spell_feedback_q1');
    expect(result.current.spellAnswerFeedback).toMatchObject({
      sourceActorId: 'player',
      correct: true,
      correctCount: 1,
      answeredCount: 1,
    });
    expect(result.current.state.pendingSpellSequence?.correctCount).toBe(1);
  });

  it('does not increase the presentation correct count for an incorrect answer', () => {
    const { result } = setup();

    act(() => result.current.useSpell(spell.id));
    act(() => result.current.selectSpellSubject('数学'));
    act(() => result.current.submitSpellAnswer({ type: 'multiple_choice', selectedIndex: 1 }));
    expect(result.current.state.phase).toBe('SPELL_EXPLANATION');
    act(() => result.current.advance());
    expect(result.current.state.phase).toBe('SPELL_QUESTION');
    act(() => result.current.submitSpellAnswer({ type: 'multiple_choice', selectedIndex: 0 }));

    expect(result.current.state.phase).toBe('SPELL_EXPLANATION');
    expect(result.current.spellAnswerFeedback).toMatchObject({
      sourceActorId: 'player',
      correct: false,
      correctCount: 1,
      answeredCount: 2,
    });
    expect(result.current.state.pendingSpellSequence?.correctCount).toBe(1);
  });
});
