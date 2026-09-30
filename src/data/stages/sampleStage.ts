import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { sampleEnemy } from '../enemies/sampleEnemy';
import { sampleEnemy2 } from '../enemies/sampleEnemies';
import { sampleEnemyBoss } from '../enemies/sampleEnemyBoss';
import { enemyClamp, enemyRelay, enemySentinel } from '../enemies/stage1Enemies';

/**
 * Official Stage1《閉ざされた連絡路》, Area 1《ハルカ》.
 * User-confirmed 2026-09-30 override: every official Stage is exactly 10 Zones.
 *
 * Existing story-anchor formations remain in Zones 1-3 and JANUS remains the
 * lap-boundary boss. Zones 4-9 extend gameplay pacing without adding new
 * story beats. The legacy final-zone id `zone_3_final` is retained for
 * RunSave/content compatibility even though it is now the 10th Zone.
 */
export const sampleStage: StageDefinition = {
  id: 'stage_sample_placeholder',
  name: '閉ざされた連絡路',
  zones: [
    {
      id: 'zone_1',
      enemies: [
        { enemyDefinitionId: sampleEnemy.id, instanceId: 'zone1_runner_1' },
        { enemyDefinitionId: sampleEnemy.id, instanceId: 'zone1_runner_2' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_2',
      enemies: [
        { enemyDefinitionId: sampleEnemy.id, instanceId: 'zone2_runner_1' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone2_watcher_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_3',
      enemies: [
        { enemyDefinitionId: enemyClamp.id, instanceId: 'zone3_clamp_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone3_relay_1' },
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone3_sentinel_1' },
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_4',
      enemies: [
        { enemyDefinitionId: sampleEnemy.id, instanceId: 'zone4_runner_1' },
        { enemyDefinitionId: enemyClamp.id, instanceId: 'zone4_clamp_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone4_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_5',
      enemies: [
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone5_watcher_1' },
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone5_sentinel_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_6',
      enemies: [
        { enemyDefinitionId: sampleEnemy.id, instanceId: 'zone6_runner_1' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone6_watcher_1' },
        { enemyDefinitionId: enemyClamp.id, instanceId: 'zone6_clamp_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_7',
      enemies: [
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone7_relay_1' },
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone7_sentinel_1' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone7_watcher_1' },
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_8',
      enemies: [
        { enemyDefinitionId: enemyClamp.id, instanceId: 'zone8_clamp_1' },
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone8_sentinel_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone8_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_9',
      enemies: [
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone9_sentinel_1' },
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone9_sentinel_2' },
        { enemyDefinitionId: enemyClamp.id, instanceId: 'zone9_clamp_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_3_final',
      enemies: [{ enemyDefinitionId: sampleEnemyBoss.id, instanceId: 'zone_final_janus' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};
