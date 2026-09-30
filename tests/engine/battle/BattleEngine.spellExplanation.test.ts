import { describe, expect, it } from 'vitest';
import { setup, mc } from './BattleEngine.test';
import type { SpellDefinition } from '../../../src/engine/battle/BattleEngine.types';

const spell: SpellDefinition = {
  id: 'spell_explanation_test',
  name: '連続解説テスト',
  targetType: 'enemy',
  questionStars: [1, 1, 1, 1, 1],
  powerByCorrect: [0, 2, 4, 6, 8, 10],
  maxLevel: 1,
  levelBonuses: [{ type: 'NONE' }],
  levels: [{ mpCost: 0, effects: [] }],
};

describe('BattleEngine — spell preparation explanations', () => {
  it('pauses on SPELL_EXPLANATION after every answer and only picks the next question after advance()', () => {
    const engine = setup({
      spellsById: { [spell.id]: spell },
      initialSpellId: spell.id,
      questions: [mc({ id: 'spell-q1', star: 1 })],
      enemyMaxHp: 9999,
    });

    engine.useSpell(spell.id);
    expect(engine.getState().phase).toBe('SPELL_SUBJECT_SELECT');

    engine.selectSpellSubject('数学');
    expect(engine.getState().phase).toBe('SPELL_QUESTION');
    expect(engine.getState().pendingSpellSequence?.questionIndex).toBe(0);

    engine.submitSpellAnswer({ type: 'multiple_choice', selectedIndex: 1 });

    const explanation = engine.getState();
    expect(explanation.phase).toBe('SPELL_EXPLANATION');
    expect(explanation.pendingSpellQuestionOutcome).toMatchObject({
      questionIndex: 0,
      correct: true,
      correctCount: 1,
    });
    expect(explanation.pendingSpellSequence?.questionIndex).toBe(0);
    expect(explanation.preparedSpellsByPlayerId?.player).toBeUndefined();

    engine.advance();

    const nextQuestion = engine.getState();
    expect(nextQuestion.phase).toBe('SPELL_QUESTION');
    expect(nextQuestion.pendingSpellSequence?.questionIndex).toBe(1);
    expect(nextQuestion.pendingSpellSequence?.correctCount).toBe(1);
    expect(nextQuestion.pendingSpellQuestionOutcome).toBeNull();
  });

  it('keeps the fifth answer on its explanation screen until the player confirms it', () => {
    const engine = setup({
      spellsById: { [spell.id]: spell },
      initialSpellId: spell.id,
      questions: [mc({ id: 'spell-q1', star: 1 })],
      enemyMaxHp: 9999,
    });

    engine.useSpell(spell.id);
    engine.selectSpellSubject('数学');

    for (let index = 0; index < 5; index += 1) {
      engine.submitSpellAnswer({ type: 'multiple_choice', selectedIndex: 1 });
      expect(engine.getState().phase).toBe('SPELL_EXPLANATION');
      expect(engine.getState().pendingSpellQuestionOutcome?.questionIndex).toBe(index);

      if (index < 4) {
        engine.advance();
        expect(engine.getState().phase).toBe('SPELL_QUESTION');
      }
    }

    const fifthExplanation = engine.getState();
    expect(fifthExplanation.pendingSpellQuestionOutcome?.correctCount).toBe(5);
    expect(fifthExplanation.pendingSpellSequence?.correctCount).toBe(5);
    expect(fifthExplanation.preparedSpellsByPlayerId?.player).toBeUndefined();

    engine.advance();

    const afterConfirm = engine.getState();
    expect(afterConfirm.phase).not.toBe('SPELL_EXPLANATION');
    expect(afterConfirm.pendingSpellSequence).toBeNull();
    expect(afterConfirm.pendingSpellQuestionOutcome).toBeNull();
  });
});
