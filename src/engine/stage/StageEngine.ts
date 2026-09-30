import type { CharacterDefinition, EnemyBattleInstance, EnemyDefinition, ItemBattleSlot } from '../battle/BattleEngine.types';
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
 * Pure bookkeeping helper (MVP-7 decision doc §14): sums remainingUses per
 * item id on both sides and returns how many uses of each item were
 * actually consumed. Deliberately NOT a reward calculation (no currency/
 * EXP/equipment amount is derived here) — just an item-count diff, so it
 * stays fine for StageEngine's own module to own even under the "StageEngine
 * computes no permanent reward amount" rule. Robust to the same item id
 * appearing in more than one loadout slot (spec §14: "同じitemを複数枠へ入
 * れることは可能").
 */
export function diffConsumedItemCounts(original: ItemBattleSlot[], final: ItemBattleSlot[]): Record<string, number> {
  const sumByItemId = (slots: ItemBattleSlot[]): Record<string, number> => {
    const sums: Record<string, number> = {};
    for (const slot of slots) sums[slot.item.id] = (sums[slot.item.id] ?? 0) + slot.remainingUses;
    return sums;
  };
  const originalUses = sumByItemId(original);
  const finalUses = sumByItemId(final);
  const consumed: Record<string, number> = {};
  for (const [itemId, originalCount] of Object.entries(originalUses)) {
    const diff = Math.max(0, originalCount - (finalUses[itemId] ?? 0));
    if (diff > 0) consumed[itemId] = diff;
  }
  return consumed;
}

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
  createInitialState(
    stage: StageDefinition,
    party: CharacterDefinition[],
    runSeed: number,
    runResolver: RunResolver,
    battleItems: ItemBattleSlot[],
  ): StageRunState;
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
  /**
   * BattleEngine reported outcome==='win': snapshot survivor HP (KO'd stay
   * 0), records this zone's id into `clearedZoneIds` (a plain fact —
   * StageEngine computes no reward from it), persists the battle's ending
   * item stock into the stage-wide pool (MVP-7 decision doc §14 — items
   * are never refilled per zone), and moves to ZONE_REWARD. No-op unless
   * currently ZONE_BATTLE.
   */
  recordZoneWin(
    stage: StageDefinition,
    state: StageRunState,
    survivorHpByCharacterId: Record<string, number>,
    remainingBattleItems: ItemBattleSlot[],
  ): StageRunState;
  /**
   * BattleEngine reported outcome==='lose': Stage attempt over, RunBuild
   * discarded, ending item stock persisted (spec §2.6: consumed items stay
   * consumed even on defeat). No-op unless currently ZONE_BATTLE.
   */
  recordZoneDefeat(
    state: StageRunState,
    party: CharacterDefinition[],
    runResolver: RunResolver,
    remainingBattleItems: ItemBattleSlot[],
  ): StageRunState;
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
    battleItems: ItemBattleSlot[],
  ): StageRunState {
    return {
      stageId: stage.id,
      runSeed,
      currentZoneIndex: 0,
      completedLaps: 0,
      phase: 'ZONE_BATTLE',
      runState: runResolver.createInitialRunState(party),
      clearedZoneIds: [],
      battleItems: battleItems.map((slot) => ({ ...slot })),
      result: null,
    };
  }

  function resolveZoneEnemies(
    stage: StageDefinition,
    state: StageRunState,
    enemyDefinitionsById: Record<string, EnemyDefinition>,
  ): EnemyBattleInstance[] {
    const completedLaps = state.completedLaps ?? 0;
    const multiplier = 1 + completedLaps * deps.config.enemyStatGrowthPerLap;

    return currentZone(stage, state).enemies.map((e) => {
      const definition = enemyDefinitionsById[e.enemyDefinitionId];
      if (completedLaps === 0) return { instanceId: e.instanceId, definition };

      return {
        instanceId: e.instanceId,
        definition: {
          ...definition,
          baseStats: {
            attack: Math.ceil(definition.baseStats.attack * multiplier),
            defense: Math.ceil(definition.baseStats.defense * multiplier),
            speed: Math.ceil(definition.baseStats.speed * multiplier),
            maxHp: Math.ceil(definition.baseStats.maxHp * multiplier),
          },
        },
      };
    });
  }

  function lapSeedKey(stage: StageDefinition, state: StageRunState): string {
    const zoneId = currentZone(stage, state).id;
    const completedLaps = state.completedLaps ?? 0;
    // Preserve first-lap RNG exactly; later laps must not replay the same rolls.
    return completedLaps === 0 ? zoneId : zoneId + ':lap:' + (completedLaps + 1);
  }

  function deriveZoneBattleSeed(stage: StageDefinition, state: StageRunState): number {
    return deriveSeed(state.runSeed, lapSeedKey(stage, state), 'battle');
  }

  function deriveZoneRewardSeed(stage: StageDefinition, state: StageRunState): number {
    return deriveSeed(state.runSeed, lapSeedKey(stage, state), 'reward');
  }

  function recordZoneWin(
    stage: StageDefinition,
    state: StageRunState,
    survivorHpByCharacterId: Record<string, number>,
    remainingBattleItems: ItemBattleSlot[],
  ): StageRunState {
    if (state.phase !== 'ZONE_BATTLE') return state;
    const zoneId = currentZone(stage, state).id;
    return {
      ...state,
      phase: 'ZONE_REWARD',
      runState: { ...state.runState, currentHpByCharacterId: survivorHpByCharacterId },
      clearedZoneIds: [...state.clearedZoneIds, zoneId],
      battleItems: remainingBattleItems,
    };
  }

  function recordZoneDefeat(
    state: StageRunState,
    party: CharacterDefinition[],
    runResolver: RunResolver,
    remainingBattleItems: ItemBattleSlot[],
  ): StageRunState {
    if (state.phase !== 'ZONE_BATTLE') return state;
    return {
      ...state,
      phase: 'STAGE_RESULT',
      runState: runResolver.resetRunBuild(state.runState, party),
      battleItems: remainingBattleItems,
      result: {
        stageId: state.stageId,
        outcome: 'DEFEATED',
        zonesCleared: state.currentZoneIndex,
        clearedZoneIds: state.clearedZoneIds,
      },
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
        result: {
          stageId: state.stageId,
          outcome: 'CLEARED',
          zonesCleared: state.currentZoneIndex + 1,
          clearedZoneIds: state.clearedZoneIds,
        },
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
      result: {
        stageId: state.stageId,
        outcome: 'SELF_RETURNED',
        zonesCleared: state.currentZoneIndex + 1,
        clearedZoneIds: state.clearedZoneIds,
      },
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
