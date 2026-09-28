import type { CharacterDefinition } from '../../../src/engine/battle/BattleEngine.types';
import { progressionConfig } from '../../../src/config/progressionConfig';
import {
  createProgressionSystem,
  createEmptyPermanentCharacterState,
  type ProgressionDeps,
  type ProgressionSystem,
} from '../../../src/engine/progression/ProgressionSystem';
import type {
  CharacterUnlockRule,
  EquipmentDefinition,
  EquipmentDropTable,
  EquipmentInstance,
  GrowthProfileId,
  PermanentState,
  StageUnlockRule,
} from '../../../src/engine/progression/ProgressionSystem.types';

export const testCharacterA: CharacterDefinition = {
  id: 'char_test_a',
  name: 'テストキャラA',
  baseStats: { attack: 20, defense: 5, speed: 10, maxHp: 100, maxMp: 5 },
  initialSpellId: 'spell_dummy',
  additionalSpellPoolIds: [],
};

export const testCharacterB: CharacterDefinition = {
  id: 'char_test_b',
  name: 'テストキャラB',
  baseStats: { attack: 15, defense: 8, speed: 12, maxHp: 90, maxMp: 5 },
  initialSpellId: 'spell_dummy',
  additionalSpellPoolIds: [],
};

export const testWeaponNormal: EquipmentDefinition = {
  id: 'test_equip_weapon_normal',
  name: 'テスト用の剣',
  slot: 'weapon',
  rarity: 'NORMAL',
  baseStatBonus: { attack: 5 },
  enhancementBonusPerLevel: { attack: 2 },
};

export const testArmorNormal: EquipmentDefinition = {
  id: 'test_equip_armor_normal',
  name: 'テスト用の鎧',
  slot: 'armor',
  rarity: 'NORMAL',
  baseStatBonus: { defense: 4, hp: 5 },
  enhancementBonusPerLevel: { defense: 1 },
};

export const testAccessoryRare: EquipmentDefinition = {
  id: 'test_equip_accessory_rare',
  name: 'テスト用の指輪',
  slot: 'accessory',
  rarity: 'RARE',
  baseStatBonus: { speed: 6 },
  enhancementBonusPerLevel: { speed: 2 },
};

export const testWeaponLegendary: EquipmentDefinition = {
  id: 'test_equip_weapon_legendary',
  name: 'テスト用の伝説の剣',
  slot: 'weapon',
  rarity: 'LEGENDARY',
  baseStatBonus: { attack: 30 },
  enhancementBonusPerLevel: { attack: 5 },
};

export const testEquipmentDefsById: Record<string, EquipmentDefinition> = {
  [testWeaponNormal.id]: testWeaponNormal,
  [testArmorNormal.id]: testArmorNormal,
  [testAccessoryRare.id]: testAccessoryRare,
  [testWeaponLegendary.id]: testWeaponLegendary,
};

/** Single-entry drop table so a successful roll is always deterministic (no weighting ambiguity to control for). */
export const testDropTableSingle: EquipmentDropTable = {
  id: 'test_drop_table_single',
  entries: [{ equipmentDefinitionId: testWeaponNormal.id, weight: 1 }],
};

export const testDropTablesById: Record<string, EquipmentDropTable> = {
  [testDropTableSingle.id]: testDropTableSingle,
};

export const testGrowthProfileByCharacterId: Record<string, GrowthProfileId> = {
  [testCharacterA.id]: 'POWER',
  [testCharacterB.id]: 'GUARD',
};

export function makeEquipmentInstance(overrides: Partial<EquipmentInstance> & { instanceId: string; definitionId: string }): EquipmentInstance {
  return { enhancementLevel: 0, locked: false, ...overrides };
}

export function makeDeterministicInstanceIdFactory(prefix = 'test_instance'): () => string {
  let counter = 0;
  return () => `${prefix}_${++counter}`;
}

export function makeTestProgressionSystem(overrides: Partial<ProgressionDeps> = {}): ProgressionSystem {
  return createProgressionSystem({
    config: progressionConfig,
    growthProfileByCharacterId: testGrowthProfileByCharacterId,
    equipmentDefsById: testEquipmentDefsById,
    equipmentDropTablesById: testDropTablesById,
    characterUnlockRules: [] as CharacterUnlockRule[],
    stageUnlockRules: [] as StageUnlockRule[],
    instanceIdFactory: makeDeterministicInstanceIdFactory(),
    ...overrides,
  });
}

export function makeTestPermanentState(overrides: Partial<PermanentState> = {}): PermanentState {
  return {
    characters: {
      [testCharacterA.id]: createEmptyPermanentCharacterState(testCharacterA.id),
      [testCharacterB.id]: createEmptyPermanentCharacterState(testCharacterB.id),
    },
    unlockedCharacterIds: [testCharacterA.id, testCharacterB.id],
    unlockedStageIds: [],
    clearedStageIds: [],
    currency: 0,
    materials: {},
    rareUnlockResource: 0,
    inventory: { equipment: [], consumables: {} },
    ...overrides,
  };
}
