import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BaseHomeScreen, HOME_HOTSPOTS } from '../../../src/ui/base/BaseHomeScreen';

afterEach(cleanup);

describe('BaseHomeScreen (spec v0.6 §3.1: 6 official hotspots, no free walking)', () => {
  it('renders exactly the 6 hotspot buttons', () => {
    render(<BaseHomeScreen onSelect={() => {}} />);
    for (const hotspot of HOME_HOTSPOTS) {
      expect(screen.getByRole('button', { name: hotspot.label })).toBeTruthy();
    }
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('requests the matching phase when a hotspot is tapped', () => {
    const onSelect = vi.fn();
    render(<BaseHomeScreen onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '出撃' }));
    expect(onSelect).toHaveBeenCalledWith('AREA_SELECT');

    fireEvent.click(screen.getByRole('button', { name: '編成' }));
    expect(onSelect).toHaveBeenCalledWith('PARTY_EDIT');

    fireEvent.click(screen.getByRole('button', { name: 'キャラクター' }));
    expect(onSelect).toHaveBeenCalledWith('CHARACTER_LIST');

    fireEvent.click(screen.getByRole('button', { name: '装備' }));
    expect(onSelect).toHaveBeenCalledWith('EQUIPMENT_LIST');

    fireEvent.click(screen.getByRole('button', { name: '持ち物' }));
    expect(onSelect).toHaveBeenCalledWith('INVENTORY_LIST');

    fireEvent.click(screen.getByRole('button', { name: '記録' }));
    expect(onSelect).toHaveBeenCalledWith('RECORD_LIST');
  });
});
