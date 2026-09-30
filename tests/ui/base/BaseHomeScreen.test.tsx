import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BaseHomeScreen, HOME_NAV_ITEMS } from '../../../src/ui/base/BaseHomeScreen';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';

afterEach(cleanup);

describe('BaseHomeScreen — leader + bottom navigation', () => {
  it('renders the party leader over the Base background and exactly the 6 navigation buttons', () => {
    render(<BaseHomeScreen leader={sampleParty[0]} onSelect={() => {}} />);

    expect(screen.getByRole('img', { name: `${sampleParty[0].name} パーティ先頭` })).toBeTruthy();
    expect(screen.getByRole('navigation', { name: '拠点メニュー' })).toBeTruthy();

    for (const item of HOME_NAV_ITEMS) {
      expect(screen.getByRole('button', { name: item.label })).toBeTruthy();
    }
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('requests the matching phase when a navigation item is tapped', () => {
    const onSelect = vi.fn();
    render(<BaseHomeScreen leader={sampleParty[0]} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: '出撃' }));
    expect(onSelect).toHaveBeenCalledWith('AREA_SELECT');

    fireEvent.click(screen.getByRole('button', { name: '仲間' }));
    expect(onSelect).toHaveBeenCalledWith('CHARACTER_LIST');

    fireEvent.click(screen.getByRole('button', { name: '編成' }));
    expect(onSelect).toHaveBeenCalledWith('PARTY_EDIT');

    fireEvent.click(screen.getByRole('button', { name: '装備' }));
    expect(onSelect).toHaveBeenCalledWith('EQUIPMENT_LIST');

    fireEvent.click(screen.getByRole('button', { name: '持ち物' }));
    expect(onSelect).toHaveBeenCalledWith('INVENTORY_LIST');

    fireEvent.click(screen.getByRole('button', { name: '記録' }));
    expect(onSelect).toHaveBeenCalledWith('RECORD_LIST');

  });

  it('keeps the Base usable when no leader is currently saved', () => {
    render(<BaseHomeScreen leader={null} onSelect={() => {}} />);
    expect(screen.queryByRole('img', { name: /パーティ先頭/ })).toBeNull();
    expect(screen.getByRole('button', { name: '編成' })).toBeTruthy();
  });
});
