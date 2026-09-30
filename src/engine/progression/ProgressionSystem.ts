import type { CharacterDefinition } from '../battle/BattleEngine.types';
import type { GrowableStatKey, ProgressionConfig, ExpCurveConfig } from '../../config/progressionConfig';
import { UPGRADE_MATERIAL_ID } from '../../config/progressionConfig';
import { createRandomService, deriveSeed, type RandomService } from '../random/RandomService';
import type {
  CharacterUnlockRule,
  EquipmentDefinition,
  EquipmentDropTable,
  EquipmentInstance,
  EquipmentSlot,
  GrowthProfile,
  GrowthProfileId,
  PermanentCharacterState,
  PermanentState,
  StageEndContext,
  StageRewardSummary,
  StageUnlockRule,
} from './ProgressionSystem.types';

/**
 * ProgressionSystem (CLAUDE.md §18.8, spec v0.7 §10/§11): the sole owner of
 * permanent growth — EXP/level, permanent stat growth, currency/materials/
 * rare unlock resource, equipment (acquire/equip/enhance/dismantle),
 * character/stage unlocks, and resolving a character's *effective* battle
 * stats from PermanentState + equipment.
 *
 * Every function here is pure (input state → new state), matching
 * BattleEngine/RogueliteEngine/StageEngine's own style — nothing here holds
 * mutable engine-instance state, so a `createProgressionSystem(deps)` call
 * is just content/config binding, never a stateful session.
 *
 * MVP-7 decision doc boundary (explicit): StageEngine records only the bare
 * fact "this zone id was cleared" (StageResult.clearedZoneIds) and never
 * computes a reward amount; RogueliteEngine's RunState/RunBuild never carry
 * permanent-growth data. This module is the ONLY place a Stage attempt's
 * raw facts (StageEndContext) turn into a PermanentState change — via
 * `reconcileStageResult`, called exactly once, from Base's "拠点へ戻る"
 * click handler (never a React effect).
 */

// ---------------------------------------------------------------------------
// Level / EXP — exported standalone for direct unit testing (mirrors
// RogueliteEngine.ts's weightedPick/rollRarity pattern).
// ---------------------------------------------------------------------------

/** Cost, in EXP, to go from `level` to `level + 1` (MVP-7 decision doc §1: round(20 * level^1.35 + 10)). */
export function expRequiredForLevel(level: number, config: ExpCurveConfig): number {
  return Math.round(config.coefficient * level ** config.exponent + config.constant);
}

/**
 * Derives a level purely from cumulative lifetime EXP (decision doc §1:
 * "EXPは...累積EXPとして保持して構いませんが、計算方式を一貫させてください").
 * Recomputing from scratch every time — rather than incrementally mutating a
 * stored level — is what makes this the single consistent source of truth;
 * `PermanentCharacterState.level` is always exactly this function's result
 * for its own `exp`, never drifted from it. Lv1 at exp 0; no level cap
 * (decision doc §1).
 */
export function computeLevelFromTotalExp(totalExp: number, config: ExpCurveConfig): number {
  let level = 1;
  let remaining = totalExp;
  while (remaining >= expRequiredForLevel(level, config)) {
    remaining -= expRequiredForLevel(level, config);
    level++;
  }
  return level;
}

export interface ExpApplicationResult {
  next: PermanentCharacterState;
  levelBefore: number;
  levelAfter: number;
}

/** Adds `expGained` to a character's cumulative EXP and re-derives level (may jump multiple levels in one call — decision doc §1 explicitly allows this). */
export function applyExpAndLevelUp(
  characterState: PermanentCharacterState,
  expGained: number,
  config: ExpCurveConfig,
): ExpApplicationResult {
  const levelBefore = characterState.level;
  const nextExp = characterState.exp + expGained;
  const levelAfter = computeLevelFromTotalExp(nextExp, config);
  return { next: { ...characterState, exp: nextExp, level: levelAfter }, levelBefore, levelAfter };
}

/** Lv1 has 0 growth; each level from Lv2 onward adds one profile's worth of flat per-stat gain (decision doc §2). */
export function computeLevelGrowthStats(level: number, growthProfile: GrowthProfile): Record<GrowableStatKey, number> {
  const steps = Math.max(0, level - 1);
  return {
    hp: steps * growthProfile.hp,
    attack: steps * growthProfile.attack,
    defense: steps * growthProfile.defense,
    speed: steps * growthProfile.speed,
  };
}

