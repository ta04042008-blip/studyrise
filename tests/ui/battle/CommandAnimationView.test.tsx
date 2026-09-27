import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CommandAnimationView } from '../../../src/ui/battle/CommandAnimationView';
import type {
  AttackOutcome,
  ChargeOutcome,
  GuardOutcome,
  SearchOutcome,
} from '../../../src/engine/battle/BattleEngine.types';
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

function attackOutcome(overrides: Partial<AttackOutcome> = {}): AttackOutcome {
  return {
    command: 'attack',
    sourceActorId: 'player',
    targetId: 'enemy',
    correct: true,
    damage: 10,
    isCritical: false,
    question: question(),
    selectedAnswerIndex: 1,
    ...overrides,
  };
}

function guardOutcome(overrides: Partial<GuardOutcome> = {}): GuardOutcome {
  return {
    command: 'guard',
    sourceActorId: 'player',
    targetId: 'player',
    correct: true,
    applied: true,
    mitigationPercent: 0.2,
    isGreatSuccess: false,
    question: question(),
    selectedAnswerIndex: 1,
    ...overrides,
  };
}

function chargeOutcome(overrides: Partial<ChargeOutcome> = {}): ChargeOutcome {
  return {
    command: 'charge',
    sourceActorId: 'player',
    targetId: 'player',
    correct: true,
    mpGained: 1,
    isGreatSuccess: false,
    question: question(),
    selectedAnswerIndex: 1,
    ...overrides,
  };
}

function searchOutcome(overrides: Partial<SearchOutcome> = {}): SearchOutcome {
  return {
    command: 'search',
    sourceActorId: 'player',
    targetId: 'enemy',
    correct: true,
    success: true,
    revealedActions: [{ actionName: 'アタック', targetId: 'player' }],
    question: question(),
    selectedAnswerIndex: 1,
    ...overrides,
  };
}

describe('CommandAnimationView', () => {
  it('never shows a 正誤 verdict word, regardless of outcome (attack/guard/charge/search, success/fail/great-success)', () => {
    const outcomes = [
      attackOutcome({ correct: true, isCritical: false }),
      attackOutcome({ correct: true, isCritical: true }),
      attackOutcome({ correct: false, damage: 0 }),
      guardOutcome({ correct: true, applied: true, isGreatSuccess: false }),
      guardOutcome({ correct: true, applied: true, isGreatSuccess: true }),
      guardOutcome({ correct: false, applied: false, mitigationPercent: 0 }),
      chargeOutcome({ correct: true, mpGained: 1, isGreatSuccess: false }),
      chargeOutcome({ correct: true, mpGained: 2, isGreatSuccess: true }),
      chargeOutcome({ correct: false, mpGained: 0 }),
      searchOutcome({ correct: true, success: true }),
      searchOutcome({ correct: false, success: false, revealedActions: [] }),
    ];

    for (const o of outcomes) {
      const { container, unmount } = render(<CommandAnimationView outcome={o} onAdvance={() => {}} />);
      expect(container.textContent).not.toMatch(FORBIDDEN_VERDICT_WORDS);
      unmount();
    }
  });

  it('Attack: shows a hit-specific animation for a correct, non-critical answer', () => {
    const { container } = render(
      <CommandAnimationView outcome={attackOutcome({ correct: true, isCritical: false })} onAdvance={() => {}} />,
    );
    expect(container.textContent).toContain('命中した');
  });

  it('Attack: shows a distinct, stronger animation for a critical hit', () => {
    const { container } = render(
      <CommandAnimationView outcome={attackOutcome({ correct: true, isCritical: true })} onAdvance={() => {}} />,
    );
    expect(container.textContent).toContain('会心の一撃');
    expect(container.textContent).not.toContain('こうげきが命中した！');
  });

  it('Attack: shows a miss-specific animation for an incorrect/dont_know answer', () => {
    const { container } = render(
      <CommandAnimationView outcome={attackOutcome({ correct: false, damage: 0 })} onAdvance={() => {}} />,
    );
    expect(container.textContent).toContain('外れた');
  });

  it('Guard: distinguishes normal success / great success / failure', () => {
    const normal = render(<CommandAnimationView outcome={guardOutcome({ isGreatSuccess: false })} onAdvance={() => {}} />);
    expect(normal.container.textContent).toContain('構え');
    normal.unmount();

    const great = render(<CommandAnimationView outcome={guardOutcome({ isGreatSuccess: true })} onAdvance={() => {}} />);
    expect(great.container.textContent).toContain('大成功');
    great.unmount();

    const fail = render(
      <CommandAnimationView outcome={guardOutcome({ correct: false, applied: false, mitigationPercent: 0 })} onAdvance={() => {}} />,
    );
    expect(fail.container.textContent).toContain('間に合わなかった');
  });

  it('Charge: distinguishes normal success / great success / failure', () => {
    const normal = render(<CommandAnimationView outcome={chargeOutcome({ isGreatSuccess: false })} onAdvance={() => {}} />);
    expect(normal.container.textContent).toContain('気合を溜めた');
    normal.unmount();

    const great = render(<CommandAnimationView outcome={chargeOutcome({ isGreatSuccess: true })} onAdvance={() => {}} />);
    expect(great.container.textContent).toContain('大成功');
    great.unmount();

    const fail = render(<CommandAnimationView outcome={chargeOutcome({ correct: false, mpGained: 0 })} onAdvance={() => {}} />);
    expect(fail.container.textContent).toContain('途切れた');
  });

  it('Search: distinguishes success / failure, with no "great success" variant', () => {
    const success = render(<CommandAnimationView outcome={searchOutcome({ success: true })} onAdvance={() => {}} />);
    expect(success.container.textContent).toContain('うかがった');
    success.unmount();

    const fail = render(
      <CommandAnimationView outcome={searchOutcome({ correct: false, success: false, revealedActions: [] })} onAdvance={() => {}} />,
    );
    expect(fail.container.textContent).toContain('見失った');
  });

  it('calls onAdvance exactly once even if 次へ is clicked twice (idempotency)', () => {
    const onAdvance = vi.fn();
    const { getByRole } = render(<CommandAnimationView outcome={attackOutcome()} onAdvance={onAdvance} />);
    const button = getByRole('button', { name: '次へ' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
