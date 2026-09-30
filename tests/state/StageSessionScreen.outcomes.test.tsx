import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { driveSampleZoneBattleToWin } from '../fixtures/sampleBattleDriver';
import { StageSessionScreen } from '../../src/state/StageSessionScreen';
import type { StageLaunchConfig } from '../../src/base/base.types';
import type { CharacterDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { StageDefinition } from '../../src/engine/stage/StageEngine.types';
import { sampleEnemy } from '../../src/data/enemies/sampleEnemy';
import { sampleSpell } from '../../src/data/spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../../src/data/spells/sampleAdditionalSpells';
import { sampleQuestionsCoreFive } from '../../src/data/questions/sampleQuestions';

afterEach(cleanup);

/**
 * These three tests verify only ONE thing per outcome: that
 * StageResultView's "拠点へ戻る" reaches `onReturnToBase` regardless of
 * which outcome (Clear/Defeat/Self Return) produced the STAGE_RESULT — the
 * actual battle/reward/inter-zone mechanics that produce each outcome are
 * already covered by the MVP-5 regression suite
 * (useStageController.multiZone/selfReturn tests). Custom, deliberately
 * lopsided party/enemy stats keep each path fast and deterministic instead
 * of re-running the full sample content.
 */

const powerfulCharacter: CharacterDefinition = {
  id: 'char_test_powerful',
  name: 'テスト勇者',
  baseStats: { attack: 1000, defense: 50, speed: 99, maxHp: 999, maxMp: 5 },
  initialSpellId: sampleSpell.id,
  additionalSpellPoolIds: [sampleAdditionalSpellIce.id, sampleAdditionalSpellHeal.id],
};

const fragileCharacter: CharacterDefinition = {
  id: 'char_test_fragile',
  name: 'テストか弱いキャラ',
  baseStats: { attack: 1, defense: 0, speed: 1, maxHp: 1, maxMp: 5 },
  initialSpellId: sampleSpell.id,
  additionalSpellPoolIds: [],
};

function oneZoneFinalStage(id: string): StageDefinition {
  return {
    id,
    name: `テストステージ（${id}）`,
    zones: [
      {
        id: `${id}_zone1`,
        enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e1' }],
        isRareRewardEvent: false,
        permanentRewardProfileId: 'BOSS_ZONE',
        isFinalZone: true,
      },
    ],
  };
}

function completeSingleCharacterRewardAndProceed() {
  const card = document.querySelector<HTMLElement>('.reward-card')!;
  fireEvent.click(card);
  fireEvent.click(screen.getByRole('button', { name: '決定' }));
  const proceedButton = document.querySelector<HTMLElement>('.reward-screen__complete button')!;
  fireEvent.click(proceedButton);
}

describe('StageSessionScreen — run endings return to Base via onReturnToBase', () => {
  it('completed lap → 自主帰還 → 拠点へ戻る', async () => {
    const config: StageLaunchConfig = {
      party: [powerfulCharacter],
      stage: oneZoneFinalStage('stage_test_clear'),
      questions: sampleQuestionsCoreFive,
      battleItems: [],
      runSeed: 101,
    };
    const onReturnToBase = vi.fn();
    render(<StageSessionScreen config={config} onReturnToBase={onReturnToBase} />);

    expect(await driveSampleZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    completeSingleCharacterRewardAndProceed();

    expect(screen.getByRole('heading', { name: '1周目を踏破' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));
    expect(screen.getByRole('heading', { name: '自主帰還しました' })).toBeTruthy();
    expect(screen.getByText('完全踏破: 1周')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onReturnToBase).toHaveBeenCalledTimes(1);
  });

  it('Defeat → 拠点へ戻る', () => {
    const config: StageLaunchConfig = {
      party: [fragileCharacter],
      stage: oneZoneFinalStage('stage_test_defeat'),
      questions: [],
      battleItems: [],
      runSeed: 102,
    };
    const onReturnToBase = vi.fn();
    render(<StageSessionScreen config={config} onReturnToBase={onReturnToBase} />);

    // sampleEnemy (speed 8) vastly outpaces the fragile character (speed 1)
    // and one-shots its 1 HP — the loss resolves without any player input.
    expect(driveZoneBattleToEnd()).toBe('lost');
    fireEvent.click(screen.getByRole('button', { name: /敗北/ }));

    expect(screen.getByRole('heading', { name: '敗北……' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onReturnToBase).toHaveBeenCalledTimes(1);
  });

  it('Self Return before a full lap → 拠点へ戻る', async () => {
    const stage: StageDefinition = {
      id: 'stage_test_selfreturn',
      name: 'テストステージ（自主帰還）',
      zones: [
        {
          id: 'zone1',
          enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e1' }],
          isRareRewardEvent: false,
          permanentRewardProfileId: 'NORMAL_ZONE',
          isFinalZone: false,
        },
        {
          id: 'zone2_final',
          enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e2' }],
          isRareRewardEvent: false,
          permanentRewardProfileId: 'BOSS_ZONE',
          isFinalZone: true,
        },
      ],
    };
    const config: StageLaunchConfig = {
      party: [powerfulCharacter],
      stage,
      questions: sampleQuestionsCoreFive,
      battleItems: [],
      runSeed: 103,
    };
    const onReturnToBase = vi.fn();
    render(<StageSessionScreen config={config} onReturnToBase={onReturnToBase} />);

    expect(await driveSampleZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    completeSingleCharacterRewardAndProceed();

    expect(screen.getByText(/次のゾーンへ進みますか/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));

    expect(screen.getByRole('heading', { name: '自主帰還しました' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onReturnToBase).toHaveBeenCalledTimes(1);
  });
});
