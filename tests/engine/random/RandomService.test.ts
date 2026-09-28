import { describe, expect, it } from 'vitest';
import { createRandomService, deriveSeed } from '../../../src/engine/random/RandomService';

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

describe('deriveSeed', () => {
  it('is deterministic: same runSeed + parts always derive the same seed', () => {
    expect(deriveSeed(1, 'zone_1', 'battle')).toBe(deriveSeed(1, 'zone_1', 'battle'));
  });

  it('produces a reproducible RandomService stream for the same runSeed (MVP-5 correction 3)', () => {
    const seedA = deriveSeed(42, 'zone_1', 'battle');
    const seedB = deriveSeed(42, 'zone_1', 'battle');
    const a = createRandomService(seedA);
    const b = createRandomService(seedB);
    const seqA = Array.from({ length: 5 }, () => a.uniform(0, 1));
    const seqB = Array.from({ length: 5 }, () => b.uniform(0, 1));
    expect(seqA).toEqual(seqB);
  });

  it('a different runSeed on the same stage/zone yields a different stream', () => {
    const seedA = deriveSeed(1, 'zone_1', 'battle');
    const seedB = deriveSeed(2, 'zone_1', 'battle');
    expect(seedA).not.toBe(seedB);
    const a = createRandomService(seedA);
    const b = createRandomService(seedB);
    const seqA = Array.from({ length: 5 }, () => a.uniform(0, 1));
    const seqB = Array.from({ length: 5 }, () => b.uniform(0, 1));
    expect(seqA).not.toEqual(seqB);
  });

  it('battle and reward derive independent seeds for the same runSeed/zone', () => {
    const battleSeed = deriveSeed(7, 'zone_1', 'battle');
    const rewardSeed = deriveSeed(7, 'zone_1', 'reward');
    expect(battleSeed).not.toBe(rewardSeed);
  });

  it('different zone ids derive different seeds for the same runSeed/purpose', () => {
    expect(deriveSeed(7, 'zone_1', 'battle')).not.toBe(deriveSeed(7, 'zone_2', 'battle'));
  });
});
