import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { enemyRelay, enemySentinel } from '../enemies/stage1Enemies';
import { enemyDrainer, enemyPurger, enemyShielder, enemyBossNereid } from '../enemies/stage2Enemies';

/** Official Stage2《沈黙した循環区》 — 10-Zone gameplay layout. */
export const stageHaruka02: StageDefinition = {
  id: 'stage_haruka_02',
  name: '沈黙した循環区',
  zones: [
    {
      id: 'zone_1',
      enemies: [
        { enemyDefinitionId: enemyDrainer.id, instanceId: 'zone1_drainer_1' },
        { enemyDefinitionId: enemyDrainer.id, instanceId: 'zone1_drainer_2' },
        { enemyDefinitionId: enemyPurger.id, instanceId: 'zone1_purger_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_2',
      enemies: [
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone2_shielder_1' },
        { enemyDefinitionId: enemyDrainer.id, instanceId: 'zone2_drainer_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone2_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_3',
      enemies: [
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone3_sentinel_1' },
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone3_shielder_1' },
        { enemyDefinitionId: enemyPurger.id, instanceId: 'zone3_purger_1' },
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_4',
      enemies: [
        { enemyDefinitionId: enemyDrainer.id, instanceId: 'zone4_drainer_1' },
        { enemyDefinitionId: enemyPurger.id, instanceId: 'zone4_purger_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone4_relay_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_5',
      enemies: [
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone5_shielder_1' },
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone5_shielder_2' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_6',
      enemies: [
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone6_sentinel_1' },
        { enemyDefinitionId: enemyDrainer.id, instanceId: 'zone6_drainer_1' },
        { enemyDefinitionId: enemyPurger.id, instanceId: 'zone6_purger_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_7',
      enemies: [
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone7_shielder_1' },
        { enemyDefinitionId: enemyRelay.id, instanceId: 'zone7_relay_1' },
        { enemyDefinitionId: enemyPurger.id, instanceId: 'zone7_purger_1' },
      ],
      isRareRewardEvent: true,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_8',
      enemies: [
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone8_sentinel_1' },
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone8_shielder_1' },
        { enemyDefinitionId: enemyDrainer.id, instanceId: 'zone8_drainer_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_9',
      enemies: [
        { enemyDefinitionId: enemyShielder.id, instanceId: 'zone9_shielder_1' },
        { enemyDefinitionId: enemyPurger.id, instanceId: 'zone9_purger_1' },
        { enemyDefinitionId: enemySentinel.id, instanceId: 'zone9_sentinel_1' },
      ],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'NORMAL_ZONE',
      isFinalZone: false,
    },
    {
      id: 'zone_4_final',
      enemies: [{ enemyDefinitionId: enemyBossNereid.id, instanceId: 'zone_final_nereid' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};
