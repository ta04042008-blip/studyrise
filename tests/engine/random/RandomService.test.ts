import { describe, expect, it } from 'vitest';
import { createRandomService } from '../../../src/engine/random/RandomService';

describe('RandomService', () => {
  it('produces a deterministic sequence for a given seed', () => {
    const a = createRandomService(42);
    const b = createRandomService(42);

    const seqA = Array.from({ length: 5 }, () => a.uniform(0, 1));
    const seqB = Array.from({ length: 5 }, () => b.uniform(0, 1));

    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRandomService(1);
    const b = createRandomService(2);

    const seqA = Array.from({ length: 5 }, () => a.uniform(0, 1));
    const seqB = Array.from({ length: 5 }, () => b.uniform(0, 1));

    expect(seqA).not.toEqual(seqB);
  });

  it('uniform stays within [min, max)', () => {
    const rng = createRandomService(7);
    for (let i = 0; i < 200; i++) {
      const v = rng.uniform(0.9, 1.1);
      expect(v).toBeGreaterThanOrEqual(0.9);
      expect(v).toBeLessThan(1.1);
    }
  });

  it('chance(0) never triggers and chance(1) always triggers', () => {
    const rng = createRandomService(99);
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(0)).toBe(false);
    }
    for (let i = 0; i < 50; i++) {
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('int stays within [0, maxExclusive)', () => {
    const rng = createRandomService(5);
    for (let i = 0; i < 200; i++) {
      const v = rng.int(3);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(3);
    }
  });

  it('pick only returns elements from the given array', () => {
    const rng = createRandomService(3);
    const items = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('pick throws on an empty array', () => {
    const rng = createRandomService(3);
    expect(() => rng.pick([])).toThrow();
  });
});
