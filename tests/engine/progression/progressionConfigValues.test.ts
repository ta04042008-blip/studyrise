import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';

/**
 * Direct assertions on the confirmed MVP-7 decision-doc numbers themselves
 * (not engine mechanism) — guards against the config file drifting from what
 * the user explicitly confirmed. Mechanism tests (does reconcileStageResult
 * apply these correctly) live in reconcileStageResult.test.ts, deliberately
 * using a separate lightweight test config so they stay decoupled from any
 * future balance tuning of these real numbers.
 */
describe('progressionConfig — MVP-7 decision doc confirmed values', () => {
  it('Zone permanent reward profiles (§3): NORMAL_ZONE / BOSS_ZONE', () => {
    expect(progressionConfig.zoneRewardProfiles.NORMAL_ZONE).toMatchObject({
      expPerCharacter: 20,
      currency: 15,
      material: 1,
      equipmentDropChance: 0.15,
    });
    expect(progressionConfig.zoneRewardProfiles.BOSS_ZONE).toMatchObject({
      expPerCharacter: 40,
      currency: 30,
      material: 2,
      equipmentDropChance: 0.5,
    });
  });

  it('Stage Clear bonus (§4): currency +30, material +2, no extra EXP', () => {
    expect(progressionConfig.stageClearBonus).toEqual({ currency: 30, material: 2 });
  });

  it('First clear bonus (§4): rareUnlockResource +1', () => {
    expect(progressionConfig.firstClearBonus).toEqual({ rareUnlockResource: 1 });
  });

  it('Defeat resource loss rate (§5): 30%', () => {
    expect(progressionConfig.defeatLoss.defeatResourceLossRate).toBe(0.3);
  });

  it('Equipment enhancement cost bases and material multipliers (§9)', () => {
    expect(progressionConfig.equipmentEnhancement.currencyCostBaseByRarity).toEqual({
      NORMAL: 20,
      UNCOMMON: 30,
      RARE: 50,
      EPIC: 80,
      LEGENDARY: 120,
    });
    expect(progressionConfig.equipmentEnhancement.materialCostRarityMultiplier).toEqual({
      NORMAL: 1,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 2,
      LEGENDARY: 3,
    });
  });

  it('Equipment dismantle base returns (§10)', () => {
    expect(progressionConfig.equipmentDismantle.baseReturnByRarity).toEqual({
      NORMAL: 1,
      UNCOMMON: 2,
      RARE: 4,
      EPIC: 7,
      LEGENDARY: 12,
    });
  });
});
