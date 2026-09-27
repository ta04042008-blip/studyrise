import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BattleScreen } from '../../../src/ui/battle/BattleScreen';
import { useBattleController } from '../../../src/state/useBattleController';
import type {
  CharacterDefinition,
  EnemyDefinition,
  ItemBattleSlot,
  SpellDefinition,
} from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const FORBIDDEN_VERDICT_WORDS = /正解|不正解|せいこう|しっぱい/;

const SPELL: SpellDefinition = {
  id: 'spell_test',
  name: 'テストスペル',
  mpCost: 0, // 0-cost in this harness so it's always usable regardless of MP flow
  targetType: 'enemy',
  effects: [{ type: 'DAMAGE', amount: 12 }],
};

const ITEM: ItemBattleSlot = {
  item: { id: 'item_test', name: 'テストアイテム', targetType: 'self', effects: [{ type: 'HEAL', amount: 15 }] },
  remainingUses: 1,
};

const PLAYER: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 30, defense: 5, speed: 20, maxHp: 100, maxMp: 5 },
  initialSpellId: SPELL.id,
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

function Harness({ seed }: { seed: number }) {
  const controller = useBattleController({
    player: PLAYER,
    enemy: ENEMY,
    questions: [question()],
    spellsById: { [SPELL.id]: SPELL },
    initialItems: [{ ...ITEM }],
    seed,
  });
  return <BattleScreen controller={controller} spell={SPELL} />;
}

async function driveToQuestionAndAnswer(command: string, choiceLabel: string) {
  fireEvent.click(screen.getByRole('button', { name: command }));
  fireEvent.click(screen.getByRole('button', { name: '決定' }));
  fireEvent.click(screen.getByRole('radio', { name: choiceLabel }));
  fireEvent.click(screen.getByRole('button', { name: '回答する' }));
}

describe('BattleScreen — Attack: COMMAND_ANIMATION → RESULT_APPLY → 正誤表示 → EXPLANATION ordering', () => {
  it('correct answer: no 正誤 wording during COMMAND_ANIMATION, 正解！only appears after advancing', () => {
    render(<Harness seed={1} />);
    driveToQuestionAndAnswer('アタック', '2'); // correct choice

    const animation = document.querySelector('.command-animation-view');
    expect(animation).not.toBeNull();
    expect(animation!.textContent).not.toMatch(FORBIDDEN_VERDICT_WORDS);
    expect(animation!.textContent).toMatch(/命中した|会心の一撃/);
    expect(document.querySelector('.explanation-view')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const explanation = document.querySelector('.explanation-view');
    expect(explanation).not.toBeNull();
    expect(explanation!.textContent).toContain('正解！');
  });

  it('incorrect answer: no 正誤 wording during COMMAND_ANIMATION, 不正解 only appears after advancing', () => {
    render(<Harness seed={2} />);
    driveToQuestionAndAnswer('アタック', '1'); // wrong choice

    const animation = document.querySelector('.command-animation-view');
    expect(animation).not.toBeNull();
    expect(animation!.textContent).not.toMatch(FORBIDDEN_VERDICT_WORDS);
    expect(animation!.textContent).toContain('外れた');
    expect(document.querySelector('.explanation-view')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const explanation = document.querySelector('.explanation-view');
    expect(explanation).not.toBeNull();
    expect(explanation!.textContent).toContain('不正解');
  });
});

describe('BattleScreen — Guard/Charge/Search share the same question-flow ordering', () => {
  it('Guard: reaches EXPLANATION with a guard result detail after a correct answer', () => {
    render(<Harness seed={3} />);
    driveToQuestionAndAnswer('ガード', '2');

    const animation = document.querySelector('.command-animation-view');
    expect(animation!.textContent).not.toMatch(FORBIDDEN_VERDICT_WORDS);

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    const explanation = document.querySelector('.explanation-view');
    expect(explanation!.textContent).toContain('正解！');
    expect(explanation!.textContent).toContain('ガードを付与した');
  });

  it('Charge: reaches EXPLANATION with an MP result detail after a correct answer', () => {
    render(<Harness seed={4} />);
    driveToQuestionAndAnswer('チャージ', '2');
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    const explanation = document.querySelector('.explanation-view');
    expect(explanation!.textContent).toMatch(/MP\+/);
  });

  it('Search: reveals enemy actions in a SearchInfoPanel after a correct answer', () => {
    render(<Harness seed={5} />);
    driveToQuestionAndAnswer('サーチ', '2');
    fireEvent.click(screen.getByRole('button', { name: '次へ' })); // -> EXPLANATION
    fireEvent.click(screen.getByRole('button', { name: '次へ' })); // -> back to COMMAND_SELECT

    const panel = document.querySelector('.search-info-panel');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('アタック');
  });
});

describe('BattleScreen — Spell/Item short flow (no question, no EXPLANATION)', () => {
  it('Spell: goes straight to a RESULT_APPLY screen with no verdict wording, never visiting QUESTION/EXPLANATION', () => {
    render(<Harness seed={6} />);
    fireEvent.click(screen.getByRole('button', { name: /スペル/ }));

    expect(document.querySelector('.question-view')).toBeNull();
    expect(document.querySelector('.explanation-view')).toBeNull();
    const result = document.querySelector('.spell-item-result-view');
    expect(result).not.toBeNull();
    expect(result!.textContent).not.toMatch(FORBIDDEN_VERDICT_WORDS);
    expect(result!.textContent).toContain('呪文を唱えた');
  });

  it('Item: goes straight to a RESULT_APPLY screen and decrements remaining uses', () => {
    render(<Harness seed={7} />);
    fireEvent.click(screen.getByRole('button', { name: /テストアイテム/ }));

    const result = document.querySelector('.spell-item-result-view');
    expect(result).not.toBeNull();
    expect(result!.textContent).toContain('アイテムを使った');

    fireEvent.click(screen.getByRole('button', { name: '次へ' })); // back to COMMAND_SELECT
    const itemButton = screen.getByRole('button', { name: /テストアイテム/ }) as HTMLButtonElement;
    expect(itemButton.disabled).toBe(true);
  });
});
