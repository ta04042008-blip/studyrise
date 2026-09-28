import { describe, expect, it } from 'vitest';
import { progressionConfig, UPGRADE_MATERIAL_ID } from '../../../src/config/progressionConfig';
import {
  makeEquipmentInstance,
  makeTestPermanentState,
  makeTestProgressionSystem,
  testAccessoryRare,
  testArmorNormal,
  testCharacterA,
  testCharacterB,
  testWeaponLegendary,
  testWeaponNormal,
} from './fixtures';

describe('equipItem / unequipSlot', () => {
  it('equips into the slot matching the definition — weapon/armor/accessory each land in their own slot, never mismatched (decision doc: slot correctness)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const armor = makeEquipmentInstance({ instanceId: 'a1', definitionId: testArmorNormal.id });
    const accessory = makeEquipmentInstance({ instanceId: 'r1', definitionId: testAccessoryRare.id });
    let permanentState = makeTestPermanentState({ inventory: { equipment: [weapon, armor, accessory], consumables: {} } });

    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w1').permanentState;
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'a1').permanentState;
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'r1').permanentState;

    expect(permanentState.characters[testCharacterA.id].equipped).toEqual({
      weaponInstanceId: 'w1',
      armorInstanceId: 'a1',
      accessoryInstanceId: 'r1',
    });
  });

  it('rejects equipping the same instance onto a second character (同一instance二重装備不可)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    let permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w1').permanentState;

    const result = progressionSystem.equipItem(permanentState, testCharacterB.id, 'w1');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('ALREADY_EQUIPPED_ELSEWHERE');
    expect(result.permanentState.characters[testCharacterB.id].equipped.weaponInstanceId).toBeNull();
  });

  it('equipping a new weapon into an already-filled slot replaces the previous one (freeing it)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weaponA = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const weaponB = makeEquipmentInstance({ instanceId: 'w2', definitionId: testWeaponLegendary.id });
    let permanentState = makeTestPermanentState({ inventory: { equipment: [weaponA, weaponB], consumables: {} } });
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w1').permanentState;
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w2').permanentState;

    expect(permanentState.characters[testCharacterA.id].equipped.weaponInstanceId).toBe('w2');
    // w1 is now unequipped (nobody references it) and equippable elsewhere again.
    const reEquipResult = progressionSystem.equipItem(permanentState, testCharacterB.id, 'w1');
    expect(reEquipResult.success).toBe(true);
  });

  it('unequipSlot clears the slot and is a no-op if already empty', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    let permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w1').permanentState;
    permanentState = progressionSystem.unequipSlot(permanentState, testCharacterA.id, 'weapon');
    expect(permanentState.characters[testCharacterA.id].equipped.weaponInstanceId).toBeNull();

    const again = progressionSystem.unequipSlot(permanentState, testCharacterA.id, 'weapon');
    expect(again).toBe(permanentState); // idempotent no-op
  });

  it('rejects equipping an unknown instance id', () => {
    const progressionSystem = makeTestProgressionSystem();
    const permanentState = makeTestPermanentState();
    const result = progressionSystem.equipItem(permanentState, testCharacterA.id, 'no_such_instance');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('EQUIPMENT_NOT_FOUND');
  });
});

describe('enhanceEquipment (decision doc §9)', () => {
  it('NORMAL rarity: level 1 costs currency 20 × 1, material ceil(1/3) × 1', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({
      currency: 100,
      materials: { [UPGRADE_MATERIAL_ID]: 10 },
      inventory: { equipment: [weapon], consumables: {} },
    });
    const result = progressionSystem.enhanceEquipment(permanentState, 'w1');
    expect(result.success).toBe(true);
    expect(result.permanentState.currency).toBe(100 - 20);
    expect(result.permanentState.materials[UPGRADE_MATERIAL_ID]).toBe(10 - 1);
    expect(result.permanentState.inventory.equipment[0].enhancementLevel).toBe(1);
  });

  it('RARE rarity: level 1 costs currency 50 × 1, material ceil(1/3) × 2', () => {
    const progressionSystem = makeTestProgressionSystem();
    const accessory = makeEquipmentInstance({ instanceId: 'r1', definitionId: testAccessoryRare.id });
    const permanentState = makeTestPermanentState({
      currency: 100,
      materials: { [UPGRADE_MATERIAL_ID]: 10 },
      inventory: { equipment: [accessory], consumables: {} },
    });
    const result = progressionSystem.enhanceEquipment(permanentState, 'r1');
    expect(result.success).toBe(true);
    expect(result.permanentState.currency).toBe(100 - 50);
    expect(result.permanentState.materials[UPGRADE_MATERIAL_ID]).toBe(10 - 2);
  });

  it('rejects when currency is insufficient, spending nothing', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({
      currency: 5,
      materials: { [UPGRADE_MATERIAL_ID]: 10 },
      inventory: { equipment: [weapon], consumables: {} },
    });
    const result = progressionSystem.enhanceEquipment(permanentState, 'w1');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_CURRENCY');
    expect(result.permanentState).toBe(permanentState);
  });

  it('rejects when material is insufficient, spending nothing', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const permanentState = makeTestPermanentState({
      currency: 1000,
      materials: { [UPGRADE_MATERIAL_ID]: 0 },
      inventory: { equipment: [weapon], consumables: {} },
    });
    const result = progressionSystem.enhanceEquipment(permanentState, 'w1');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('INSUFFICIENT_MATERIAL');
  });

  it('rejects once the rarity cap is reached (NORMAL max +5)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, enhancementLevel: 5 });
    const permanentState = makeTestPermanentState({
      currency: 100000,
      materials: { [UPGRADE_MATERIAL_ID]: 100000 },
      inventory: { equipment: [weapon], consumables: {} },
    });
    const result = progressionSystem.enhanceEquipment(permanentState, 'w1');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('MAX_LEVEL_REACHED');
  });

  it('per-rarity max enhancement levels match decision doc §8 (+5/+7/+10/+12/+15)', () => {
    expect(progressionConfig.equipmentEnhancement.maxEnhancementLevelByRarity).toEqual({
      NORMAL: 5,
      UNCOMMON: 7,
      RARE: 10,
      EPIC: 12,
      LEGENDARY: 15,
    });
  });
});

