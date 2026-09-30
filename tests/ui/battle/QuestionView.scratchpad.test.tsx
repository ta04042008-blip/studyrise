import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QuestionView } from '../../../src/ui/battle/QuestionView';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

const question: MultipleChoiceQuestion = {
  id: 'scratchpad-q1',
  subject: '数学',
  field: '数学I',
  unit: '数と式',
  star: 2,
  format: 'multiple_choice',
  text: '2x + 3 = 7 のとき x は？',
  choices: ['1', '2', '3', '4'],
  correctIndex: 1,
  explanation: '2x = 4 より x = 2。',
};

function createContextMock() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineCap: 'round',
    lineJoin: 'round',
    globalCompositeOperation: 'source-over',
    lineWidth: 1,
    strokeStyle: '#000',
    fillStyle: '#000',
  };
}

describe('QuestionView — drawing scratchpad', () => {
  const context = createContextMock();

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 600,
      bottom: 320,
      width: 600,
      height: 320,
      toJSON: () => ({}),
    } as DOMRect);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens a drawing memo from the question and supports pen strokes', () => {
    render(<QuestionView question={question} onSubmit={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'メモ' }));
    expect(screen.getByRole('dialog', { name: '計算メモ' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'ペン' }).getAttribute('aria-pressed')).toBe('true');

    const canvas = screen.getByLabelText('手書き計算メモ');
    fireEvent.pointerDown(canvas, {
      pointerId: 1,
      pointerType: 'pen',
      button: 0,
      clientX: 100,
      clientY: 80,
      pressure: 0.6,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 180,
      clientY: 130,
      pressure: 0.7,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 1,
      pointerType: 'pen',
      clientX: 180,
      clientY: 130,
    });

    expect(context.stroke).toHaveBeenCalled();
  });

  it('supports eraser, full clear, and closing without submitting an answer', () => {
    const onSubmit = vi.fn();
    render(<QuestionView question={question} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'メモ' }));
    fireEvent.click(screen.getByRole('button', { name: '消しゴム' }));
    expect(screen.getByRole('button', { name: '消しゴム' }).getAttribute('aria-pressed')).toBe('true');

    const clearCountBefore = context.clearRect.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '全消去' }));
    expect(context.clearRect.mock.calls.length).toBeGreaterThan(clearCountBefore);

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(screen.queryByRole('dialog', { name: '計算メモ' })).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
