import type { StatKey } from '../../types/stats';
import type { Rarity } from '../../types/rarity';
import type { StageDefinition, StageResult } from '../stage/StageEngine.types';

// ---------------------------------------------------------------------------
// Level / growth (spec v0.7 §10.1/§10.2, user's MVP-7 decision doc §1/§2)
// ---------------------------------------------------------------------------

/** Stat keys a character can permanently grow (HP/学力/忍耐力/思考速度 — MP is fixed, spec §10.1). */
export type GrowableStatKey = Exclude<StatKey, 'mp'>;

/** MVP-7 fixed set of growth curves (user's decision doc §2) — POWER/GUARD/SPEED. */
export type GrowthProfileId = 'POWER' | 'GUARD' | 'SPEED';

/** Flat per-level stat gain for one growth profile (applied from Lv2 onward — Lv1 has 0 growth). */
export type GrowthProfile = Record<GrowableStatKey, number>;

// ---------------------------------------------------------------------------
// Equipment (spec §10.2/§10.3/§10.4/§10.5, user's decision doc §7-10)
// ---------------------------------------------------------------------------

export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';

/**
 * Content definition for one piece of equipment (CLAUDE.md §15: stable id,
 * never a display name). MVP-7 explicitly excludes specialEffects,
 * allowedCharacterIds, requiredLevel and random substats (user's decision
 * doc §7) — every slot-matching character can equip every definition.
 */
export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  /** Fixed base stat bonus at enhancement +0 (spec §10.2: performance is fixed at acquisition, no random substats). */
  baseStatBonus: Partial<Record<GrowableStatKey, number>>;
  /** Added once per enhancement level (user's decision doc §9: "EquipmentDefinition.enhancementBonusPerLevel をLvごとに加算"). */
  enhancementBonusPerLevel: Partial<Record<GrowableStatKey, number>>;
}

/**
 * One owned copy of an EquipmentDefinition (CLAUDE.md §15: definition id
 * and instance id kept separate, mirroring EnemyBattleInstance). Does NOT
 * carry `equippedByCharacterId` — the single source of truth for "who has
 * this equipped" is `PermanentCharacterState.equipped` alone (user's
 * decision doc, explicit no-dual-bookkeeping instruction).
 */
export interface EquipmentInstance {
  instanceId: string;
  definitionId: string;
  enhancementLevel: number;
  locked: boolean;
}

// ---------------------------------------------------------------------------
// Zone / Stage permanent reward data (spec §10-§11, user's decision doc §3/§4/§11)
// ---------------------------------------------------------------------------

/** One weighted entry in an equipment drop table. */
export interface EquipmentDropTableEntry {
  equipmentDefinitionId: string;
  weight: number;
}

export interface EquipmentDropTable {
  id: string;
  entries: EquipmentDropTableEntry[];
}

/**
 * Data-driven permanent reward profile a Zone references by id (user's
 * decision doc §3: "StageEngineは内容を解釈しません。ProgressionSystemのみが
 * 解釈します"). StageEngine only ever carries `permanentRewardProfileId`
 * (a plain string) on ZoneDefinition — this shape, and the id→profile map,
 * are ProgressionSystem/progressionConfig concerns only.
 */
export interface ZonePermanentRewardProfile {
  id: string;
  expPerCharacter: number;
  currency: number;
  material: number;
  equipmentDropChance: number;
  equipmentDropTableId: string;
}

// ---------------------------------------------------------------------------
// Unlock rules (spec §10.7/§2.2, user's decision doc §12/§13)
// ---------------------------------------------------------------------------

/** MVP-7 supports exactly these two character-unlock triggers (AREA_CLEAR/SPECIAL_CONDITION/STORY are future work). */
export type CharacterUnlockRule =
  | { type: 'STAGE_FIRST_CLEAR'; stageId: string; characterId: string }
  | { type: 'UNLOCK_RESOURCE'; cost: number; characterId: string };

