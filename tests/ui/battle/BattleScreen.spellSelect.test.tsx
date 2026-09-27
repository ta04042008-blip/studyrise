import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BattleScreen } from '../../../src/ui/battle/BattleScreen';
import { useBattleController } from '../../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition, SpellDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const SPELL_A: SpellDefinition = {
  id: 'spell_a',
  name: 'スペルA',
  targetType: 'enemy',
  maxLevel: 1,
  levels: [{ mpCost: 0, effects: [{ type: 'DAMAGE', amount: 10 }] }],
};
const SPELL_B: SpellDefinition = {
  id: 'spell_b',
  name: 'スペルB',
  targetType: 'self',
  maxLevel: 1,
  levels: [{ mpCost: 0, effects: [{ type: 'HEAL', amount: 5 }] }],
};

const PLAYER: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 30, defense: 5, speed: 20, maxHp: 100, maxMp: 5 },
  initialSpellId: SPELL_A.id,
  additionalSpellPoolIds: [],
};
const ENEMY: EnemyDefinition = { id: 'enemy', name: 'Slime', baseStats: { attack: 5, defense: 2, speed: 5, maxHp: 100 } };

function question(): MultipleChoiceQuestion {
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
  };
}

function Harness() {
  const controller = useBattleController({
    players: [PLAYER],
    enemies: [ENEMY],
    questions: [question()],
    spellsById: { [SPELL_A.id]: SPELL_A, [SPELL_B.id]: SPELL_B },
    initialItems: [],
    knownSpellsByPlayerId: { [PLAYER.id]: [{ spellId: SPELL_A.id, level: 1 }, { spellId: SPELL_B.id, level: 1 }] },
    seed: 1,
  });
  return <BattleScreen controller={controller} />;
}

describe('BattleScreen — SpellSelectView (spec §4.5: shown only when >1 spell is known)', () => {
  it('clicking スペル opens a picker listing both known spells instead of casting immediately', () => {
    render(<Harness />);
    expect(screen.queryByText(/スペル（MP/)).toBeNull(); // no single-spell auto button
    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));

    expect(document.querySelector('.spell-select-view')).not.toBeNull();
    expect(screen.getByRole('button', { name: /スペルA/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /スペルB/ })).toBeTruthy();
  });

  it('picking one spell from the picker resolves it immediately (self-target skips TARGET_SELECT)', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));
    fireEvent.click(screen.getByRole('button', { name: /スペルB/ })); // self-targeted HEAL

    expect(document.querySelector('.spell-select-view')).toBeNull(); // picker closed
    const result = document.querySelector('.spell-item-result-view');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('呪文を唱えた');
  });

  it('picking the enemy-targeted spell damages the enemy, not the caster', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));
    fireEvent.click(screen.getByRole('button', { name: /スペルA/ }));

    const result = document.querySelector('.spell-item-result-view');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('10 ダメージを与えた');
  });

  it('the picker can be cancelled without casting anything, returning to the command menu', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));
    fireEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(document.querySelector('.spell-select-view')).toBeNull();
    expect(screen.getByRole('button', { name: 'アタック' })).toBeTruthy();
    expect(document.querySelector('.spell-item-result-view')).toBeNull();
  });
});
