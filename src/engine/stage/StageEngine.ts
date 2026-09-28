import type { CharacterDefinition, EnemyBattleInstance, EnemyDefinition } from '../battle/BattleEngine.types';
import { deriveSeed } from '../random/RandomService';
import type { RogueliteEngine } from '../roguelite/RogueliteEngine';
import type { RunState } from '../roguelite/RogueliteEngine.types';
import type { StageConfig } from '../../config/stageConfig';
import type { StageDefinition, StageRunState, ZoneDefinition } from './StageEngine.types';

/**
 * The subset of RogueliteEngine's pure, randomness-free methods StageEngine
 * needs (MVP-5 correction 4): reused verbatim, structurally, from whichever
 * real RogueliteEngine instance the caller already has — StageEngine never
 * re-derives effective stats/HP itself. `Pick<RogueliteEngine, ...>` rather
 * than a hand-written duplicate keeps this locked to the actual engine
 * interface.
 */
export type RunResolver = Pick<RogueliteEngine, 'createInitialRunState' | 'resolveBattleInputsForRun' | 'resetRunBuild'>;

/**
 * StageEngine (spec v0.5 §2/MVP-5): owns multi-zone Stage progression only.
 * BattleEngine still only ever runs one Zone's battle; RogueliteEngine still
 * only ever runs one Zone's reward phase (CLAUDE.md §18.3/§18.5). Every
 * function here is pure (input state → new state) and every transition
 * no-ops on an unexpected `phase` (CLAUDE.md §13 idempotency) — this is also
 * what makes "自主帰還 mid-battle" structurally impossible: selfReturn only
 * ever does anything from INTER_ZONE_CHOICE.
 */
export interface StageEngine {
  createInitialState(stage: StageDefinition, party: CharacterDefinition[], runSeed: number, runResolver: RunResolver): StageRunState;
  currentZone(stage: StageDefinition, state: StageRunState): ZoneDefinition;
  /** Resolves the current zone's enemy placements into BattleEngine-ready instances (definition id and instance id kept separate — MVP-5 correction 1). */
  resolveZoneEnemies(
    stage: StageDefinition,
    state: StageRunState,
    enemyDefinitionsById: Record<string, EnemyDefinition>,
  ): EnemyBattleInstance[];
  /** `deriveSeed(runSeed, zoneId, "battle")` (MVP-5 correction 3) — independent of, and unaffected by, the reward seed or UI re-renders. */
  deriveZoneBattleSeed(stage: StageDefinition, state: StageRunState): number;
  /** `deriveSeed(runSeed, zoneId, "reward")`. */
  deriveZoneRewardSeed(stage: StageDefinition, state: StageRunState): number;
  /** BattleEngine reported outcome==='win': snapshot survivor HP (KO'd stay 0) and move to ZONE_REWARD. No-op unless currently ZONE_BATTLE. */
  recordZoneWin(state: StageRunState, survivorHpByCharacterId: Record<string, number>): StageRunState;
  /** BattleEngine reported outcome==='lose': Stage attempt over, RunBuild discarded. No-op unless currently ZONE_BATTLE. */
  recordZoneDefeat(state: StageRunState, party: CharacterDefinition[], runResolver: RunResolver): StageRunState;
  /** Mid-reward-phase progress sync (after each RogueliteEngine apply, not only the last). Always applies while in ZONE_REWARD. */
  updateRunState(state: StageRunState, nextRunState: RunState): StageRunState;
  /**
   * The reward phase's last character has been applied
   * (`state.runState.rewardPhase?.complete === true`) and the player tapped
   * through the completion banner. Final zone → Stage Clear (RunBuild
   * discarded); otherwise → INTER_ZONE_CHOICE. No-op otherwise (double-tap
   * safe, CLAUDE.md §13).
   */
  completeZoneReward(stage: StageDefinition, state: StageRunState, party: CharacterDefinition[], runResolver: RunResolver): StageRunState;
  /**
   * INTER_ZONE_CHOICE → next ZONE_BATTLE. Applies the confirmed MVP-5 KO
   * revival rule (30% of effectiveMaxHp, ceil, minimum 1) via `runResolver`
   * — survivors are left untouched. No-op unless currently INTER_ZONE_CHOICE.
   */
  continueToNextZone(stage: StageDefinition, state: StageRunState, party: CharacterDefinition[], runResolver: RunResolver): StageRunState;
  /** INTER_ZONE_CHOICE → STAGE_RESULT(SELF_RETURNED), RunBuild discarded. No-op unless currently INTER_ZONE_CHOICE (spec: self-return is impossible during battle). */
  selfReturn(state: StageRunState, party: CharacterDefinition[], runResolver: RunResolver): StageRunState;
}

