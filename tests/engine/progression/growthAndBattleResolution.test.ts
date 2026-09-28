import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { computeLevelGrowthStats, createEmptyPermanentCharacterState } from '../../../src/engine/progression/ProgressionSystem';
import {
  makeEquipmentInstance,
  makeTestPermanentState,
  makeTestProgressionSystem,
  testAccessoryRare,
  testArmorNormal,
  testCharacterA,
  testCharacterB,
  testWeaponNormal,
} from './fixtures';

describe('computeLevelGrowthStats (decision doc §2: POWER/GUARD/SPEED)', () => {
  it('Lv1 has zero growth for every profile', () => {
    for (const profile of Object.values(progressionConfig.growthProfiles)) {
      expect(computeLevelGrowthStats(1, profile)).toEqual({ hp: 0, attack: 0, defense: 0, speed: 0 });
    }
  });

  it('POWER: HP+4/学力+4/忍耐力+2/思考速度+2 per level from Lv2', () => {
    const growth = computeLevelGrowthStats(2, progressionConfig.growthProfiles.POWER);
    expect(growth).toEqual({ hp: 4, attack: 4, defense: 2, speed: 2 });
  });

  it('GUARD: HP+7/学力+2/忍耐力+4/思考速度+1 per level from Lv2', () => {
    const growth = computeLevelGrowthStats(2, progressionConfig.growthProfiles.GUARD);
    expect(growth).toEqual({ hp: 7, attack: 2, defense: 4, speed: 1 });
  });

  it('SPEED: HP+4/学力+3/忍耐力+2/思考速度+4 per level from Lv2', () => {
    const growth = computeLevelGrowthStats(2, progressionConfig.growthProfiles.SPEED);
    expect(growth).toEqual({ hp: 4, attack: 3, defense: 2, speed: 4 });
  });

  it('scales linearly with (level - 1) steps', () => {
    const growth = computeLevelGrowthStats(5, progressionConfig.growthProfiles.POWER); // 4 steps
    expect(growth).toEqual({ hp: 16, attack: 16, defense: 8, speed: 8 });
  });
});

describe('resolveCharacterForBattle — Base Stats + Permanent Level Growth + Equipment', () => {
  it('an untracked character (no PermanentState entry) is returned byte-identical to its raw definition', () => {
    const progressionSystem = makeTestProgressionSystem();
    const permanentState = makeTestPermanentState({ characters: {} });
    const resolved = progressionSystem.resolveCharacterForBattle(testCharacterA, permanentState);
    expect(resolved.baseStats).toEqual(testCharacterA.baseStats);
  });

  it('Lv1, no equipment: resolved baseStats exactly equal the existing Lv1 sample values (regression safety — growth/equipment never change Lv1 output)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const permanentState = makeTestPermanentState();
    const resolved = progressionSystem.resolveCharacterForBattle(testCharacterA, permanentState);
    expect(resolved.baseStats).toEqual(testCharacterA.baseStats);
  });

  it('MP max never grows with level', () => {
    const progressionSystem = makeTestProgressionSystem();
    const leveledState = makeTestPermanentState({
      characters: { [testCharacterA.id]: { ...createEmptyPermanentCharacterState(testCharacterA.id), level: 10, exp: 999999 } },
    });
    const resolved = progressionSystem.resolveCharacterForBattle(testCharacterA, leveledState);
    expect(resolved.baseStats.maxMp).toBe(testCharacterA.baseStats.maxMp);
  });

  it('applies level growth on top of Lv1 base stats (POWER profile, Lv3 = 2 growth steps)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const permanentState = makeTestPermanentState({
      characters: { [testCharacterA.id]: { ...createEmptyPermanentCharacterState(testCharacterA.id), level: 3, exp: 91 } },
    });
    const resolved = progressionSystem.resolveCharacterForBattle(testCharacterA, permanentState);
    // POWER: hp+4/atk+4/def+2/spd+2 per level × 2 steps = +8/+8/+4/+4
    expect(resolved.baseStats).toEqual({
      maxHp: testCharacterA.baseStats.maxHp + 8,
      attack: testCharacterA.baseStats.attack + 8,
      defense: testCharacterA.baseStats.defense + 4,
      speed: testCharacterA.baseStats.speed + 4,
      maxMp: testCharacterA.baseStats.maxMp,
    });
  });

  it('applies equipped-gear stat bonuses (base + enhancement level)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, enhancementLevel: 2 });
    const armor = makeEquipmentInstance({ instanceId: 'a1', definitionId: testArmorNormal.id, enhancementLevel: 1 });
    const permanentState = makeTestPermanentState({
      characters: {
        [testCharacterA.id]: {
          ...createEmptyPermanentCharacterState(testCharacterA.id),
          equipped: { weaponInstanceId: 'w1', armorInstanceId: 'a1', accessoryInstanceId: null },
        },
      },
      inventory: { equipment: [weapon, armor], consumables: {} },
    });
    const resolved = progressionSystem.resolveCharacterForBattle(testCharacterA, permanentState);
    // Weapon: base atk+5, +2/level × Lv2 = +4 → total atk bonus +9. Armor: def+4 base, hp+5 base, +1/level × Lv1 = +1 def.
    expect(resolved.baseStats).toEqual({
      maxHp: testCharacterA.baseStats.maxHp + 5,
      attack: testCharacterA.baseStats.attack + 9,
      defense: testCharacterA.baseStats.defense + 5,
      speed: testCharacterA.baseStats.speed,
      maxMp: testCharacterA.baseStats.maxMp,
    });
  });

  it('combines level growth AND equipment together (decision doc §18 order: Base → Level Growth → Equipment)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const accessory = makeEquipmentInstance({ instanceId: 'r1', definitionId: testAccessoryRare.id });
    const permanentState = makeTestPermanentState({
      characters: {
        [testCharacterB.id]: {
          ...createEmptyPermanentCharacterState(testCharacterB.id),
          level: 2,
          exp: 30,
          equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: 'r1' },
        },
      },
      inventory: { equipment: [accessory], consumables: {} },
    });
    const resolved = progressionSystem.resolveCharacterForBattle(testCharacterB, permanentState);
    // GUARD Lv2 (1 step): hp+7/atk+2/def+4/spd+1. Accessory: speed+6.
    expect(resolved.baseStats).toEqual({
      maxHp: testCharacterB.baseStats.maxHp + 7,
      attack: testCharacterB.baseStats.attack + 2,
      defense: testCharacterB.baseStats.defense + 4,
      speed: testCharacterB.baseStats.speed + 1 + 6,
      maxMp: testCharacterB.baseStats.maxMp,
    });
  });
});