/** One equipped instance's own stat contribution at its current enhancement level — exported so display code (e.g. the Equipment screen) can show "ステータス補正" per item without duplicating this arithmetic (CLAUDE.md §9: UI renders results, never recomputes them). */
export function computeSingleEquipmentStatBonus(
  instance: EquipmentInstance,
  def: EquipmentDefinition,
): Record<GrowableStatKey, number> {
  const total: Record<GrowableStatKey, number> = { hp: 0, attack: 0, defense: 0, speed: 0 };
  for (const key of ['hp', 'attack', 'defense', 'speed'] as const) {
    total[key] = (def.baseStatBonus[key] ?? 0) + (def.enhancementBonusPerLevel[key] ?? 0) * instance.enhancementLevel;
  }
  return total;
}

/** Sums the three equipped slots' baseStatBonus + enhancementBonusPerLevel*enhancementLevel. Missing/unequipped slots contribute 0. */
export function computeEquipmentBonus(
  equipped: PermanentCharacterState['equipped'],
  equipmentInstances: readonly EquipmentInstance[],
  equipmentDefsById: Record<string, EquipmentDefinition>,
): Record<GrowableStatKey, number> {
  const total: Record<GrowableStatKey, number> = { hp: 0, attack: 0, defense: 0, speed: 0 };
  const instanceIds = [equipped.weaponInstanceId, equipped.armorInstanceId, equipped.accessoryInstanceId];

  for (const instanceId of instanceIds) {
    if (!instanceId) continue;
    const instance = equipmentInstances.find((i) => i.instanceId === instanceId);
    if (!instance) continue;
    const def = equipmentDefsById[instance.definitionId];
    if (!def) continue;
    const single = computeSingleEquipmentStatBonus(instance, def);
    for (const key of ['hp', 'attack', 'defense', 'speed'] as const) {
      total[key] += single[key];
    }
  }
  return total;
}

