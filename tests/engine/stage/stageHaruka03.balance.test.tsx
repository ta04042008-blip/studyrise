import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStageController } from '../../../src/state/useStageController';
import { createProgressionSystem } from '../../../src/engine/progression/ProgressionSystem';
import { progressionConfig } from '../../../src/config/progressionConfig';
import { sampleGrowthProfileByCharacterId } from '../../../src/data/progression/growthProfiles';
import { sampleEquipmentDefinitionsById } from '../../../src/data/equipment/sampleEquipment';
import { sampleEquipmentDropTablesById } from '../../../src/data/equipment/sampleDropTables';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import { stageHaruka03 } from '../../../src/data/stages/stageHaruka03';
import { sampleQuestionsCoreFive } from '../../../src/data/questions/sampleQuestions';
import type { PermanentState } from '../../../src/engine/progression/ProgressionSystem.types';
import type { StageLaunchConfig } from '../../../src/base/base.types';
import { FULL_QUESTION_ANSWER_KEY } from '../../fixtures/questionAnswerKey';

afterEach(cleanup);

function Harness({ config }: { config: StageLaunchConfig }) {
  return <>{useStageController(config, () => {})}</>;
}

/**
 * MVP-10 Phase6 balance verification — Stage3《記録塔》 (real BattleEngine/
 * damage formula). A party that cleared Stage1+Stage2 (100+100=200
 * cumulative EXP) has just crossed the Lv4 cumulative threshold (189), so
 * Stage3 is fought entirely at Lv4 (permanent leveling applies once at
 * Stage-end only, spec §10.17). Stats built via the real
 * `resolveCharacterForBattle`, not manual arithmetic.
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
        { characterId: c.id, exp: 0, level: 4, equipped: { weaponInstanceId: null, armorInstanceId: null, accessoryInstanceId: null } },
      ]),
    ),
    unlockedCharacterIds: sampleParty.map((c) => c.id),
    unlockedStageIds: [stageHaruka03.id],
    clearedStageIds: [],
    currency: 0,
    materials: {},
    rareUnlockResource: 0,
    inventory: { equipment: [], consumables: {} },
  };

  return sampleParty.map((c) => progressionSystem.resolveCharacterForBattle(c, permanentState));
}

function clickIfPresent(selector: string): boolean {
  const el = document.querySelector<HTMLButtonElement>(selector);
  if (el && !el.disabled) {
    fireEvent.click(el);
    return true;
  }
  return false;
}

function driveZoneBattleToWin(maxSteps = 2000) {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';
    if (clickIfPresent('.command-menu button')) continue;
    if (clickIfPresent('.target-select-view button')) continue;
    if (clickIfPresent('.subject-star-select button')) continue;
    const questionText = document.querySelector('.question-view__text');
    if (questionText) {
      const idx = FULL_QUESTION_ANSWER_KEY[questionText.textContent?.trim() ?? ''] ?? 0;
      const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
      fireEvent.click(radios[idx]);
      fireEvent.click(screen.getByRole('button', { name: '回答する' }));
      continue;
    }
    const nextBtn = screen.queryByRole('button', { name: '次へ' });
    if (nextBtn) {
      fireEvent.click(nextBtn);
      continue;
    }
    return 'stuck';
  }
  return 'timeout';
}

function completeRewardPhase() {
  for (const character of sampleParty) {
    if (!screen.queryByRole('heading', { name: new RegExp(`^${character.name}の報酬$`) })) continue;
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
  }
}

describe('Stage3《記録塔》balance (Lv4 party, real Combat formula)', () => {
  it('Lv4 party clears all 4 zones including 記録管理体《MNEMOS》, without the app declaring 敗北', () => {
    const party = buildLv4Party();
    const config: StageLaunchConfig = {
      party,
      stage: stageHaruka03,
      questions: sampleQuestionsCoreFive,
      battleItems: [],
      runSeed: 777,
    };
    render(<Harness config={config} />);

    for (let zone = 0; zone < 4; zone++) {
      const outcome = driveZoneBattleToWin();
      expect(outcome).toBe('won');
      fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
      completeRewardPhase();
      fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);
      if (zone < 3) {
        fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));
      }
    }

    expect(screen.getByRole('heading', { name: 'ステージクリア！' })).toBeTruthy();
    expect(screen.getByText('クリア済みゾーン数: 4')).toBeTruthy();
  });
});
