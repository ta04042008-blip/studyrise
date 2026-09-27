import type { StarLevel } from '../types/stats';

/**
 * Centralized balance configuration (CLAUDE.md §11, spec §19).
 * Values marked PLACEHOLDER are not specified numerically anywhere in
 * docs/StudyRise_Spec_v0.2.md and must be tuned later; the *mechanism*
 * each value drives is specified, only the number is not.
 */
export interface BattleConfig {
  /** Damage variance multiplier range. Spec §19 current baseline: 0.90–1.10. */
  damageVarianceMin: number;
  damageVarianceMax: number;

  /** Critical hit chance and multiplier. Spec §19 current baseline: 4%, 1.5x. */
  criticalChance: number;
  criticalMultiplier: number;

  /**
   * PLACEHOLDER: minimum guaranteed damage floor. Spec §5.6 states a floor
   * exists ("最低ダメージ保障を持つ") but gives no number in §19. Using 1
   * until a balance value is confirmed.
   */
  minimumDamage: number;

  /**
   * PLACEHOLDER: per-★ damage multiplier for the Attack command. Spec §5.6
   * names `starModifier` as a formula term but (unlike Guard's ★ table in
   * §5.7) gives no per-star values anywhere. Flat 1.0 until a balance
   * curve is confirmed — do not invent a curve.
   */
  attackStarModifier: Record<StarLevel, number>;

  /**
   * PLACEHOLDER: `attackSpecificMultiplier` term from the damage formula in
   * §5.6, reserved for future attack-derivative differentiation. No value
   * is given in the spec; 1.0 is a neutral placeholder.
   */
  attackCommandMultiplier: number;

  /** Guard mitigation by ★, spec §5.7/§19 explicit baseline: 20/30/40/50/60%. */
  guardMitigationByStar: Record<StarLevel, number>;
  /** Guard great-success independent roll chance, spec §19 explicit baseline: 5%. */
  guardGreatSuccessChance: number;
  /**
   * MVP baseline (confirmed by the user, not in the written spec): a guard
   * great success adds this many percentage points to the ★-based
   * mitigation (e.g. ★1 20%→40%, ★3 40%→60%), capped by guardMaxMitigation.
   */
  guardGreatSuccessBonusMitigation: number;
  /** Final mitigation cap regardless of ★/great-success stacking. MVP baseline: 90%. */
  guardMaxMitigation: number;

  /** Charge great-success independent roll chance, spec §19 explicit baseline: 5%. */
  chargeGreatSuccessChance: number;
  /** MP gained on a normal successful Charge. Spec §5.8 explicit: 1. */
  chargeMpGainNormal: number;
  /** MP gained on a great-success Charge. Spec §5.8 explicit: 2. */
  chargeMpGainGreatSuccess: number;

  /** Search revealed-action count by ★, spec §5.9 explicit: 2/3/4/6/8. */
  searchRevealCountByStar: Record<StarLevel, number>;
}

export const battleConfig: BattleConfig = {
  damageVarianceMin: 0.9,
  damageVarianceMax: 1.1,
  criticalChance: 0.04,
  criticalMultiplier: 1.5,
  minimumDamage: 1, // PLACEHOLDER
  attackStarModifier: {
    1: 1.0, // PLACEHOLDER
    2: 1.0, // PLACEHOLDER
    3: 1.0, // PLACEHOLDER
    4: 1.0, // PLACEHOLDER
    5: 1.0, // PLACEHOLDER
  },
  attackCommandMultiplier: 1.0, // PLACEHOLDER

  guardMitigationByStar: {
    1: 0.2,
    2: 0.3,
    3: 0.4,
    4: 0.5,
    5: 0.6,
  },
  guardGreatSuccessChance: 0.05,
  guardGreatSuccessBonusMitigation: 0.2,
  guardMaxMitigation: 0.9,

  chargeGreatSuccessChance: 0.05,
  chargeMpGainNormal: 1,
  chargeMpGainGreatSuccess: 2,

  searchRevealCountByStar: {
    1: 2,
    2: 3,
    3: 4,
    4: 6,
    5: 8,
  },
};
