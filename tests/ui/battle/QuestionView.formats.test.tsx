import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QuestionView } from '../../../src/ui/battle/QuestionView';
import type { OrderingQuestion, ShortAnswerQuestion, TrueFalseQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

describe('QuestionView official non-multiple-choice formats', () => {
  it('does not submit a true/false choice until 回答する is pressed', () => {
    const onSubmit = vi.fn();
    const question: TrueFalseQuestion = {
      id: 'tf1',
      subject: '英語',
      field: '文法・語法',
      unit: '時制・完了',
      star: 2,
      format: 'true_false',
      text: 'This is a test.',
      correctAnswer: true,
      explanation: '解説',
    };
    render(<QuestionView question={question} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '正' }));
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '回答する' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ type: 'true_false', value: true });
  });

  it('submits the complete ordering only after every item is selected', () => {
    const onSubmit = vi.fn();
    const question: OrderingQuestion = {
      id: 'ord1',
      subject: '英語',
      field: '英作文',
      unit: '語順・整序',
      star: 3,
      format: 'ordering',
      text: '並べ替えてください。',
      items: ['I', 'study', 'English'],
      correctOrder: [0, 1, 2],
      explanation: '解説',
    };
    render(<QuestionView question={question} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'I' }));
    fireEvent.click(screen.getByRole('button', { name: 'study' }));
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    fireEvent.click(screen.getByRole('button', { name: '回答する' }));

    expect(onSubmit).toHaveBeenCalledWith({ type: 'ordering', order: [0, 1, 2] });
  });

  it('submits short-answer text through 回答する', () => {
    const onSubmit = vi.fn();
    const question: ShortAnswerQuestion = {
      id: 'sa1',
      subject: '英語',
      field: '語彙',
      unit: '基本語彙',
      star: 1,
      format: 'short_answer',
      text: 'answer を日本語で答えてください。',
      acceptedAnswers: ['答え', 'こたえ'],
      explanation: '解説',
    };
    render(<QuestionView question={question} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '答え' } });
    fireEvent.click(screen.getByRole('button', { name: '回答する' }));

    expect(onSubmit).toHaveBeenCalledWith({ type: 'short_answer', value: '答え' });
  });
});
