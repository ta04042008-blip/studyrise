import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { sampleEnemy } from '../enemies/sampleEnemy';
import { sampleEnemy2 } from '../enemies/sampleEnemies';
import { sampleEnemyBoss } from '../enemies/sampleEnemyBoss';
import { enemyClamp, enemyRelay, enemySentinel } from '../enemies/stage1Enemies';

/**
 * MVP-10 official content — Stage1《閉ざされた連絡路》, Area 1《ハルカ》
 * (ストーリー・世界観仕様書v0.2 §23, v0.2.1 §7-14で導入/JANUS戦テキストを
 * 上書き)。4 Zones (v0.2 §17: 「4ゾーン×3ステージは正式仕様の範囲内」).
 *
 * ID kept as `stage_sample_placeholder` for Save V1 compatibility (user's
 * explicit MVP-10 instruction). Zone IDs `zone_1`/`zone_2` kept as-is;
 * `zone_3_final` kept as the JANUS final zone (never repurposed as a
 * mid-stage zone — user's explicit instruction); `zone_3` is the one new
 * Zone ID added for「封鎖ゲート前」.
 */
export const sampleStage: StageDefinition = {
  id: 'stage_sample_placeholder',
  name: '閉ざされた連絡路',
  zones: [
    {
      id: 'zone_1',
      // 「旧接続路」— ランナー ×2 (v0.2 §23 Zone1)
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
      // 「監視交差点」— ランナー ×1 + ウォッチャー ×1 (v0.2 §23 Zone2)
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
      // 「封鎖ゲート前」— クランプ×1 + リレー×1 + センチネル×1 (v0.2 §23 Zone3、初の強敵)
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
      id: 'zone_3_final',
      // Zone4 — 門衛機《JANUS》単体 (v0.2 §23 Zone4)
      enemies: [{ enemyDefinitionId: sampleEnemyBoss.id, instanceId: 'zone_final_janus' }],
      isRareRewardEvent: false,
      permanentRewardProfileId: 'BOSS_ZONE',
      isFinalZone: true,
    },
  ],
};
