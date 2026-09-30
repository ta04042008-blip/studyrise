import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BattleScreen } from '../../../src/ui/battle/BattleScreen';
import { useBattleController } from '../../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition, SpellDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const spell: SpellDefinition = {
  id: 'spell_explanation_ui',
  name: '解説スペル',
  targetType: 'self',
  effectDescription: '自身を回復するテストスペル。',
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

const question: MultipleChoiceQuestion = {
  id: 'spell-explanation-q',
  subject: '数学',
  field: '数学I',
  unit: '数と式',
  star: 1,
  format: 'multiple_choice',
  text: '1 + 1 は？',
  choices: ['1', '2'],
  correctIndex: 1,
  explanation: '1と1を足すと2です。',
};

function Harness() {
  const controller = useBattleController({
    players: [player],
    enemies: [enemy],
    questions: [question],
    spellsById: { [spell.id]: spell },
    initialItems: [],
    seed: 11,
  });
  return <BattleScreen controller={controller} />;
}

describe('BattleScreen — spell question explanations', () => {
  it('shows correctness, correct answer and explanation before the next spell question', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));
    fireEvent.click(screen.getByRole('button', { name: /解説スペル/ }));
    fireEvent.click(screen.getByRole('button', { name: '決定' }));

    fireEvent.click(screen.getByRole('radio', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '回答する' }));

    const explanation = document.querySelector('.spell-question-explanation-view');
    expect(explanation).not.toBeNull();
    expect(explanation!.textContent).toContain('スペル発動準備 1 / 5');
    expect(explanation!.textContent).toContain('正解！');
    expect(explanation!.textContent).toContain('正答: 2');
    expect(explanation!.textContent).toContain('1と1を足すと2です。');
    expect(screen.getByRole('button', { name: '次の問題へ' })).toBeTruthy();
    expect(document.querySelector('.question-view')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '次の問題へ' }));

    expect(document.querySelector('.spell-question-explanation-view')).toBeNull();
    expect(document.querySelector('.question-view')).not.toBeNull();
  });
});
