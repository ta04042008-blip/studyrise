import { describe, expect, it } from 'vitest';
import { calculateAttackDamage } from '../../../src/engine/battle/damage';
import { battleConfig } from '../../../src/config/battleConfig';
import type { RandomService } from '../../../src/engine/random/RandomService';

function stubRandom(overrides: Partial<RandomService>): RandomService {
  return {
    uniform: () => 1,
    chance: () => false,
    int: () => 0,
    pick: (items) => items[0],
    ...overrides,
  };
}

describe('calculateAttackDamage', () => {
  it('computes damage from (attack - defense) with no variance/crit', () => {
    const random = stubRandom({ uniform: () => 1, chance: () => false });
    const result = calculateAttackDamage(
      { attackerAttack: 30, defenderDefense: 10, starModifier: 1 },
      battleConfig,
      random,
    );
    expect(result.damage).toBe(20);
    expect(result.isCritical).toBe(false);
  });

  it('applies the random variance multiplier', () => {
    const random = stubRandom({ uniform: () => 1.1, chance: () => false });
    const result = calculateAttackDamage(
      { attackerAttack: 30, defenderDefense: 10, starModifier: 1 },
      battleConfig,
      random,
    );
    expect(result.damage).toBe(22); // 20 * 1.1
  });

  it('applies the critical multiplier when a critical is rolled', () => {
    const random = stubRandom({ uniform: () => 1, chance: () => true });
    const result = calculateAttackDamage(
      { attackerAttack: 30, defenderDefense: 10, starModifier: 1 },
      battleConfig,
      random,
    );
    expect(result.damage).toBe(30); // 20 * 1.5
    expect(result.isCritical).toBe(true);
  });

  it('never returns less than the configured minimum damage floor', () => {
    const random = stubRandom({ uniform: () => 1, chance: () => false });
    const result = calculateAttackDamage(
      { attackerAttack: 5, defenderDefense: 50, starModifier: 1 },
      battleConfig,
      random,
    );
    expect(result.damage).toBe(battleConfig.minimumDamage);
  });

  it('applies the ★ modifier multiplicatively', () => {
    const random = stubRandom({ uniform: () => 1, chance: () => false });
    const result = calculateAttackDamage(
      { attackerAttack: 30, defenderDefense: 10, starModifier: 2 },
      battleConfig,
      random,
    );
    expect(result.damage).toBe(40); // 20 * 2
  });
});
