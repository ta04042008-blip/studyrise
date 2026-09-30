import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BaseHomeScreen } from '../../../src/ui/base/BaseHomeScreen';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';

afterEach(cleanup);

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

describe('BaseHomeScreen across viewports', () => {
  it('renders the leader and all 7 nav items at a smartphone-portrait viewport', () => {
    setViewport(390, 844);
    render(<BaseHomeScreen leader={sampleParty[0]} onSelect={() => {}} />);
    expect(screen.getByRole('img', { name: `${sampleParty[0].name} パーティ先頭` })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('renders the leader and all 7 nav items at an iPad-landscape viewport', () => {
    setViewport(1194, 834);
    render(<BaseHomeScreen leader={sampleParty[0]} onSelect={() => {}} />);
    expect(screen.getByRole('img', { name: `${sampleParty[0].name} パーティ先頭` })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });
});
