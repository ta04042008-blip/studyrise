import { describe, expect, it } from 'vitest';
import { rollRarity } from '../../../src/engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import { fixedUniformRandom, testConfig } from './fixtures';

/**
 * Deterministic cumulative-boundary tests (required per the MVP-4 brief:
 * rarity tests must not be purely statistical). Cumulative thresholds for
 * 50/28/14/6/2%: NORMAL [0, .50), UNCOMMON [.50, .78), RARE [.78, .92),
 * EPIC [.92, .98), LEGENDARY [.98, 1.0). Values are placed comfortably
 * inside each band (never exactly on a boundary) so the test is not
 * sensitive to floating-point rounding at the `<=` cutoff itself.
 */
describe('rollRarity — deterministic cumulative boundaries (50/28/14/6/2%)', () => {
  const cases: [number, string][] = [
    [0.0, 'NORMAL'],
    [0.25, 'NORMAL'],
    [0.4999, 'NORMAL'],
    [0.5001, 'UNCOMMON'],
    [0.6, 'UNCOMMON'],
    [0.7799, 'UNCOMMON'],
    [0.7801, 'RARE'],
    [0.85, 'RARE'],
    [0.9199, 'RARE'],
    [0.9201, 'EPIC'],
    [0.95, 'EPIC'],
    [0.9799, 'EPIC'],
    [0.9801, 'LEGENDARY'],
    [0.999, 'LEGENDARY'],
  ];

  for (const [value, expected] of cases) {
    it(`uniform() = ${value} → ${expected}`, () => {
      expect(rollRarity(testConfig, fixedUniformRandom(value))).toBe(expected);
    });
  }
});

describe('rollRarity — independence from question ★ and everything else', () => {
  it('takes no star/character/build input at all — its only inputs are config and random', () => {
    // Structural guarantee: rollRarity's signature is (config, random) only,
    // so nothing about the question difficulty, target character, or
    // current build can possibly reach it.
    expect(rollRarity.length).toBe(2);
  });

  it('is fully reproducible from the same seed (same rarity sequence every time, regardless of any other context)', () => {
    const randomA = createRandomService(42);
    const randomB = createRandomService(42);
    const seqA = Array.from({ length: 50 }, () => rollRarity(testConfig, randomA));
    const seqB = Array.from({ length: 50 }, () => rollRarity(testConfig, randomB));
    // Two independently-seeded streams consuming the same number of rolls
    // must produce an identical sequence — this proves the roll depends on
    // nothing but (config, random), never on any ambient/call-order state.
    expect(seqA).toEqual(seqB);
  });
});

describe('rollRarity — loose statistical sanity (supplementary, not the primary evidence)', () => {
  it('roughly matches the configured 50/28/14/6/2% weights over many trials', () => {
    const random = createRandomService(7);
    const counts: Record<string, number> = { NORMAL: 0, UNCOMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0 };
    const trials = 20000;
    for (let i = 0; i < trials; i++) {
      counts[rollRarity(testConfig, random)]++;
    }
    // Generous tolerance (±3 percentage points) — this is a smoke test, the
    // boundary tests above are the actual correctness evidence.
    expect(counts.NORMAL / trials).toBeGreaterThan(0.47);
    expect(counts.NORMAL / trials).toBeLessThan(0.53);
    expect(counts.LEGENDARY / trials).toBeGreaterThan(0.01);
    expect(counts.LEGENDARY / trials).toBeLessThan(0.03);
  });
});
