import { describe, expect, it } from 'vitest';
import { newEnemyRoster } from '../../src/data/enemies/newEnemyRoster';
import { enemyArtById } from '../../src/presentation/assets/studyRiseAssets';

describe('newEnemyRoster', () => {
  it('contains 12 unique stable enemy definitions', () => {
    expect(newEnemyRoster).toHaveLength(12);
    expect(new Set(newEnemyRoster.map((enemy) => enemy.id)).size).toBe(12);
  });

  it('has registered battle art for every new enemy definition', () => {
    for (const enemy of newEnemyRoster) {
      expect(enemyArtById[enemy.id], enemy.id).toBeDefined();
    }
  });

  it('keeps every enemy battle-ready with positive base stats', () => {
    for (const enemy of newEnemyRoster) {
      expect(enemy.baseStats.attack).toBeGreaterThan(0);
      expect(enemy.baseStats.defense).toBeGreaterThanOrEqual(0);
      expect(enemy.baseStats.speed).toBeGreaterThan(0);
      expect(enemy.baseStats.maxHp).toBeGreaterThan(0);
    }
  });
});
