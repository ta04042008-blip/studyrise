import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';
import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { sampleEnemy } from '../enemies/sampleEnemy';
import { sampleEnemy2 } from '../enemies/sampleEnemies';
import { sampleEnemyBoss } from '../enemies/sampleEnemyBoss';

/**
 * PLACEHOLDER content — a 3-zone Stage (spec §2.1) for exercising MVP-5's
 * multi-zone/boss/Stage-clear flow. Not final game content (CLAUDE.md §24).
 *
 * Zone 2 deliberately places the same EnemyDefinition (ゴブリン) twice, to
 * exercise the instanceId/definitionId separation (MVP-5 correction 1).
 * Zone 3 (final) places the boss alongside one ordinary enemy — spec v0.5
 * explicitly allows non-boss enemies in the final zone.
 */
export const sampleStage: StageDefinition = {
  id: 'stage_sample_placeholder',
  name: 'サンプルステージ', // PLACEHOLDER
  zones: [
    {
      id: 'zone_1',
      enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'zone1_slime_1' }],
      isRareRewardEvent: false,
      isFinalZone: false,
    },
    {
      id: 'zone_2',
      enemies: [
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone2_goblin_1' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone2_goblin_2' },
      ],
      isRareRewardEvent: true,
      isFinalZone: false,
    },
    {
      id: 'zone_3_final',
      enemies: [
        { enemyDefinitionId: sampleEnemy.id, instanceId: 'zone3_slime_1' },
        { enemyDefinitionId: sampleEnemyBoss.id, instanceId: 'zone3_boss_1' },
      ],
      isRareRewardEvent: false,
      isFinalZone: true,
    },
  ],
};

export const sampleEnemyDefinitionsById: Record<string, EnemyDefinition> = Object.fromEntries(
  [sampleEnemy, sampleEnemy2, sampleEnemyBoss].map((e) => [e.id, e]),
);
