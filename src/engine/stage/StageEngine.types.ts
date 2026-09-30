import type { ItemBattleSlot } from '../battle/BattleEngine.types';
import type { RunState } from '../roguelite/RogueliteEngine.types';

/**
 * One enemy placement within a Zone (spec v0.5 §2.1/§18.7, MVP-5 data-driven
 * requirement). `enemyDefinitionId` is the stable content id (CLAUDE.md
 * §15); `instanceId` is this placement's battle-local identity, so the same
 * EnemyDefinition can appear more than once in one Zone (MVP-5 correction 1)
 * without colliding — see EnemyBattleInstance in BattleEngine.types.ts,
 * which is what these get resolved into before reaching BattleEngine.
 */
export interface EnemyInstanceDefinition {
  enemyDefinitionId: string;
  instanceId: string;
}

/**
 * A Zone = an enemy formation (spec §2.1). No extra layer between Zone and
 * enemy formation is introduced (spec explicitly forbids a separate
 * "formation" concept).
 */
export interface ZoneDefinition {
  id: string;
  /** 1 or more (spec §2.1). */
  enemies: EnemyInstanceDefinition[];
  /** Spec §9.1: whether this zone's reward phase offers 4 candidates instead of 3. */
  isRareRewardEvent: boolean;
  /**
   * Stable id of a data-driven permanent-reward profile (spec §10/§11, MVP-7
   * decision doc §3) — e.g. `"NORMAL_ZONE"`/`"BOSS_ZONE"` in
   * `progressionConfig.zoneRewardProfiles`. StageEngine never interprets
   * this string; only ProgressionSystem.reconcileStageResult reads it (via
   * the StageDefinition carried in StageEndContext), which is what keeps
   * "StageEngineは経験値・通貨・装備報酬量を計算しない" true by construction.
   */
  permanentRewardProfileId: string;
  /**
   * Whether this is the Stage's final zone (spec §2.1: "各ステージの最終
   * ゾーンにはボスが1体存在する"). Boss placement itself is validated by
   * stageValidation.ts against `EnemyDefinition.isBoss`, never inferred from
   * a zone's index (MVP-5 correction 2 — "Zone 3だからBoss" is forbidden).
   */
  isFinalZone: boolean;
}

export interface StageDefinition {
  id: string;
  name: string;
  /** Official content uses exactly 10 zones. The last entry is the lap-boundary boss zone. */
  zones: ZoneDefinition[];
}

export type StagePhase = 'ZONE_BATTLE' | 'ZONE_REWARD' | 'INTER_ZONE_CHOICE' | 'STAGE_RESULT';

export type StageOutcome = 'CLEARED' | 'DEFEATED' | 'SELF_RETURNED';

export interface StageResult {
  stageId: string;
  outcome: StageOutcome;
  /** Total zones fully cleared across all laps before this outcome. */
  zonesCleared: number;
  /** Number of complete 10-zone laps finished during this run. Optional only for RunSave v1 backward compatibility. */
  completedLaps?: number;
  /**
   * Zone ids whose battle was won during this Stage attempt (MVP-7 decision
   * doc: a plain game-progress fact StageResult may carry). This is what
   * `ProgressionSystem.reconcileStageResult` iterates to look up each
   * cleared zone's `permanentRewardProfileId` — StageEngine itself never
   * computes or interprets any reward amount from it.
   */
  clearedZoneIds: string[];
}

/**
 * Everything StageEngine itself tracks about one Stage attempt. Deliberately
 * wraps RogueliteEngine's own `RunState` unchanged rather than extending it
 * (CLAUDE.md §18.5/user's boundary requirement: RogueliteEngine must stay
 * completely unaware that Stages/Zones exist, and its existing `RunState`
 * type/call sites must not change shape for this).
 */
export interface StageRunState {
  stageId: string;
  /**
   * The one seed this Stage attempt is rooted in (MVP-5 correction 3).
   * Every zone's battle/reward randomness is derived from this via
   * `deriveSeed(runSeed, zoneId, purpose)` — never combined from
   * `stageId + zoneIndex` alone, so a re-run with the same runSeed is fully
   * reproducible and a different runSeed on the same Stage yields an
   * unrelated sequence.
   */
  runSeed: number;
  currentZoneIndex: number;
  /**
   * Completed full-stage laps. 0 = first 10-zone pass, 1 = second pass, etc.
   * Optional only so existing RunSave v1 payloads resume as lap 0.
   */
  completedLaps?: number;
  phase: StagePhase;
  runState: RunState;
  /**
   * Zone ids won so far this Stage attempt (append-only, MVP-7). Copied
   * verbatim into `StageResult.clearedZoneIds` once the attempt ends —
   * StageEngine only ever records the fact "this zone id was won", never
   * what it's worth.
   */
  clearedZoneIds: string[];
  /**
   * The party-shared item loadout (spec §5.10/§14, MVP-7 decision doc §14):
   * a single pool that carries across the WHOLE Stage attempt, not
   * refilled per zone. Seeded from `StageLaunchConfig.battleItems` at
   * `createInitialState` and refreshed by `recordZoneWin`/`recordZoneDefeat`
   * whenever a Zone's battle ends, so consumption persists into the
   * next zone. Diffing this against the launch-time loadout (by the
   * Base⇄Stage boundary, when building StageEndContext) is how
   * `consumedItemCounts` is derived — StageEngine itself never touches
   * PermanentState.
   */
  battleItems: ItemBattleSlot[];
  result: StageResult | null;
}