describe('dismantleEquipment (decision doc §10)', () => {
  it('returns baseReturn(rarity) + floor(enhancementLevel/2), never currency', () => {
    const progressionSystem = makeTestProgressionSystem();
    // RARE +6 → 4 + floor(6/2) = 4 + 3 = 7 (decision doc's own worked example).
    const accessory = makeEquipmentInstance({ instanceId: 'r1', definitionId: testAccessoryRare.id, enhancementLevel: 6 });
    const permanentState = makeTestPermanentState({
      currency: 50,
      materials: { [UPGRADE_MATERIAL_ID]: 0 },
      inventory: { equipment: [accessory], consumables: {} },
    });
    const result = progressionSystem.dismantleEquipment(permanentState, ['r1']);
    expect(result.success).toBe(true);
    expect(result.materialsReturned).toBe(7);
    expect(result.permanentState.materials[UPGRADE_MATERIAL_ID]).toBe(7);
    expect(result.permanentState.currency).toBe(50); // untouched — decision doc: "通貨は得ません"
    expect(result.permanentState.inventory.equipment).toHaveLength(0);
  });

  it('rejects a locked instance and dismantles nothing', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, locked: true });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    const result = progressionSystem.dismantleEquipment(permanentState, ['w1']);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('LOCKED');
    expect(result.permanentState.inventory.equipment).toHaveLength(1);
  });

  it('rejects an equipped instance and dismantles nothing (never auto-unequips)', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    let permanentState = makeTestPermanentState({ inventory: { equipment: [weapon], consumables: {} } });
    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w1').permanentState;

    const result = progressionSystem.dismantleEquipment(permanentState, ['w1']);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('EQUIPPED');
    expect(result.permanentState.inventory.equipment).toHaveLength(1);
    expect(result.permanentState.characters[testCharacterA.id].equipped.weaponInstanceId).toBe('w1');
  });

  it('bulk dismantle is atomic: one invalid instance in the batch blocks the entire batch', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const lockedArmor = makeEquipmentInstance({ instanceId: 'a1', definitionId: testArmorNormal.id, locked: true });
    const permanentState = makeTestPermanentState({ inventory: { equipment: [weapon, lockedArmor], consumables: {} } });

    const result = progressionSystem.dismantleEquipment(permanentState, ['w1', 'a1']);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('LOCKED');
    // Neither instance was removed — atomic all-or-nothing.
    expect(result.permanentState.inventory.equipment).toHaveLength(2);
  });

  it('bulk dismantle sums material return across the whole valid batch', () => {
    const progressionSystem = makeTestProgressionSystem();
    const weapon = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id, enhancementLevel: 0 }); // NORMAL base 1
    const armor = makeEquipmentInstance({ instanceId: 'a1', definitionId: testArmorNormal.id, enhancementLevel: 0 }); // NORMAL base 1
    const permanentState = makeTestPermanentState({
      materials: { [UPGRADE_MATERIAL_ID]: 0 },
      inventory: { equipment: [weapon, armor], consumables: {} },
    });
    const result = progressionSystem.dismantleEquipment(permanentState, ['w1', 'a1']);
    expect(result.success).toBe(true);
    expect(result.materialsReturned).toBe(2);
    expect(result.permanentState.inventory.equipment).toHaveLength(0);
  });
});

describe('allows holding multiple copies of the same EquipmentDefinition, distinguished by instanceId', () => {
  it('two instances of the same definition are independently equippable/enhanceable', () => {
    const progressionSystem = makeTestProgressionSystem();
    const copy1 = makeEquipmentInstance({ instanceId: 'w1', definitionId: testWeaponNormal.id });
    const copy2 = makeEquipmentInstance({ instanceId: 'w2', definitionId: testWeaponNormal.id });
    let permanentState = makeTestPermanentState({
      currency: 1000,
      materials: { [UPGRADE_MATERIAL_ID]: 1000 },
      inventory: { equipment: [copy1, copy2], consumables: {} },
    });

    permanentState = progressionSystem.equipItem(permanentState, testCharacterA.id, 'w1').permanentState;
    permanentState = progressionSystem.equipItem(permanentState, testCharacterB.id, 'w2').permanentState;
    expect(permanentState.characters[testCharacterA.id].equipped.weaponInstanceId).toBe('w1');
    expect(permanentState.characters[testCharacterB.id].equipped.weaponInstanceId).toBe('w2');

    permanentState = progressionSystem.enhanceEquipment(permanentState, 'w1').permanentState;
    const instances = permanentState.inventory.equipment;
    expect(instances.find((i) => i.instanceId === 'w1')!.enhancementLevel).toBe(1);
    expect(instances.find((i) => i.instanceId === 'w2')!.enhancementLevel).toBe(0); // untouched
  });
});
