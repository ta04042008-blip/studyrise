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
};
