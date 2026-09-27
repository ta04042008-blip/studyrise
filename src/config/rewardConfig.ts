import type { StatKey } from '../types/stats';
import type { QuestionCommandKind } from '../engine/battle/BattleEngine.types';
import type { Rarity } from '../engine/roguelite/RogueliteEngine.types';

/**
 * Centralized roguelite reward balance configuration (CLAUDE.md §11, spec
 * §9/§19). All MVP-4 numeric baselines live here so nothing is scattered
 * across RogueliteEngine — values marked MVP_TUNING are explicit MVP-4
 * baselines the user confirmed, not PLACEHOLDER guesses, but are still
 * meant to be adjusted later without touching engine code.
 */
export interface RewardConfig {
  /** Reward candidates offered per character (spec §9.1). */
  candidateCountNormal: number;
  candidateCountRareEvent: number;
  /** Free rerolls per character's reward session (spec §9.1: 1). */
  freeRerollCount: number;

  /** Rarity weights, spec §9.4/§19 explicit baseline: 50/28/14/6/2%. */
  rarityWeights: Record<Rarity, number>;

  /** Base weight for every reward category before exclusion/synergy (spec §9.6: MVP baseline 1.0 for all). */
  categoryBaseWeight: number;
  /** Weight multiplier applied to SPELL_UPGRADE once a character's 3 spell slots are full (spec §9.6). */
  spellSlotsFullUpgradeWeightMultiplier: number;

  /**
   * Maximum total synergy multiplier (spec §9.5 "強い誘導は禁止" — multiple
   * matching conditions never stack past this single cap).
   */
  synergyMultiplierCap: number;

  /** MVP_TUNING: max COMMAND_BOOST stacks per character per command (spec §9.6 "最大Lv報酬は候補から除外"). */
  commandBoostMaxLevel: number;
  /** MVP_TUNING: per-level magnitude for each command's boost. */
  commandBoostPerLevel: Record<QuestionCommandKind, number>;

  /** MVP_TUNING: max TEMP_STAT_BOOST stacks per character per stat. */
  tempStatBoostMaxLevel: number;
  /** MVP_TUNING: per-level flat stat bonus (hp/attack/defense/speed only — no MP temp boost, spec §7.4/§9.2). */
  tempStatBoostPerLevel: Record<Exclude<StatKey, 'mp'>, number>;

  /** MVP_TUNING: HEAL_SPECIAL's MVP-4 sample reward — percent of maxHp restored immediately. */
  healSpecialSamplePercentOfMaxHp: number;
}

export const rewardConfig: RewardConfig = {
  candidateCountNormal: 3,
  candidateCountRareEvent: 4,
  freeRerollCount: 1,

  rarityWeights: {
    NORMAL: 0.5,
    UNCOMMON: 0.28,
    RARE: 0.14,
    EPIC: 0.06,
    LEGENDARY: 0.02,
  },

  categoryBaseWeight: 1.0,
  spellSlotsFullUpgradeWeightMultiplier: 1.2,

  synergyMultiplierCap: 1.15,

  // MVP_TUNING (user-confirmed MVP-4 baseline, spec numbers do not exist yet at the formal-spec level).
  commandBoostMaxLevel: 3,
  commandBoostPerLevel: {
    attack: 10, // +10% final damage per level
    guard: 0.05, // +5 percentage points mitigation per level
    charge: 0.02, // +2 percentage points great-success chance per level
    search: 1, // +1 revealed action per level
  },

  // MVP_TUNING (user-confirmed MVP-4 baseline).
  tempStatBoostMaxLevel: 3,
  tempStatBoostPerLevel: {
    hp: 10,
    attack: 5,
    defense: 5,
    speed: 5,
  },

  // MVP_TUNING (user-confirmed MVP-4 baseline).
  healSpecialSamplePercentOfMaxHp: 0.3,
};