/** Minimal weighted-random pick, local to this module by design (decision doc: ProgressionSystem must not depend on the roguelite module). */
function weightedPick<T>(items: readonly T[], weights: readonly number[], random: RandomService): T {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return random.pick(items);
  let roll = random.uniform(0, total);
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

export interface EnhancementCostPreview {
  nextLevel: number;
  maxLevel: number;
  currencyCost: number;
  materialCost: number;
}

/** Read-only preview of what the NEXT enhancement level would cost, or null if already at the rarity's cap — lets the Equipment screen show cost before the player commits, without duplicating enhanceEquipment's own arithmetic. */
export function previewEnhancementCost(
  instance: EquipmentInstance,
  def: EquipmentDefinition,
  config: ProgressionConfig,
): EnhancementCostPreview | null {
  const nextLevel = instance.enhancementLevel + 1;
  const maxLevel = config.equipmentEnhancement.maxEnhancementLevelByRarity[def.rarity];
  if (nextLevel > maxLevel) return null;
  return {
    nextLevel,
    maxLevel,
    currencyCost: config.equipmentEnhancement.currencyCostBaseByRarity[def.rarity] * nextLevel,
    materialCost: Math.ceil(nextLevel / 3) * config.equipmentEnhancement.materialCostRarityMultiplier[def.rarity],
  };
}

export function isEquippedByAnyCharacter(permanentState: PermanentState, instanceId: string): boolean {
  return Object.values(permanentState.characters).some(
    (c) => c.equipped.weaponInstanceId === instanceId || c.equipped.armorInstanceId === instanceId || c.equipped.accessoryInstanceId === instanceId,
  );
}

export function createEmptyPermanentCharacterState(characterId: string): PermanentCharacterState {
  return {
    characterId,
    exp: 0,
    level: 1,
    equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: null },
  };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export interface ProgressionDeps {
  config: ProgressionConfig;
  /** Content-data mapping, not hardcoded here (CLAUDE.md §7 data-driven) — see sample data for MVP-7's actual assignment. */
  growthProfileByCharacterId: Record<string, GrowthProfileId>;
  equipmentDefsById: Record<string, EquipmentDefinition>;
  equipmentDropTablesById: Record<string, EquipmentDropTable>;
  characterUnlockRules: CharacterUnlockRule[];
  stageUnlockRules: StageUnlockRule[];
  /**
   * Generates a fresh EquipmentInstance id, deliberately injected and kept
   * separate from any RandomService (decision doc §11: "instanceId生成は
   * ゲーム乱数から分離してください") — tests pass a deterministic factory,
   * production uses `crypto.randomUUID()`.
   */
  instanceIdFactory: () => string;
}

export type EquipActionFailureReason =
  | 'EQUIPMENT_NOT_FOUND'
  | 'CHARACTER_NOT_FOUND'
  | 'ALREADY_EQUIPPED_ELSEWHERE';

export type EnhanceFailureReason = 'EQUIPMENT_NOT_FOUND' | 'MAX_LEVEL_REACHED' | 'INSUFFICIENT_CURRENCY' | 'INSUFFICIENT_MATERIAL';

export type DismantleFailureReason = 'EQUIPMENT_NOT_FOUND' | 'LOCKED' | 'EQUIPPED';

export interface ProgressionActionResult {
  permanentState: PermanentState;
  success: boolean;
  reason?: EquipActionFailureReason | EnhanceFailureReason | DismantleFailureReason;
}

export interface DismantleResult extends ProgressionActionResult {
  materialsReturned: number;
}

export interface ProgressionSystem {
  /**
   * Base Stats + Permanent Level Growth + Equipment bonuses, resolved into a
   * plain CharacterDefinition (decision doc §18: order is Base → Permanent
   * Level Growth → Equipment → Stage開始 → RunBuild temporary bonuses →
   * Battle). BattleEngine/StageEngine/RogueliteEngine never see this
   * function or PermanentState at all — the caller (Base layer, building
   * StageLaunchConfig.party) applies it once per departure, before
   * RogueliteEngine's own RunBuild layer takes over.
   */
  resolveCharacterForBattle(characterDef: CharacterDefinition, permanentState: PermanentState): CharacterDefinition;
  /** Applies one Stage attempt's raw facts to PermanentState. Pure and deterministic for a given `context.runSeed` (equipment-drop RNG is fully independent of Battle/Roguelite RNG). Called exactly once, from an event handler (never a React effect) — see StageEndContext's own doc. */
  reconcileStageResult(permanentState: PermanentState, context: StageEndContext): { permanentState: PermanentState; summary: StageRewardSummary };
  equipItem(permanentState: PermanentState, characterId: string, instanceId: string): ProgressionActionResult;
  unequipSlot(permanentState: PermanentState, characterId: string, slot: EquipmentSlot): PermanentState;
  enhanceEquipment(permanentState: PermanentState, instanceId: string): ProgressionActionResult;
  /** All-or-nothing (decision doc §10: "すべて検証してからatomicに処理"). */
  dismantleEquipment(permanentState: PermanentState, instanceIds: string[]): DismantleResult;
}

export function createProgressionSystem(deps: ProgressionDeps): ProgressionSystem {
  function resolveCharacterForBattle(characterDef: CharacterDefinition, permanentState: PermanentState): CharacterDefinition {
    const characterState = permanentState.characters[characterDef.id];
    if (!characterState) return characterDef; // not yet tracked — behaves exactly like pre-MVP-7 (byte-identical baseStats)

    const growthProfileId = deps.growthProfileByCharacterId[characterDef.id];
    const growthProfile = growthProfileId ? deps.config.growthProfiles[growthProfileId] : undefined;
    const growth = growthProfile
      ? computeLevelGrowthStats(characterState.level, growthProfile)
      : { hp: 0, attack: 0, defense: 0, speed: 0 };
    const equipmentBonus = computeEquipmentBonus(characterState.equipped, permanentState.inventory.equipment, deps.equipmentDefsById);

    return {
      ...characterDef,
      baseStats: {
        ...characterDef.baseStats,
        maxHp: characterDef.baseStats.maxHp + growth.hp + equipmentBonus.hp,
        attack: characterDef.baseStats.attack + growth.attack + equipmentBonus.attack,
        defense: characterDef.baseStats.defense + growth.defense + equipmentBonus.defense,
        speed: characterDef.baseStats.speed + growth.speed + equipmentBonus.speed,
        // maxMp is deliberately untouched — MP max never grows (spec §10.1/decision doc §1/§2).
      },
    };
  }

  function reconcileStageResult(
    permanentState: PermanentState,
    context: StageEndContext,
  ): { permanentState: PermanentState; summary: StageRewardSummary } {
    const { stageResult, stage, partyCharacterIds, runSeed, consumedItemCounts } = context;
    const zonesById = new Map(stage.zones.map((z) => [z.id, z]));

    let nextCharacters = { ...permanentState.characters };
    const levelUps: StageRewardSummary['levelUps'] = [];
    let runCurrencyGained = 0;
    let runMaterialGained = 0;
    const equipmentDropped: StageRewardSummary['equipmentDropped'] = [];
    const newEquipmentInstances: EquipmentInstance[] = [];

    const zoneClearOccurrences = new Map<string, number>();
    for (const zoneId of stageResult.clearedZoneIds) {
      const zone = zonesById.get(zoneId);
      if (!zone) continue; // defensive: should never happen for this stage's own clearedZoneIds
      const profile = deps.config.zoneRewardProfiles[zone.permanentRewardProfileId];
      if (!profile) continue; // defensive: unknown profile id never blocks Stage completion (CLAUDE.md §19)

      for (const characterId of partyCharacterIds) {
        const charState = nextCharacters[characterId];
        if (!charState) continue; // non-deployed/untracked character never gains EXP (spec §10.1)
        const { next, levelBefore, levelAfter } = applyExpAndLevelUp(charState, profile.expPerCharacter, deps.config.expCurve);
        nextCharacters = { ...nextCharacters, [characterId]: next };
        levelUps.push({ characterId, expGained: profile.expPerCharacter, levelBefore, levelAfter });
      }

      runCurrencyGained += profile.currency;
      runMaterialGained += profile.material;

      // Equipment-drop RNG is fully independent of Battle/Roguelite RNG
      // (decision doc §11) — derived straight from runSeed + zoneId, never
      // touching the battle/reward RandomService instances.
      const priorOccurrenceCount = zoneClearOccurrences.get(zoneId) ?? 0;
      zoneClearOccurrences.set(zoneId, priorOccurrenceCount + 1);
      const permanentDropSeedKey =
        priorOccurrenceCount === 0 ? zoneId : zoneId + ':repeat:' + (priorOccurrenceCount + 1);
      const dropRandom = createRandomService(deriveSeed(runSeed, permanentDropSeedKey, 'permanent-drop'));
      if (dropRandom.chance(profile.equipmentDropChance)) {
        const table = deps.equipmentDropTablesById[profile.equipmentDropTableId];
        if (table && table.entries.length > 0) {
          const definitionId = weightedPick(
            table.entries.map((e) => e.equipmentDefinitionId),
            table.entries.map((e) => e.weight),
            dropRandom,
          );
          const instanceId = deps.instanceIdFactory();
          newEquipmentInstances.push({ instanceId, definitionId, enhancementLevel: 0, locked: false });
          equipmentDropped.push({ instanceId, equipmentDefinitionId: definitionId, zoneId });
        }
      }
    }

    // Completing at least one full 10-zone lap permanently counts as clearing
    // the Stage even when the player later self-returns or is defeated in a
    // stronger lap. The visible outcome still reports how this run ended.
    const isCleared = stageResult.outcome === 'CLEARED' || (stageResult.completedLaps ?? 0) > 0;
    const isDefeated = stageResult.outcome === 'DEFEATED';

    let finalCurrencyGained = runCurrencyGained;
    let finalMaterialGained = runMaterialGained;
    if (isCleared) {
      finalCurrencyGained += deps.config.stageClearBonus.currency;
      finalMaterialGained += deps.config.stageClearBonus.material;
    }

    // Defeat loss applies ONLY to this attempt's run-earned currency/material
    // (decision doc §5) — EXP, equipment drops, rareUnlockResource and every
    // pre-existing PermanentState asset are always 100% kept.
    let currencyLostToDefeat = 0;
    let materialLostToDefeat = 0;
    if (isDefeated) {
      currencyLostToDefeat = Math.floor(finalCurrencyGained * deps.config.defeatLoss.defeatResourceLossRate);
      materialLostToDefeat = Math.floor(finalMaterialGained * deps.config.defeatLoss.defeatResourceLossRate);
      finalCurrencyGained -= currencyLostToDefeat;
      finalMaterialGained -= materialLostToDefeat;
    }

    let rareUnlockResourceGained = 0;
    let isFirstClear = false;
    let clearedStageIds = permanentState.clearedStageIds;
    let unlockedStageIds = permanentState.unlockedStageIds;
    let unlockedCharacterIds = permanentState.unlockedCharacterIds;
    const newlyUnlockedStageIds: string[] = [];
    const newlyUnlockedCharacterIds: string[] = [];

    if (isCleared && !permanentState.clearedStageIds.includes(stageResult.stageId)) {
      isFirstClear = true;
      rareUnlockResourceGained = deps.config.firstClearBonus.rareUnlockResource;
      clearedStageIds = [...permanentState.clearedStageIds, stageResult.stageId];

      for (const rule of deps.stageUnlockRules) {
        if (rule.type !== 'STAGE_FIRST_CLEAR' || rule.stageId !== stageResult.stageId) continue;
        for (const sid of rule.unlocksStageIds) {
          if (!unlockedStageIds.includes(sid) && !newlyUnlockedStageIds.includes(sid)) newlyUnlockedStageIds.push(sid);
        }
      }
      if (newlyUnlockedStageIds.length > 0) unlockedStageIds = [...unlockedStageIds, ...newlyUnlockedStageIds];

      for (const rule of deps.characterUnlockRules) {
        if (rule.type !== 'STAGE_FIRST_CLEAR' || rule.stageId !== stageResult.stageId) continue;
        if (!unlockedCharacterIds.includes(rule.characterId) && !newlyUnlockedCharacterIds.includes(rule.characterId)) {
          newlyUnlockedCharacterIds.push(rule.characterId);
        }
      }
      if (newlyUnlockedCharacterIds.length > 0) unlockedCharacterIds = [...unlockedCharacterIds, ...newlyUnlockedCharacterIds];
    }

    const nextConsumables = { ...permanentState.inventory.consumables };
    for (const [itemId, count] of Object.entries(consumedItemCounts)) {
      const owned = nextConsumables[itemId] ?? 0;
      nextConsumables[itemId] = Math.max(0, owned - count);
    }

    const nextPermanentState: PermanentState = {
      ...permanentState,
      characters: nextCharacters,
      unlockedCharacterIds,
      unlockedStageIds,
      clearedStageIds,
      currency: permanentState.currency + finalCurrencyGained,
      materials: {
        ...permanentState.materials,
        [UPGRADE_MATERIAL_ID]: (permanentState.materials[UPGRADE_MATERIAL_ID] ?? 0) + finalMaterialGained,
      },
      rareUnlockResource: permanentState.rareUnlockResource + rareUnlockResourceGained,
      inventory: {
        equipment: [...permanentState.inventory.equipment, ...newEquipmentInstances],
        consumables: nextConsumables,
      },
    };

    const summary: StageRewardSummary = {
      levelUps,
      currencyGained: finalCurrencyGained,
      currencyLostToDefeat,
      materialGained: finalMaterialGained,
      materialLostToDefeat,
      rareUnlockResourceGained,
      equipmentDropped,
      isFirstClear,
      unlockedCharacterIds: newlyUnlockedCharacterIds,
      unlockedStageIds: newlyUnlockedStageIds,
    };

    return { permanentState: nextPermanentState, summary };
  }

  function equipItem(permanentState: PermanentState, characterId: string, instanceId: string): ProgressionActionResult {
    const characterState = permanentState.characters[characterId];
    if (!characterState) return { permanentState, success: false, reason: 'CHARACTER_NOT_FOUND' };

    const instance = permanentState.inventory.equipment.find((i) => i.instanceId === instanceId);
    if (!instance) return { permanentState, success: false, reason: 'EQUIPMENT_NOT_FOUND' };
    const def = deps.equipmentDefsById[instance.definitionId];
    if (!def) return { permanentState, success: false, reason: 'EQUIPMENT_NOT_FOUND' };

    // Single source of truth for "who has this equipped" (decision doc:
    // EquipmentInstance itself never carries equippedByCharacterId) — a
    // duplicate-equip attempt is rejected outright rather than silently
    // stolen from whoever holds it.
    if (isEquippedByAnyCharacter(permanentState, instanceId)) {
      return { permanentState, success: false, reason: 'ALREADY_EQUIPPED_ELSEWHERE' };
    }

    const slotKey: keyof PermanentCharacterState['equipped'] =
      def.slot === 'weapon' ? 'weaponInstanceId' : def.slot === 'armor' ? 'armorInstanceId' : 'accessoryInstanceId';

    const nextCharacterState: PermanentCharacterState = {
      ...characterState,
      equipped: { ...characterState.equipped, [slotKey]: instanceId },
    };

    return {
      permanentState: { ...permanentState, characters: { ...permanentState.characters, [characterId]: nextCharacterState } },
      success: true,
    };
  }

  function unequipSlot(permanentState: PermanentState, characterId: string, slot: EquipmentSlot): PermanentState {
    const characterState = permanentState.characters[characterId];
    if (!characterState) return permanentState;

    const slotKey: keyof PermanentCharacterState['equipped'] =
      slot === 'weapon' ? 'weaponInstanceId' : slot === 'armor' ? 'armorInstanceId' : 'accessoryInstanceId';
    if (characterState.equipped[slotKey] === null) return permanentState; // already empty — no-op (CLAUDE.md §13)

    const nextCharacterState: PermanentCharacterState = { ...characterState, equipped: { ...characterState.equipped, [slotKey]: null } };
    return { ...permanentState, characters: { ...permanentState.characters, [characterId]: nextCharacterState } };
  }

  function enhanceEquipment(permanentState: PermanentState, instanceId: string): ProgressionActionResult {
    const instance = permanentState.inventory.equipment.find((i) => i.instanceId === instanceId);
    if (!instance) return { permanentState, success: false, reason: 'EQUIPMENT_NOT_FOUND' };
    const def = deps.equipmentDefsById[instance.definitionId];
    if (!def) return { permanentState, success: false, reason: 'EQUIPMENT_NOT_FOUND' };

    const preview = previewEnhancementCost(instance, def, deps.config);
    if (!preview) return { permanentState, success: false, reason: 'MAX_LEVEL_REACHED' };

    if (permanentState.currency < preview.currencyCost) return { permanentState, success: false, reason: 'INSUFFICIENT_CURRENCY' };
    const owned = permanentState.materials[UPGRADE_MATERIAL_ID] ?? 0;
    if (owned < preview.materialCost) return { permanentState, success: false, reason: 'INSUFFICIENT_MATERIAL' };

    const nextEquipment = permanentState.inventory.equipment.map((i) =>
      i.instanceId === instanceId ? { ...i, enhancementLevel: preview.nextLevel } : i,
    );

    return {
      permanentState: {
        ...permanentState,
        currency: permanentState.currency - preview.currencyCost,
        materials: { ...permanentState.materials, [UPGRADE_MATERIAL_ID]: owned - preview.materialCost },
        inventory: { ...permanentState.inventory, equipment: nextEquipment },
      },
      success: true,
    };
  }

  function dismantleEquipment(permanentState: PermanentState, instanceIds: string[]): DismantleResult {
    // Validate every instance first — all-or-nothing (decision doc §10).
    for (const instanceId of instanceIds) {
      const instance = permanentState.inventory.equipment.find((i) => i.instanceId === instanceId);
      if (!instance) return { permanentState, success: false, reason: 'EQUIPMENT_NOT_FOUND', materialsReturned: 0 };
      if (instance.locked) return { permanentState, success: false, reason: 'LOCKED', materialsReturned: 0 };
      if (isEquippedByAnyCharacter(permanentState, instanceId)) {
        return { permanentState, success: false, reason: 'EQUIPPED', materialsReturned: 0 };
      }
    }

    let materialsReturned = 0;
    for (const instanceId of instanceIds) {
      const instance = permanentState.inventory.equipment.find((i) => i.instanceId === instanceId)!;
      const def = deps.equipmentDefsById[instance.definitionId];
      const base = def ? deps.config.equipmentDismantle.baseReturnByRarity[def.rarity] : 0;
      materialsReturned += base + Math.floor(instance.enhancementLevel / 2);
    }

    const instanceIdSet = new Set(instanceIds);
    const nextEquipment = permanentState.inventory.equipment.filter((i) => !instanceIdSet.has(i.instanceId));
    const owned = permanentState.materials[UPGRADE_MATERIAL_ID] ?? 0;

    return {
      permanentState: {
        ...permanentState,
        materials: { ...permanentState.materials, [UPGRADE_MATERIAL_ID]: owned + materialsReturned },
        inventory: { ...permanentState.inventory, equipment: nextEquipment },
      },
      success: true,
      materialsReturned,
    };
  }

  return {
    resolveCharacterForBattle,
    reconcileStageResult,
    equipItem,
    unequipSlot,
    enhanceEquipment,
    dismantleEquipment,
  };
}
