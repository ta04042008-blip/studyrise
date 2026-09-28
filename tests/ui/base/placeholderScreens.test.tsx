import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecordPlaceholderScreen } from '../../../src/ui/base/RecordPlaceholderScreen';

afterEach(cleanup);

describe('MVP-8+ placeholder screens (記録 導線 — user instruction: navigation only)', () => {
  it('記録 placeholder shows the MVP-8 notice and returns to base', () => {
    const onBack = vi.fn();
    render(<RecordPlaceholderScreen onBack={onBack} />);
    expect(screen.getByText(/MVP-8/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });
});
