/**
 * Centralized Stage/Zone balance configuration (CLAUDE.md §11, spec v0.5
 * §8/§9.13).
 */
export interface StageConfig {
  /** User-confirmed 2026-09-30: all official stages contain exactly 10 zones. */
  officialZoneCount: number;
  /**
   * User-confirmed 2026-09-30: after clearing all 10 zones, continuing starts
   * the same stage's next lap. Enemy strength accelerates multiplicatively:
   * multiplier = enemyStatMultiplierPerLap ** completedLaps.
   */
  enemyStatMultiplierPerLap: number;
  /**
   * Confirmed MVP-5 baseline (user-confirmed, not yet in the written spec,
   * which leaves the number unconfirmed — spec §8/§9.13): a KO'd
   * character automatically revives at the *next* zone's start with this
   * fraction of their effective max HP (RunBuild HP boosts included),
   * computed as `Math.max(1, Math.ceil(effectiveMaxHp * koReviveHpPercent))`.
   * Survivors are never touched by this — their HP simply carries over
   * unchanged (spec §9.13).
   */
  koReviveHpPercent: number;
}

export const stageConfig: StageConfig = {
  officialZoneCount: 10,
  enemyStatMultiplierPerLap: 1.5,
  koReviveHpPercent: 0.3,
};
