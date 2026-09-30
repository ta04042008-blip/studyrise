import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ExplanationView } from '../../../src/ui/battle/ExplanationView';
import type { GuardOutcome } from '../../../src/engine/battle/BattleEngine.types';

afterEach(cleanup);

describe('ExplanationView official question formats', () => {
  it('shows submitted and correct true/false answers', () => {
    const outcome: GuardOutcome = {
      command: 'guard',
      sourceActorId: 'p1',
      targetId: 'p1',
      correct: false,
      question: {
        id: 'tf1',
        subject: '英語',
        field: '文法・語法',
        unit: '時制・完了',
        star: 2,
        format: 'true_false',
        text: 'This is a test.',
        correctAnswer: true,
        explanation: '解説',
      },
      selectedAnswerIndex: null,
      submittedAnswer: { type: 'true_false', value: false },
      applied: false,
      mitigationPercent: 0,
      isGreatSuccess: false,
    };

    render(<ExplanationView outcome={outcome} onAdvance={() => {}} />);
    expect(screen.getByText('あなたの回答: 誤')).toBeTruthy();
    expect(screen.getByText('正答: 正')).toBeTruthy();
  });

  it('shows a submitted short answer and the canonical accepted answer', () => {
    const outcome: GuardOutcome = {
      command: 'guard',
      sourceActorId: 'p1',
      targetId: 'p1',
      correct: true,
      question: {
        id: 'sa1',
        subject: '英語',
        field: '語彙',
        unit: '基本語彙',
        star: 1,
        format: 'short_answer',
        text: 'answer を日本語で答えてください。',
        acceptedAnswers: ['答え', 'こたえ'],
        explanation: '解説',
      },
      selectedAnswerIndex: null,
      submittedAnswer: { type: 'short_answer', value: 'こたえ' },
      applied: true,
      mitigationPercent: 0.2,
      isGreatSuccess: false,
    };

    render(<ExplanationView outcome={outcome} onAdvance={() => {}} />);
    expect(screen.getByText('あなたの回答: こたえ')).toBeTruthy();
    expect(screen.getByText('正答: 答え')).toBeTruthy();
  });
});
