import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { EquipmentPlaceholderScreen } from '../../../src/ui/base/EquipmentPlaceholderScreen';
import { InventoryPlaceholderScreen } from '../../../src/ui/base/InventoryPlaceholderScreen';
import { RecordPlaceholderScreen } from '../../../src/ui/base/RecordPlaceholderScreen';

afterEach(cleanup);

describe('MVP-6 placeholder screens (装備/持ち物/記録 導線 — user instruction: navigation only)', () => {
  it('装備 placeholder shows the MVP-7 notice and returns to base', () => {
    const onBack = vi.fn();
    render(<EquipmentPlaceholderScreen onBack={onBack} />);
    expect(screen.getByText(/MVP-7/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('持ち物 placeholder shows the MVP-7 notice and returns to base', () => {
    const onBack = vi.fn();
    render(<InventoryPlaceholderScreen onBack={onBack} />);
    expect(screen.getByText(/MVP-7/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('記録 placeholder shows the MVP-8 notice and returns to base', () => {
    const onBack = vi.fn();
    render(<RecordPlaceholderScreen onBack={onBack} />);
    expect(screen.getByText(/MVP-8/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });
});
