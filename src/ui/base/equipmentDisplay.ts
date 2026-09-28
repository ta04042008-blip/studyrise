import type { EquipmentDefinition, EquipmentInstance } from '../../engine/progression/ProgressionSystem.types';

/** Shared display formatting (CLAUDE.md §9 — pure, no calculation) for "what's in this equipped slot", reused by CharacterDetailView and DeparturePrepScreen's read-only 装備確認. */
export function resolveEquippedName(
  instanceId: string | null,
  equipmentInstances: readonly EquipmentInstance[],
  equipmentDefsById: Record<string, EquipmentDefinition>,
): string {
  if (!instanceId) return '未装備';
  const instance = equipmentInstances.find((i) => i.instanceId === instanceId);
  const def = instance ? equipmentDefsById[instance.definitionId] : undefined;
  if (!def || !instance) return '未装備';
  return `${def.name} +${instance.enhancementLevel}`;
}