export function createStageEngine(deps: { config: StageConfig }): StageEngine {
  function currentZone(stage: StageDefinition, state: StageRunState): ZoneDefinition {
    return stage.zones[state.currentZoneIndex];
  }

  function createInitialState(
    stage: StageDefinition,
    party: CharacterDefinition[],
    runSeed: number,
    runResolver: RunResolver,
  ): StageRunState {
    return {
      stageId: stage.id,
      runSeed,
      currentZoneIndex: 0,
      phase: 'ZONE_BATTLE',
      runState: runResolver.createInitialRunState(party),
      result: null,
    };
  }

  function resolveZoneEnemies(
    stage: StageDefinition,
    state: StageRunState,
    enemyDefinitionsById: Record<string, EnemyDefinition>,
  ): EnemyBattleInstance[] {
    return currentZone(stage, state).enemies.map((e) => ({
      instanceId: e.instanceId,
      definition: enemyDefinitionsById[e.enemyDefinitionId],
    }));
  }

  function deriveZoneBattleSeed(stage: StageDefinition, state: StageRunState): number {
    return deriveSeed(state.runSeed, currentZone(stage, state).id, 'battle');
  }

  function deriveZoneRewardSeed(stage: StageDefinition, state: StageRunState): number {
    return deriveSeed(state.runSeed, currentZone(stage, state).id, 'reward');
  }

  function recordZoneWin(state: StageRunState, survivorHpByCharacterId: Record<string, number>): StageRunState {
    if (state.phase !== 'ZONE_BATTLE') return state;
    return {
      ...state,
      phase: 'ZONE_REWARD',
      runState: { ...state.runState, currentHpByCharacterId: survivorHpByCharacterId },
    };
  }

  function recordZoneDefeat(state: StageRunState, party: CharacterDefinition[], runResolver: RunResolver): StageRunState {
    if (state.phase !== 'ZONE_BATTLE') return state;
    return {
      ...state,
      phase: 'STAGE_RESULT',
      runState: runResolver.resetRunBuild(state.runState, party),
      result: { stageId: state.stageId, outcome: 'DEFEATED', zonesCleared: state.currentZoneIndex },
    };
  }

  function updateRunState(state: StageRunState, nextRunState: RunState): StageRunState {
    if (state.phase !== 'ZONE_REWARD') return state;
    return { ...state, runState: nextRunState };
  }

  function completeZoneReward(
    stage: StageDefinition,
    state: StageRunState,
    party: CharacterDefinition[],
    runResolver: RunResolver,
  ): StageRunState {
    if (state.phase !== 'ZONE_REWARD' || !state.runState.rewardPhase?.complete) return state; // no-op (CLAUDE.md §13)

    const zone = currentZone(stage, state);
    if (zone.isFinalZone) {
      return {
        ...state,
        phase: 'STAGE_RESULT',
        runState: runResolver.resetRunBuild(state.runState, party),
        result: { stageId: state.stageId, outcome: 'CLEARED', zonesCleared: state.currentZoneIndex + 1 },
      };
    }
    return { ...state, phase: 'INTER_ZONE_CHOICE' };
  }

  /** MVP-5 confirmed baseline: KO'd (0 HP) characters revive at `ceil(effectiveMaxHp * koReviveHpPercent)`, minimum 1. Survivors untouched. */
  function applyKoRevival(runState: RunState, party: CharacterDefinition[], runResolver: RunResolver): RunState {
    // Single source of truth for effective stats (MVP-5 correction 4): the
    // same resolveBattleInputsForRun a battle's own inputs are built from.
    const { players } = runResolver.resolveBattleInputsForRun(party, runState);
    const effectiveMaxHpById = new Map(players.map((p) => [p.id, p.baseStats.maxHp]));

    const nextHp = { ...runState.currentHpByCharacterId };
    for (const character of party) {
      const current = runState.currentHpByCharacterId[character.id] ?? 0;
      if (current > 0) continue; // survivors carry over unchanged (spec §9.13)
      const effectiveMaxHp = effectiveMaxHpById.get(character.id) ?? character.baseStats.maxHp;
      nextHp[character.id] = Math.max(1, Math.ceil(effectiveMaxHp * deps.config.koReviveHpPercent));
    }
    return { ...runState, currentHpByCharacterId: nextHp };
  }

  function continueToNextZone(
    _stage: StageDefinition,
    state: StageRunState,
    party: CharacterDefinition[],
    runResolver: RunResolver,
  ): StageRunState {
    if (state.phase !== 'INTER_ZONE_CHOICE') return state; // no-op — also what makes self-return-during-battle structurally impossible elsewhere
    const revivedRunState = applyKoRevival(state.runState, party, runResolver);
    return {
      ...state,
      currentZoneIndex: state.currentZoneIndex + 1,
      phase: 'ZONE_BATTLE',
      runState: { ...revivedRunState, rewardPhase: null },
    };
  }

  function selfReturn(state: StageRunState, party: CharacterDefinition[], runResolver: RunResolver): StageRunState {
    if (state.phase !== 'INTER_ZONE_CHOICE') return state; // no-op: self-return is only ever possible between zones (spec §2.5)
    return {
      ...state,
      phase: 'STAGE_RESULT',
      runState: runResolver.resetRunBuild(state.runState, party),
      result: { stageId: state.stageId, outcome: 'SELF_RETURNED', zonesCleared: state.currentZoneIndex + 1 },
    };
  }

  return {
    createInitialState,
    currentZone,
    resolveZoneEnemies,
    deriveZoneBattleSeed,
    deriveZoneRewardSeed,
    recordZoneWin,
    recordZoneDefeat,
    updateRunState,
    completeZoneReward,
    continueToNextZone,
    selfReturn,
  };
}
