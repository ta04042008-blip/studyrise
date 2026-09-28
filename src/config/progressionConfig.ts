import type { Rarity } from '../types/rarity';
import type { GrowableStatKey, GrowthProfile, GrowthProfileId, ZonePermanentRewardProfile } from '../engine/progression/ProgressionSystem.types';

/**
 * Centralized permanent-growth balance configuration (CLAUDE.md §11,
 * spec v0.7 §10/§11/§19). Every numeric baseline here is a value the user
 * confirmed explicitly for MVP-7 (not an invented PLACEHOLDER) — see the
 * MVP-7 decision doc this file implements section-by-section.
 */

// ---------------------------------------------------------------------------
// Currency / material stable ids + UI labels (MVP-7 decision doc §6:
// internal id vs UI 仮称, mirroring STAT_LABELS in types/stats.ts)
// ---------------------------------------------------------------------------

export const UPGRADE_MATERIAL_ID = 'upgrade_material';

export const CURRENCY_LABEL = 'コイン';
export const UPGRADE_MATERIAL_LABEL = '強化素材';
export const RARE_UNLOCK_RESOURCE_LABEL = '解放結晶';

// ---------------------------------------------------------------------------
// Level / EXP (decision doc §1)
// ---------------------------------------------------------------------------

export interface ExpCurveConfig {
  /** nextLevelExpCost(level) = round(coefficient * level^exponent + constant). */
  coefficient: number;
  exponent: number;
  constant: number;
}

// ---------------------------------------------------------------------------
// Growth profiles (decision doc §2) — Lv1 has 0 growth; from Lv2 onward each
// level adds one profile's worth of these per-stat flat gains.
// ---------------------------------------------------------------------------

export const GROWTH_PROFILES: Record<GrowthProfileId, GrowthProfile> = {
  POWER: { hp: 4, attack: 4, defense: 2, speed: 2 },
  GUARD: { hp: 7, attack: 2, defense: 4, speed: 1 },
  SPEED: { hp: 4, attack: 3, defense: 2, speed: 4 },
};

// ---------------------------------------------------------------------------
// Zone permanent reward profiles (decision doc §3) — StageEngine only ever
// carries the id; this map (and its interpretation) is ProgressionSystem-only.
// ---------------------------------------------------------------------------

export const ZONE_REWARD_PROFILES: Record<string, ZonePermanentRewardProfile> = {
  NORMAL_ZONE: {
    id: 'NORMAL_ZONE',
    expPerCharacter: 20,
    currency: 15,
    material: 1,
    equipmentDropChance: 0.15,
    equipmentDropTableId: 'drop_table_normal',
  },
  BOSS_ZONE: {
    id: 'BOSS_ZONE',
    expPerCharacter: 40,
    currency: 30,
    material: 2,
    equipmentDropChance: 0.5,
    equipmentDropTableId: 'drop_table_boss',
  },
};

// ---------------------------------------------------------------------------
// Stage Clear / first-clear bonuses (decision doc §4)
// ---------------------------------------------------------------------------

export interface StageClearBonusConfig {
  currency: number;
  material: number;
}

export interface FirstClearBonusConfig {
  rareUnlockResource: number;
}

// ---------------------------------------------------------------------------
// Defeat resource loss (decision doc §5)
// ---------------------------------------------------------------------------

export interface DefeatLossConfig {
  /** loss = floor(runGain * defeatResourceLossRate); applies to run-earned currency/material only — never EXP, equipment, or existing PermanentState assets. */
  defeatResourceLossRate: number;
}

// ---------------------------------------------------------------------------
// Equipment enhancement (decision doc §8/§9)
// ---------------------------------------------------------------------------

export interface EquipmentEnhancementConfig {
  maxEnhancementLevelByRarity: Record<Rarity, number>;
  /** currencyCost(n) = currencyCostBaseByRarity[rarity] * n, where n is the NEXT enhancement level being purchased. */
  currencyCostBaseByRarity: Record<Rarity, number>;
  /** materialCost(n) = ceil(n / 3) * materialCostRarityMultiplier[rarity]. */
  materialCostRarityMultiplier: Record<Rarity, number>;
}

// ---------------------------------------------------------------------------
// Equipment dismantle (decision doc §10)
// ---------------------------------------------------------------------------

export interface EquipmentDismantleConfig {
  /** baseReturn(rarity) + floor(enhancementLevel / 2) = total material returned. */
  baseReturnByRarity: Record<Rarity, number>;
}

export interface ProgressionConfig {
  expCurve: ExpCurveConfig;
  growthProfiles: Record<GrowthProfileId, GrowthProfile>;
  zoneRewardProfiles: Record<string, ZonePermanentRewardProfile>;
  stageClearBonus: StageClearBonusConfig;
  firstClearBonus: FirstClearBonusConfig;
  defeatLoss: DefeatLossConfig;
  equipmentEnhancement: EquipmentEnhancementConfig;
  equipmentDismantle: EquipmentDismantleConfig;
}

export const progressionConfig: ProgressionConfig = {
  expCurve: {
    coefficient: 20,
    exponent: 1.35,
    constant: 10,
  },

  growthProfiles: GROWTH_PROFILES,

  zoneRewardProfiles: ZONE_REWARD_PROFILES,

  stageClearBonus: {
    currency: 30,
    material: 2,
  },

  firstClearBonus: {
    rareUnlockResource: 1,
  },

  defeatLoss: {
    defeatResourceLossRate: 0.3,
  },

  equipmentEnhancement: {
    maxEnhancementLevelByRarity: {
      NORMAL: 5,
      UNCOMMON: 7,
      RARE: 10,
      EPIC: 12,
      LEGENDARY: 15,
    },
    currencyCostBaseByRarity: {
      NORMAL: 20,
      UNCOMMON: 30,
      RARE: 50,
      EPIC: 80,
      LEGENDARY: 120,
    },
    materialCostRarityMultiplier: {
      NORMAL: 1,
      UNCOMMON: 1,
      RARE: 2,
      EPIC: 2,
      LEGENDARY: 3,
    },
  },

  equipmentDismantle: {
    baseReturnByRarity: {
      NORMAL: 1,
      UNCOMMON: 2,
      RARE: 4,
      EPIC: 7,
      LEGENDARY: 12,
    },
  },
};

/** Re-exported for callers that only need the stat-key type, avoiding an extra import from the engine types module. */
export type { GrowableStatKey };
