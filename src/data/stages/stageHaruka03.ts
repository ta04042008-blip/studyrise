import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { sampleEnemy2 } from '../enemies/sampleEnemies';
import { enemyRelay } from '../enemies/stage1Enemies';
import { enemyShielder } from '../enemies/stage2Enemies';
import { enemyScrib, enemyAuditor, enemyBossMnemos } from '../enemies/stage3Enemies';

/** Official Stage3《記録塔》 — 10-Zone gameplay layout. */
export const stageHaruka03: StageDefinition = {
  id: 'stage_haruka_03',
  name: '記録塔',
  zones: [
    {
      id: 'zone_1',
      enemies: [
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone1_scrib_1' },
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone1_scrib_2' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone1_watcher_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_2',
      enemies: [
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone2_auditor_1' },
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone2_scrib_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone2_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_3',
      enemies: [
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone3_auditor_1' },
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone3_shielder_1' },
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone3_scrib_1' },
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_4',
      enemies: [
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone4_scrib_1' },
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone4_scrib_2' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone4_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_5',
      enemies: [
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone5_auditor_1' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone5_watcher_1' },
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone5_scrib_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_6',
      enemies: [
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone6_auditor_1' },
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone6_shielder_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone6_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_7',
      enemies: [
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone7_auditor_1' },
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone7_auditor_2' },
        { enemyDefinitionId: enemyScrib.id, instanceId: 'zone7_scrib_1' },
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_8',
      enemies: [
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone8_shielder_1' },
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone8_auditor_1' },
        { enemyDefinitionId: sampleEnemy2.id, instanceId: 'zone8_watcher_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_9',
      enemies: [
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone9_auditor_1' },
        { enemyDefinitionId: enemyAuditor.id, instanceId: 'zone9_auditor_2' },
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone9_shielder_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_4_final',
      enemies: [{ enemyDefinitionId: enemyBossMnemos.id, instanceId: 'zone_final_mnemos' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};
