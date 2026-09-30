import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { createProgressionSystem } from '../../../src/engine/progression/ProgressionSystem';
import { sampleGrowthProfileByCharacterId } from '../../../src/data/progression/growthProfiles';
import { sampleEquipmentDefinitionsById } from '../../../src/data/equipment/sampleEquipment';
import { sampleEquipmentDropTablesById } from '../../../src/data/equipment/sampleDropTables';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import { stageHaruka02 } from '../../../src/data/stages/stageHaruka02';
import { enemyDefinitionsById } from '../../../src/data/enemies/enemyDefinitionsById';
import type { PermanentState } from '../../../src/engine/progression/ProgressionSystem.types';

function buildLv4Party() {
  const progressionSystem = createProgressionSystem({
    config: progressionConfig,
    growthProfileByCharacterId: sampleGrowthProfileByCharacterId,
    equipmentDefsById: sampleEquipmentDefinitionsById,
    equipmentDropTablesById: sampleEquipmentDropTablesById,
    characterUnlockRules: [],
    stageUnlockRules: [],
    instanceIdFactory: () => 'unused',
  });
  const permanentState: PermanentState = {
    characters: Object.fromEntries(
      sampleParty.map((c) => [
        c.id,
        { characterId: c.id, exp: 220, level: 4, equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: null } },
      ]),
    ),
    unlockedCharacterIds: sampleParty.map((c) => c.id),
    unlockedStageIds: [stageHaruka02.id],
    clearedStageIds: [],
    currency: 0,
    materials: {},
    rareUnlockResource: 0,
    inventory: { equipment: [], consumables: {} },
  };
  return sampleParty.map((c) => progressionSystem.resolveCharacterForBattle(c, permanentState));
}

describe('Stage2《沈黙した循環区》 ten-zone balance guard', () => {
  it('keeps 10 zones, one final boss, bounded formations, and a valid Lv4 departure party', () => {
    const party = buildLv4Party();
    expect(stageHaruka02.zones).toHaveLength(10);
    expect(stageHaruka02.zones.slice(0, 9).every((z) => !z.isFinalZone)).toBe(true);
    expect(stageHaruka02.zones[9].isFinalZone).toBe(true);
    expect(stageHaruka02.zones[9].enemies).toHaveLength(1);

    const finalDef = enemyDefinitionsById[stageHaruka02.zones[9].enemies[0].enemyDefinitionId];
    expect(finalDef.isBoss).toBe(true);
    expect(finalDef.name).toBe('保全核《NEREID》');

    for (const zone of stageHaruka02.zones) {
      expect(zone.enemies.length).toBeGreaterThanOrEqual(1);
      expect(zone.enemies.length).toBeLessThanOrEqual(3);
      for (const enemy of zone.enemies) {
        expect(enemyDefinitionsById[enemy.enemyDefinitionId]).toBeDefined();
      }
    }

    for (const character of party) {
      expect(character.baseStats.maxHp).toBeGreaterThan(0);
      expect(character.baseStats.attack).toBeGreaterThan(0);
      expect(character.baseStats.defense).toBeGreaterThan(0);
      expect(character.baseStats.speed).toBeGreaterThan(0);
    }
  });
});
