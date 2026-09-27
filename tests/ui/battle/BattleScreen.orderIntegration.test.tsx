import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BattleScreen } from '../../../src/ui/battle/BattleScreen';
import { useBattleController } from '../../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const FORBIDDEN_VERDICT_WORDS = /正解|不正解|せいこう|しっぱい/;

const PLAYER: CharacterDefinition = {
  id: 'player',
  name: 'Hero',
  baseStats: { attack: 30, defense: 5, speed: 20, maxHp: 100, maxMp: 5 },
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
  const controller = useBattleController({ player: PLAYER, enemy: ENEMY, questions: [question()], seed });
  return <BattleScreen controller={controller} />;
}

async function driveToQuestionAndAnswer(choiceLabel: string) {
  fireEvent.click(screen.getByRole('button', { name: 'アタック' }));
  fireEvent.click(screen.getByRole('button', { name: '決定' }));
  fireEvent.click(screen.getByRole('radio', { name: choiceLabel }));
  fireEvent.click(screen.getByRole('button', { name: '回答する' }));
}

describe('BattleScreen — COMMAND_ANIMATION → RESULT_APPLY → 正誤表示 → EXPLANATION ordering', () => {
  it('correct answer: no 正誤 wording during COMMAND_ANIMATION, 正解！only appears after advancing', () => {
    render(<Harness seed={1} />);
    driveToQuestionAndAnswer('2'); // correct choice

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
    driveToQuestionAndAnswer('1'); // wrong choice

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
