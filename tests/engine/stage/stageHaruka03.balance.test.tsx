import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { createProgressionSystem } from '../../../src/engine/progression/ProgressionSystem';
import { sampleGrowthProfileByCharacterId } from '../../../src/data/progression/growthProfiles';
import { sampleEquipmentDefinitionsById } from '../../../src/data/equipment/sampleEquipment';
import { sampleEquipmentDropTablesById } from '../../../src/data/equipment/sampleDropTables';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import { stageHaruka03 } from '../../../src/data/stages/stageHaruka03';
import { enemyDefinitionsById } from '../../../src/data/enemies/enemyDefinitionsById';
import type { PermanentState } from '../../../src/engine/progression/ProgressionSystem.types';

function buildLv5Party() {
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
        { characterId: c.id, exp: 440, level: 5, equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: null } },
      ]),
    ),
    unlockedCharacterIds: sampleParty.map((c) => c.id),
    unlockedStageIds: [stageHaruka03.id],
    clearedStageIds: [],
    currency: 0,
    materials: {},
    rareUnlockResource: 0,
    inventory: { equipment: [], consumables: {} },
  };
  return sampleParty.map((c) => progressionSystem.resolveCharacterForBattle(c, permanentState));
}

describe('Stage3《記録塔》 ten-zone balance guard', () => {
  it('keeps 10 zones, one final boss, bounded formations, and a valid Lv5 departure party', () => {
    const party = buildLv5Party();
    expect(stageHaruka03.zones).toHaveLength(10);
    expect(stageHaruka03.zones.slice(0, 9).every((z) => !z.isFinalZone)).toBe(true);
    expect(stageHaruka03.zones[9].isFinalZone).toBe(true);
    expect(stageHaruka03.zones[9].enemies).toHaveLength(1);

    const finalDef = enemyDefinitionsById[stageHaruka03.zones[9].enemies[0].enemyDefinitionId];
    expect(finalDef.isBoss).toBe(true);
    expect(finalDef.name).toBe('記録管理体《MNEMOS》');

    for (const zone of stageHaruka03.zones) {
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
