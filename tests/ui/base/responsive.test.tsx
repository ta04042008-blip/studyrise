import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BaseHomeScreen } from '../../../src/ui/base/BaseHomeScreen';

afterEach(cleanup);

/**
 * jsdom does not perform real CSS layout, so this cannot assert pixel
 * geometry. What it does confirm: BaseHomeScreen renders every hotspot
 * without error at both a smartphone-portrait and an iPad-landscape
 * `window.innerWidth` (CLAUDE.md §16/spec §18.11) — the actual
 * "never flies off-screen" guarantee is the percentage-bounds data
 * invariant covered by hotspotPositions.test.ts, which holds regardless of
 * viewport size by construction.
 */
function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

describe('BaseHomeScreen across viewports', () => {
  it('renders all 6 hotspots at a smartphone-portrait viewport (e.g. iPhone: 390x844)', () => {
    setViewport(390, 844);
    render(<BaseHomeScreen onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });

  it('renders all 6 hotspots at an iPad-landscape viewport (1194x834)', () => {
    setViewport(1194, 834);
    render(<BaseHomeScreen onSelect={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(6);
  });
});
