import { describe, expect, it } from 'vitest';
import { HOME_HOTSPOTS } from '../../../src/ui/base/BaseHomeScreen';

/**
 * 背景サイズが変わってもホットスポットが画面外へ飛ばないこと: every hotspot
 * is percentage-positioned, so this is a data invariant, not a rendered-
 * pixel measurement (jsdom doesn't lay out real geometry) — every
 * coordinate must stay safely inside [0,100] with margin so a
 * `transform: translate(-50%, -50%)` button never clips off any edge.
 */
describe('HOME_HOTSPOTS (spec v0.6 §3.1)', () => {
  it('defines exactly the 6 official hotspots', () => {
    expect(HOME_HOTSPOTS).toHaveLength(6);
    expect(HOME_HOTSPOTS.map((h) => h.label).sort()).toEqual(
      ['出撃', '編成', 'キャラクター', '装備', '持ち物', '記録'].sort(),
    );
  });

  it('positions every hotspot safely within bounds on both axes', () => {
    for (const hotspot of HOME_HOTSPOTS) {
      expect(hotspot.xPercent).toBeGreaterThanOrEqual(10);
      expect(hotspot.xPercent).toBeLessThanOrEqual(90);
      expect(hotspot.yPercent).toBeGreaterThanOrEqual(10);
      expect(hotspot.yPercent).toBeLessThanOrEqual(90);
    }
  });

  it('has no two hotspots at the exact same position', () => {
    const keys = HOME_HOTSPOTS.map((h) => `${h.xPercent},${h.yPercent}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
