import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { enemyRelay, enemySentinel } from '../enemies/stage1Enemies';
import { enemyDrainer, enemyPurger, enemyShielder, enemyBossNereid } from '../enemies/stage2Enemies';

/**
 * MVP-10 official content — Stage2《沈黙した循環区》, Area 1《ハルカ》
 * (ストーリー・世界観仕様書v0.2 §25, v0.2.2 §6-14でNEREID戦テキストを補強)。
 * New stable stageId (no prior placeholder Stage2 existed).
 */
export const stageHaruka02: StageDefinition = {
  id: 'stage_haruka_02',
  name: '沈黙した循環区',
  zones: [
    {
      id: 'zone_1',
      // 「排水路」— ドレイナー×2 + パージャー×1 (v0.2 §25 Zone1)
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
      // 「防災区画」— シールダー×1 + ドレイナー×1 + リレー×1 (v0.2 §25 Zone2)
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
      // 「中枢冷却路」— センチネル×1 + シールダー×1 + パージャー×1 (v0.2 §25 Zone3、強敵センチネル再登場)
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
      id: 'zone_4_final',
      // Zone4 — 保全核《NEREID》単体 (v0.2 §25 Zone4)
      enemies: [{ enemyDefinitionId: enemyBossNereid.id, instanceId: 'zone_final_nereid' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};
