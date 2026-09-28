import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { sampleArea } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { sampleParty } from '../../src/data/characters/sampleCharacters';

afterEach(cleanup);

function Harness() {
  return <>{useBaseController()}</>;
}

function StrictHarness() {
  return (
    <StrictMode>
      <Harness />
    </StrictMode>
  );
}

const CORRECT_INDEX_BY_TEXT: Record<string, number> = {
  '7 + 5 は？': 2,
  '9 × 6 は？': 1,
  '縦4cm、横5cmの長方形の面積は？': 1,
  '"apple" の意味は？': 0,
  '"library" の意味は？': 1,
};

function clickIfPresent(selector: string): boolean {
  const el = document.querySelector<HTMLButtonElement>(selector);
  if (el && !el.disabled) {
    fireEvent.click(el);
    return true;
  }
  return false;
}

function driveZoneBattleToWin(maxSteps = 1500) {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';
    if (clickIfPresent('.command-menu button')) continue;
    if (clickIfPresent('.target-select-view button')) continue;
    if (clickIfPresent('.subject-star-select button')) continue;
    const questionText = document.querySelector('.question-view__text');
    if (questionText) {
      const idx = CORRECT_INDEX_BY_TEXT[questionText.textContent?.trim() ?? ''] ?? 0;
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

/** Drives Base Home all the way to a mounted, in-progress Stage with a single-character party (主人公 only). */
function driveToStageStart() {
  fireEvent.click(screen.getByRole('button', { name: '出撃' }));
  fireEvent.click(screen.getByRole('button', { name: sampleArea.name }));
  fireEvent.click(screen.getByRole('button', { name: sampleStage.name }));

  fireEvent.click(screen.getByRole('button', { name: '編成を変更' }));
  fireEvent.click(screen.getByRole('button', { name: sampleParty[0].name }));
  fireEvent.click(screen.getByRole('button', { name: '決定' }));

  fireEvent.click(screen.getByLabelText(/数学（教科単位選択）/));
  fireEvent.click(screen.getByLabelText(/英語（教科単位選択）/));

  fireEvent.click(screen.getByRole('button', { name: '出撃確認へ' }));
  fireEvent.click(screen.getByRole('button', { name: '出撃' }));
}

/** Zone 1 win → first-offered reward for the single deployed character → self-return at INTER_ZONE_CHOICE → 拠点へ戻る. */
function driveZone1ThenSelfReturnToBase() {
  expect(driveZoneBattleToWin()).toBe('won');
  fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
  const card = document.querySelector<HTMLElement>('.reward-card')!;
  fireEvent.click(card);
  fireEvent.click(screen.getByRole('button', { name: '決定' }));
  fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);

  fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));
  expect(screen.getByRole('heading', { name: '自主帰還しました' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
}

describe('useBaseController — permanent-reward reconciliation end-to-end (MVP-7)', () => {
  it('a self-returned Stage attempt grants Zone-clear EXP/currency/material to PermanentState, back at Base', () => {
    render(<Harness />);
    driveToStageStart();
    driveZone1ThenSelfReturnToBase();

    // Back at BASE_HOME.
    expect(screen.getByRole('button', { name: '出撃' })).toBeTruthy();

    // 持ち物: currency grew by exactly zone_1's NORMAL_ZONE reward (200 + 15), self-return keeps 100%.
    fireEvent.click(screen.getByRole('button', { name: '持ち物' }));
    expect(screen.getByText('215')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));

    // キャラクター: the deployed character leveled EXP (20, still Lv1 since Lv1→2 needs 30).
    fireEvent.click(screen.getByRole('button', { name: 'キャラクター' }));
    fireEvent.click(screen.getByRole('button', { name: sampleParty[0].name }));
    expect(screen.getByText('20 / 次Lvまで 30')).toBeTruthy();
  });

  it('reconciles exactly once even under React.StrictMode double-invocation', () => {
    render(<StrictHarness />);
    driveToStageStart();
    driveZone1ThenSelfReturnToBase();

    fireEvent.click(screen.getByRole('button', { name: '持ち物' }));
    // If reconcileStageResult had double-applied, this would read 230 (200 + 15*2) instead of 215.
    expect(screen.getByText('215')).toBeTruthy();
    expect(screen.queryByText('230')).toBeFalsy();
  });
});
