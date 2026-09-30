import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { computeLevelFromTotalExp } from '../../../src/engine/progression/ProgressionSystem';
import { stageHaruka03 } from '../../../src/data/stages/stageHaruka03';
import { enemyBossMnemos } from '../../../src/data/enemies/stage3Enemies';

function expForOneLap(): number {
  return stageHaruka03.zones.reduce((total, zone) => {
    const profile = progressionConfig.zoneRewardProfiles[zone.permanentRewardProfileId];
    return total + (profile?.expPerCharacter ?? 0);
  }, 0);
}

describe('Stage3《記録塔》 — 10-zone progression baseline', () => {
  it('has exactly 10 zones, one final MNEMOS boss zone, and Rare events at Zone 3 / Zone 7', () => {
    expect(stageHaruka03.zones).toHaveLength(10);
    expect(stageHaruka03.zones.filter((zone) => zone.isFinalZone)).toHaveLength(1);
    expect(stageHaruka03.zones[9].enemies).toEqual([
      { enemyDefinitionId: enemyBossMnemos.id, instanceId: 'zone_final_mnemos' },
    ]);
    expect(stageHaruka03.zones.filter((zone) => zone.isRareRewardEvent).map((zone) => zone.id)).toEqual([
      'zone_3',
      'zone_7',
    ]);
  });

  it('one 10-zone lap grants 220 EXP per deployed character; cumulative 660 EXP reaches Lv6', () => {
    expect(expForOneLap()).toBe(220);
    expect(computeLevelFromTotalExp(660, progressionConfig.expCurve)).toBe(6);
  });
});
