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
  effectDescription: '敵1体にダメージ。正答数が多いほど威力上昇。',
  questionStars: [1, 1, 1, 1, 1],
  powerByCorrect: [0, 5, 10, 15, 20, 25],
  maxLevel: 1,
  levelBonuses: [{ type: 'NONE' }],
  levels: [{ mpCost: 0, effects: [] }],
};

const SPELL_B: SpellDefinition = {
  id: 'spell_b',
  name: 'スペルB',
  targetType: 'self',
  effectDescription: '自身のHPを回復する。',
  questionStars: [1, 1, 1, 1, 1],
  powerByCorrect: [0, 4, 8, 12, 16, 20],
  maxLevel: 1,
  levelBonuses: [{ type: 'NONE' }],
  levels: [{ mpCost: 0, effects: [] }],
};

const PLAYER: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 30, defense: 5, speed: 20, maxHp: 100, maxMp: 0 },
  initialSpellId: SPELL_A.id,
  additionalSpellPoolIds: [SPELL_B.id],
};

const ENEMY: EnemyDefinition = {
  id: 'enemy',
  name: 'Slime',
  baseStats: { attack: 5, defense: 2, speed: 5, maxHp: 100 },
};

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

function Harness({ spellIds }: { spellIds: string[] }) {
  const controller = useBattleController({
    players: [PLAYER],
    enemies: [ENEMY],
    questions: [question()],
    spellsById: { [SPELL_A.id]: SPELL_A, [SPELL_B.id]: SPELL_B },
    initialItems: [],
    knownSpellsByPlayerId: {
      [PLAYER.id]: spellIds.map((spellId) => ({ spellId, level: 1 })),
    },
    seed: 1,
  });
  return <BattleScreen controller={controller} />;
}

describe('BattleScreen — SpellSelectView', () => {
  it('opens the spell picker even when the actor knows exactly one spell', () => {
    render(<Harness spellIds={[SPELL_A.id]} />);

    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));

    expect(document.querySelector('.spell-select-view')).not.toBeNull();
    expect(screen.getByRole('button', { name: /スペルA/ })).toBeTruthy();
    expect(screen.getByText('敵1体にダメージ。正答数が多いほど威力上昇。')).toBeTruthy();
    expect(screen.getByText(/5問構成:/)).toBeTruthy();
  });

  it('selecting the only spell starts preparation only after the player confirms that spell', () => {
    render(<Harness spellIds={[SPELL_A.id]} />);

    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));
    expect(screen.getByText('敵1体にダメージ。正答数が多いほど威力上昇。')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /スペルA/ }));

    expect(document.querySelector('.spell-select-view')).toBeNull();
    expect(screen.getByText('スペルに使う教科を選んでください')).toBeTruthy();
  });

  it('lists every known spell with its effect and current level', () => {
    render(<Harness spellIds={[SPELL_A.id, SPELL_B.id]} />);

    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));

    expect(screen.getByRole('button', { name: /スペルA/ }).textContent).toContain('Lv1');
    expect(screen.getByRole('button', { name: /スペルB/ }).textContent).toContain('Lv1');
    expect(screen.getByText('敵1体にダメージ。正答数が多いほど威力上昇。')).toBeTruthy();
    expect(screen.getByText('自身のHPを回復する。')).toBeTruthy();
  });

  it('can cancel the picker and return to the command menu without starting preparation', () => {
    render(<Harness spellIds={[SPELL_A.id]} />);

    fireEvent.click(screen.getByRole('button', { name: 'スペル' }));
    fireEvent.click(screen.getByRole('button', { name: '戻る' }));

    expect(document.querySelector('.spell-select-view')).toBeNull();
    expect(screen.getByRole('button', { name: 'アタック' })).toBeTruthy();
  });
});
