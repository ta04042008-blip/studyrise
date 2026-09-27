import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CommandAnimationView } from '../../../src/ui/battle/CommandAnimationView';
import type { AttackOutcome } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const FORBIDDEN_VERDICT_WORDS = /正解|不正解|せいこう|しっぱい/;

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

function outcome(overrides: Partial<AttackOutcome> = {}): AttackOutcome {
  return {
    attackerId: 'player',
    targetId: 'enemy',
    correct: true,
    damage: 10,
    isCritical: false,
    question: question(),
    selectedAnswerIndex: 1,
    ...overrides,
  };
}

describe('CommandAnimationView', () => {
  it('never shows a 正誤 verdict word, regardless of outcome', () => {
    for (const o of [
      outcome({ correct: true, isCritical: false }),
      outcome({ correct: true, isCritical: true }),
      outcome({ correct: false, isCritical: false, damage: 0 }),
    ]) {
      const { container, unmount } = render(<CommandAnimationView outcome={o} onAdvance={() => {}} />);
      expect(container.textContent).not.toMatch(FORBIDDEN_VERDICT_WORDS);
      unmount();
    }
  });

  it('shows a hit-specific animation for a correct, non-critical answer', () => {
    const { container } = render(
      <CommandAnimationView outcome={outcome({ correct: true, isCritical: false })} onAdvance={() => {}} />,
    );
    expect(container.textContent).toContain('命中した');
  });

  it('shows a distinct, stronger animation for a critical hit', () => {
    const { container } = render(
      <CommandAnimationView outcome={outcome({ correct: true, isCritical: true })} onAdvance={() => {}} />,
    );
    expect(container.textContent).toContain('会心の一撃');
    // Critical presentation must differ from the plain-hit presentation.
    expect(container.textContent).not.toContain('こうげきが命中した！');
  });

  it('shows a miss-specific animation for an incorrect/dont_know answer', () => {
    const { container } = render(
      <CommandAnimationView outcome={outcome({ correct: false, isCritical: false, damage: 0 })} onAdvance={() => {}} />,
    );
    expect(container.textContent).toContain('外れた');
  });

  it('calls onAdvance exactly once even if 次へ is clicked twice (idempotency)', () => {
    const onAdvance = vi.fn();
    const { getByRole } = render(<CommandAnimationView outcome={outcome()} onAdvance={onAdvance} />);
    const button = getByRole('button', { name: '次へ' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
