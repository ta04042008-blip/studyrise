import { describe, expect, it } from 'vitest';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { computeLevelFromTotalExp } from '../../../src/engine/progression/ProgressionSystem';
import { stageHaruka02 } from '../../../src/data/stages/stageHaruka02';
import { enemyBossNereid } from '../../../src/data/enemies/stage2Enemies';

function expForOneLap(): number {
  return stageHaruka02.zones.reduce((total, zone) => {
    const profile = progressionConfig.zoneRewardProfiles[zone.permanentRewardProfileId];
    return total + (profile?.expPerCharacter ?? 0);
  }, 0);
}

describe('Stage2《沈黙した循環区》 — 10-zone progression baseline', () => {
  it('has exactly 10 zones, one final NEREID boss zone, and Rare events at Zone 3 / Zone 7', () => {
    expect(stageHaruka02.zones).toHaveLength(10);
    expect(stageHaruka02.zones.filter((zone) => zone.isFinalZone)).toHaveLength(1);
    expect(stageHaruka02.zones[9].enemies).toEqual([
      { enemyDefinitionId: enemyBossNereid.id, instanceId: 'zone_final_nereid' },
    ]);
    expect(stageHaruka02.zones.filter((zone) => zone.isRareRewardEvent).map((zone) => zone.id)).toEqual([
      'zone_3',
      'zone_7',
    ]);
  });

  it('one 10-zone lap grants 220 EXP per deployed character; cumulative 440 EXP reaches Lv5 for Stage3', () => {
    expect(expForOneLap()).toBe(220);
    expect(computeLevelFromTotalExp(440, progressionConfig.expCurve)).toBe(5);
  });
});
