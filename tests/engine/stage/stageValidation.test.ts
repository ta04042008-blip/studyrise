import { describe, expect, it } from 'vitest';
import { validateStageDefinition, validateStagePool } from '../../../src/engine/stage/stageValidation';
import type { EnemyDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { StageDefinition } from '../../../src/engine/stage/StageEngine.types';

const normalEnemy: EnemyDefinition = {
  id: 'enemy_normal',
  name: 'Slime',
  baseStats: { attack: 5, defense: 2, speed: 5, maxHp: 20 },
};

const bossEnemy: EnemyDefinition = {
  id: 'enemy_boss',
  name: 'Boss',
  isBoss: true,
  baseStats: { attack: 10, defense: 5, speed: 8, maxHp: 100 },
};

const enemyDefinitionsById: Record<string, EnemyDefinition> = {
  [normalEnemy.id]: normalEnemy,
  [bossEnemy.id]: bossEnemy,
};

function validStage(overrides: Partial<StageDefinition> = {}): StageDefinition {
  return {
    id: 'stage_1',
    name: 'Stage 1',
    zones: [
      {
        id: 'zone_1',
        enemies: [{ enemyDefinitionId: normalEnemy.id, instanceId: 'z1_e1' }],
        isRareRewardEvent: false,
        isFinalZone: false,
      },
      {
        id: 'zone_2_final',
        enemies: [{ enemyDefinitionId: bossEnemy.id, instanceId: 'z2_boss' }],
        isRareRewardEvent: false,
        isFinalZone: true,
      },
    ],
    ...overrides,
  };
}

describe('validateStageDefinition', () => {
  it('accepts a well-formed stage', () => {
    expect(validateStageDefinition(validStage(), enemyDefinitionsById).valid).toBe(true);
  });

  it('rejects a stage with no zones', () => {
    const result = validateStageDefinition(validStage({ zones: [] }), enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('stage has no zones');
  });

  it('rejects duplicate zone ids', () => {
    const stage = validStage();
    stage.zones[1] = { ...stage.zones[1], id: stage.zones[0].id };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate zone id'))).toBe(true);
  });

  it('rejects a zone with no enemies', () => {
    const stage = validStage();
    stage.zones[0] = { ...stage.zones[0], enemies: [] };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('has no enemies'))).toBe(true);
  });

  it('rejects duplicate instanceId within a zone', () => {
    const stage = validStage();
    stage.zones[0] = {
      ...stage.zones[0],
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'dup' },
        { enemyDefinitionId: normalEnemy.id, instanceId: 'dup' },
      ],
    };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('duplicate instanceId'))).toBe(true);
  });

  it('allows the same enemyDefinitionId to appear twice in one zone with distinct instanceIds', () => {
    const stage = validStage();
    stage.zones[0] = {
      ...stage.zones[0],
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'a' },
        { enemyDefinitionId: normalEnemy.id, instanceId: 'b' },
      ],
    };
    expect(validateStageDefinition(stage, enemyDefinitionsById).valid).toBe(true);
  });

  it('rejects an unknown enemyDefinitionId', () => {
    const stage = validStage();
    stage.zones[0] = {
      ...stage.zones[0],
      enemies: [{ enemyDefinitionId: 'no_such_enemy', instanceId: 'z1_e1' }],
    };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown enemyDefinitionId'))).toBe(true);
  });

  it('rejects zero final zones', () => {
    const stage = validStage();
    stage.zones[1] = { ...stage.zones[1], isFinalZone: false };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('exactly one final zone'))).toBe(true);
  });

  it('rejects more than one final zone', () => {
    const stage = validStage();
    stage.zones[0] = { ...stage.zones[0], isFinalZone: true };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('exactly one final zone'))).toBe(true);
  });

  it('rejects a final zone that is not the last zone in the array', () => {
    const stage = validStage({
      zones: [
        {
          id: 'zone_final_but_first',
          enemies: [{ enemyDefinitionId: bossEnemy.id, instanceId: 'boss' }],
          isRareRewardEvent: false,
          isFinalZone: true,
        },
        {
          id: 'zone_2',
          enemies: [{ enemyDefinitionId: normalEnemy.id, instanceId: 'e' }],
          isRareRewardEvent: false,
          isFinalZone: false,
        },
      ],
    });
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('final zone must be the last zone'))).toBe(true);
  });

  it('rejects a stage with zero bosses', () => {
    const stage = validStage();
    stage.zones[1] = {
      ...stage.zones[1],
      enemies: [{ enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e1' }],
    };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('exactly one boss'))).toBe(true);
  });

  it('rejects a stage with more than one boss', () => {
    const stage = validStage();
    stage.zones[1] = {
      ...stage.zones[1],
      enemies: [
        { enemyDefinitionId: bossEnemy.id, instanceId: 'boss_1' },
        { enemyDefinitionId: bossEnemy.id, instanceId: 'boss_2' },
      ],
    };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('exactly one boss'))).toBe(true);
  });

  it('rejects a boss placed outside the final zone', () => {
    const stage = validStage();
    stage.zones[0] = {
      ...stage.zones[0],
      enemies: [{ enemyDefinitionId: bossEnemy.id, instanceId: 'boss_early' }],
    };
    // zone_2_final still also has the boss removed so total boss count stays 1, isolating "wrong zone" from "wrong count".
    stage.zones[1] = {
      ...stage.zones[1],
      enemies: [{ enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e1' }],
    };
    const result = validateStageDefinition(stage, enemyDefinitionsById);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('must not contain a boss'))).toBe(true);
  });

  it('allows a normal enemy alongside the boss in the final zone', () => {
    const stage = validStage();
    stage.zones[1] = {
      ...stage.zones[1],
      enemies: [
        { enemyDefinitionId: normalEnemy.id, instanceId: 'z2_e1' },
        { enemyDefinitionId: bossEnemy.id, instanceId: 'z2_boss' },
      ],
    };
    expect(validateStageDefinition(stage, enemyDefinitionsById).valid).toBe(true);
  });
});

describe('validateStagePool', () => {
  it('excludes invalid stages but keeps valid ones, without throwing', () => {
    const good = validStage({ id: 'good' });
    const bad = validStage({ id: 'bad', zones: [] });

    const { validStages, invalid } = validateStagePool([good, bad], enemyDefinitionsById);

    expect(validStages.map((s) => s.id)).toEqual(['good']);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].stage.id).toBe('bad');
  });
});
