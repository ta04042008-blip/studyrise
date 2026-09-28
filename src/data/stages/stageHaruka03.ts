import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { sampleEnemy2 } from '../enemies/sampleEnemies';
import { enemyRelay } from '../enemies/stage1Enemies';
import { enemyShielder } from '../enemies/stage2Enemies';
import { enemyScrib, enemyAuditor, enemyBossMnemos } from '../enemies/stage3Enemies';

/**
 * MVP-10 official content — Stage3《記録塔》, Area 1《ハルカ》
 * (ストーリー・世界観仕様書v0.2 §27, v0.2.2 §17-27でMNEMOS戦テキストを補強)。
 * New stable stageId (no prior placeholder Stage3 existed).
 */
export const stageHaruka03: StageDefinition = {
  id: 'stage_haruka_03',
  name: '記録塔',
  zones: [
    {
      id: 'zone_1',
      // 「保存書庫」— スクリブ×2 + ウォッチャー×1 (v0.2 §27 Zone1)
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
      // 「監査回廊」— オーディター×1 + スクリブ×1 + リレー×1 (v0.2 §27 Zone2、強敵オーディター初登場)
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
      // 「第一固定事故記録区」— オーディター×1 + シールダー×1 + スクリブ×1 (v0.2 §27 Zone3)
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
      id: 'zone_4_final',
      // Zone4 — 記録管理体《MNEMOS》単体 (v0.2 §27 Zone4)
      enemies: [{ enemyDefinitionId: enemyBossMnemos.id, instanceId: 'zone_final_mnemos' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};