/** MVP-7 supports exactly one stage-unlock trigger: a stage's first clear unlocks a fixed list of other stageIds. */
export interface StageUnlockRule {
  type: 'STAGE_FIRST_CLEAR';
  stageId: string;
  unlocksStageIds: string[];
}

// ---------------------------------------------------------------------------
// PermanentState (user's decision doc "PermanentState" section)
// ---------------------------------------------------------------------------

export interface PermanentCharacterState {
  characterId: string;
  /** Cumulative lifetime EXP (never decreases) — level is always re-derived from this (see ProgressionSystem.computeLevelFromTotalExp), never stored separately as an independent source of truth. */
  exp: number;
  level: number;
  equipped: {
    weaponInstanceId: string | null;
    armorInstanceId: string | null;
    accessoryInstanceId: string | null;
  };
}

export interface PermanentInventory {
  equipment: EquipmentInstance[];
  /** itemDefinitionId → owned quantity (spec §14 持ち込み消費アイテムの恒久所持数). */
  consumables: Record<string, number>;
}

/**
 * Everything about the player's account/progression that survives a Stage
 * attempt regardless of outcome (spec §18.11 PermanentSave, minus the
 * `saveVersion`/serialization wrapper — that is MVP-9's SaveSystem
 * concern; MVP-7 keeps this in memory only, per user's explicit
 * instruction not to build persistence yet).
 */
export interface PermanentState {
  characters: Record<string, PermanentCharacterState>;
  unlockedCharacterIds: string[];
  unlockedStageIds: string[];
  /** Required for first-clear-reward gating (user's decision doc: "初回クリア判定のため clearedStageIds は必須"). */
  clearedStageIds: string[];
  currency: number;
  materials: Record<string, number>;
  rareUnlockResource: number;
  /**
   * Saved Base party preset in battle order. Optional for PermanentSave v1
   * compatibility: saves created before the Base-home redesign simply omit it.
   */
  savedPartyCharacterIds?: string[];
  /** Free-form Base memo. Optional for PermanentSave v1 compatibility. */
  baseMemo?: string;
  inventory: PermanentInventory;
}

// ---------------------------------------------------------------------------
// Stage-end reconciliation input/output (user's decision doc, replacing the
// earlier RunState.runRewardLedger design)
// ---------------------------------------------------------------------------

/**
 * Everything ProgressionSystem needs to compute Stage-end permanent rewards,
 * assembled by the Base⇄Stage boundary (useStageController) once a
 * StageResult is final and handed to Base's "拠点へ戻る" click handler.
 * Carries no engine instance/state of its own — purely a snapshot of facts
 * (CLAUDE.md §9/user's explicit boundary: StageEngine computes none of this,
 * it only reports what happened).
 */
export interface StageEndContext {
  stageResult: StageResult;
  stage: StageDefinition;
  partyCharacterIds: string[];
  runSeed: number;
  /** itemDefinitionId → number of uses actually consumed during this Stage attempt (spec §14: only consumed counts are deducted from PermanentState; unused stock is untouched). */
  consumedItemCounts: Record<string, number>;
}

/** One character's level-up summary from a single reconcileStageResult call, for UI/debug/test purposes only — never re-derived from this by any engine. */
export interface CharacterLevelUpSummary {
  characterId: string;
  expGained: number;
  levelBefore: number;
  levelAfter: number;
}

export interface EquipmentDropSummary {
  instanceId: string;
  equipmentDefinitionId: string;
  zoneId: string;
}

/** Everything reconcileStageResult changed, for the Base layer to display/verify — the actual state change is the returned PermanentState; this is a read-only report. */
export interface StageRewardSummary {
  levelUps: CharacterLevelUpSummary[];
  currencyGained: number;
  currencyLostToDefeat: number;
  materialGained: number;
  materialLostToDefeat: number;
  rareUnlockResourceGained: number;
  equipmentDropped: EquipmentDropSummary[];
  isFirstClear: boolean;
  unlockedCharacterIds: string[];
  unlockedStageIds: string[];
}
