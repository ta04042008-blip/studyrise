import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStageController } from '../../../src/state/useStageController';
import { createProgressionSystem } from '../../../src/engine/progression/ProgressionSystem';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { sampleGrowthProfileByCharacterId } from '../../../src/data/progression/growthProfiles';
import { sampleEquipmentDefinitionsById } from '../../../src/data/equipment/sampleEquipment';
import { sampleEquipmentDropTablesById } from '../../../src/data/equipment/sampleDropTables';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import { stageHaruka02 } from '../../../src/data/stages/stageHaruka02';
import { sampleQuestionsCoreFive } from '../../../src/data/questions/sampleQuestions';
import { driveSampleZoneBattleToWin } from '../../fixtures/sampleBattleDriver';
import type { PermanentState } from '../../../src/engine/progression/ProgressionSystem.types';
import type { StageLaunchConfig } from '../../../src/base/base.types';

afterEach(cleanup);

function Harness({ config }: { config: StageLaunchConfig }) {
  return <>{useStageController(config, () => {})}</>;
}

/**
 * MVP-10 Phase6 balance verification — Stage2《沈黙した循環区》 (real
 * BattleEngine/damage formula, not hand arithmetic). The party's Stage2
 * combat stats are fixed at departure. Under the 10-zone progression
 * baseline, Stage1's first lap grants 220 EXP, so Stage2 begins at Lv4.
 * This builds that resolved party through ProgressionSystem and drives the
 * complete first 10-zone lap with the real BattleEngine/damage formula.
 */
function buildLv4Party() {
  const progressionSystem = createProgressionSystem({
    config: progressionConfig,
    growthProfileByCharacterId: sampleGrowthProfileByCharacterId,
    equipmentDefsById: sampleEquipmentDefinitionsById,
    equipmentDropTablesById: sampleEquipmentDropTablesById,
    characterUnlockRules: [],
    stageUnlockRules: [],
    instanceIdFactory: () => 'unused',
  });

  const permanentState: PermanentState = {
    characters: Object.fromEntries(
      sampleParty.map((c) => [
        c.id,
        { characterId: c.id, exp: 220, level: 4, equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: null } },
      ]),
    ),
    unlockedCharacterIds: sampleParty.map((c) => c.id),
    unlockedStageIds: [stageHaruka02.id],
    clearedStageIds: [],
    currency: 0,
    materials: {},
    rareUnlockResource: 0,
    inventory: { equipment: [], consumables: {} },
  };

  return sampleParty.map((c) => progressionSystem.resolveCharacterForBattle(c, permanentState));
}

function completeRewardPhase() {
  for (const character of sampleParty) {
    if (!screen.queryByRole('heading', { name: new RegExp(`^${character.name}の報酬$`) })) continue;
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
  }
}

describe('Stage2《沈黙した循環区》 first-lap balance (Lv4 party, real Combat formula)', () => {
  it('Lv4 party can clear all 10 zones through 保全核《NEREID》 and reach the lap-boundary choice', async () => {
    const party = buildLv4Party();
    const config: StageLaunchConfig = {
      party,
      stage: stageHaruka02,
      questions: sampleQuestionsCoreFive,
      battleItems: [],
      runSeed: 555,
    };
    render(<Harness config={config} />);

    expect(stageHaruka02.zones).toHaveLength(10);

    for (let zone = 0; zone < 10; zone += 1) {
      const outcome = await driveSampleZoneBattleToWin();
      expect(outcome).toBe('won');

      fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
      completeRewardPhase();
      fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);

      if (zone < 9) {
        fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));
      }
    }

    expect(screen.getByRole('heading', { name: '1周目を踏破' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '2周目へ' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));
    expect(screen.getByText('完全踏破: 1周')).toBeTruthy();
  }, 120_000);
});
