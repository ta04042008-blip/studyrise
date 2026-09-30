import { describe, expect, it } from 'vitest';
import { HOME_NAV_ITEMS } from '../../../src/ui/base/BaseHomeScreen';

describe('HOME_NAV_ITEMS', () => {
  it('defines the six Base destinations in the intended navigation order', () => {
    expect(HOME_NAV_ITEMS.map((item) => item.label)).toEqual([
      '出撃',
      '仲間',
      '編成',
      '装備',
      '持ち物',
      '記録',
    ]);
  });

  it('maps every navigation item to a unique destination', () => {
    expect(new Set(HOME_NAV_ITEMS.map((item) => item.id)).size).toBe(HOME_NAV_ITEMS.length);
    expect(new Set(HOME_NAV_ITEMS.map((item) => item.target)).size).toBe(HOME_NAV_ITEMS.length);
  });
});
