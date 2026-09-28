import type { EnemyDefinition } from '../battle/BattleEngine.types';
import type { StageDefinition } from './StageEngine.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Stage content validation (CLAUDE.md §14, MVP-5 correction 2/5). Never
 * throws — an invalid StageDefinition is reported and excluded from load by
 * validateStagePool, never allowed to crash the app (CLAUDE.md §19).
 */
export function validateStageDefinition(
  stage: StageDefinition,
  enemyDefinitionsById: Record<string, EnemyDefinition>,
): ValidationResult {
  const errors: string[] = [];

  if (!stage.zones || stage.zones.length === 0) {
    errors.push('stage has no zones');
    return { valid: false, errors };
  }

  const zoneIds = new Set<string>();
  for (const zone of stage.zones) {
    if (zoneIds.has(zone.id)) {
      errors.push(`duplicate zone id: "${zone.id}"`);
    }
    zoneIds.add(zone.id);

    if (!zone.enemies || zone.enemies.length === 0) {
      errors.push(`zone "${zone.id}" has no enemies`);
      continue;
    }

    const instanceIds = new Set<string>();
    for (const enemy of zone.enemies) {
      if (instanceIds.has(enemy.instanceId)) {
        errors.push(`zone "${zone.id}" has duplicate instanceId: "${enemy.instanceId}"`);
      }
      instanceIds.add(enemy.instanceId);

      if (!enemyDefinitionsById[enemy.enemyDefinitionId]) {
        errors.push(`zone "${zone.id}" references unknown enemyDefinitionId: "${enemy.enemyDefinitionId}"`);
      }
    }
  }

  const finalZones = stage.zones.filter((z) => z.isFinalZone);
  if (finalZones.length !== 1) {
    errors.push(`stage must have exactly one final zone (found ${finalZones.length})`);
  } else if (stage.zones[stage.zones.length - 1].id !== finalZones[0].id) {
    errors.push('final zone must be the last zone in the stage');
  }
  const finalZoneId = finalZones.length === 1 ? finalZones[0].id : null;

  // Boss count: exactly one boss in the whole stage (MVP-5 correction 2),
  // and it must be inside the final zone (never elsewhere).
  let bossCount = 0;
  for (const zone of stage.zones) {
    for (const enemy of zone.enemies ?? []) {
      const def = enemyDefinitionsById[enemy.enemyDefinitionId];
      if (!def?.isBoss) continue;
      bossCount++;
      if (zone.id !== finalZoneId) {
        errors.push(`zone "${zone.id}" (not the final zone) must not contain a boss enemy`);
      }
    }
  }
  if (bossCount !== 1) {
    errors.push(`stage must contain exactly one boss enemy (found ${bossCount})`);
  }

  return { valid: errors.length === 0, errors };
}

export interface ValidatedStagePool {
  validStages: StageDefinition[];
  invalid: { stage: StageDefinition; errors: string[] }[];
}

/** Validates a whole content pool at once; bad stages are excluded, never thrown (CLAUDE.md §19). */
export function validateStagePool(
  stages: readonly StageDefinition[],
  enemyDefinitionsById: Record<string, EnemyDefinition>,
): ValidatedStagePool {
  const validStages: StageDefinition[] = [];
  const invalid: { stage: StageDefinition; errors: string[] }[] = [];

  for (const stage of stages) {
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    if (result.valid) {
      validStages.push(stage);
    } else {
      invalid.push({ stage, errors: result.errors });
    }
  }

  return { validStages, invalid };
}
