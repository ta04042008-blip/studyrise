import type { EquipmentDropTable } from '../../engine/progression/ProgressionSystem.types';
import {
  sampleAccessoryEpic,
  sampleAccessoryNormal,
  sampleArmorNormal,
  sampleArmorUncommon,
  sampleWeaponNormal,
  sampleWeaponRare,
} from './sampleEquipment';

/**
 * PLACEHOLDER content — referenced by `ZoneDefinition.permanentRewardProfileId`
 * → `progressionConfig.zoneRewardProfiles[...].equipmentDropTableId` (spec
 * §10/§11, MVP-7 decision doc §11). Weights are not spec'd numbers; kept
 * simple (common items far more likely than the rare ones) until a real
 * balance pass. Not final game content (CLAUDE.md §24).
 */
export const dropTableNormal: EquipmentDropTable = {
  id: 'drop_table_normal',
  entries: [
    { equipmentDefinitionId: sampleWeaponNormal.id, weight: 5 },
    { equipmentDefinitionId: sampleArmorNormal.id, weight: 5 },
    { equipmentDefinitionId: sampleAccessoryNormal.id, weight: 5 },
    { equipmentDefinitionId: sampleArmorUncommon.id, weight: 1 },
  ],
};

export const dropTableBoss: EquipmentDropTable = {
  id: 'drop_table_boss',
  entries: [
    { equipmentDefinitionId: sampleArmorUncommon.id, weight: 4 },
    { equipmentDefinitionId: sampleWeaponRare.id, weight: 3 },
    { equipmentDefinitionId: sampleAccessoryEpic.id, weight: 1 },
  ],
};

export const sampleEquipmentDropTables: EquipmentDropTable[] = [dropTableNormal, dropTableBoss];

export const sampleEquipmentDropTablesById: Record<string, EquipmentDropTable> = Object.fromEntries(
  sampleEquipmentDropTables.map((t) => [t.id, t]),
);
