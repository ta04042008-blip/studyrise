import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStageController } from '../../src/state/useStageController';
import { createSampleStageLaunchConfig } from '../../src/data/createSampleStageLaunchConfig';

afterEach(cleanup);

function Harness() {
  return <>{useStageController(createSampleStageLaunchConfig(), () => {})}</>;
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

const PARTY_LABELS = ['主人公', '魔法使い', '騎士'];

describe('useStageController — self-return (spec §2.5, MVP-5)', () => {
  it('is only offered between zones, discards the run build, and ends the stage as SELF_RETURNED', () => {
    render(<Harness />);

    expect(driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));

    for (const _label of PARTY_LABELS) {
      const card = document.querySelector<HTMLElement>('.reward-card')!;
      fireEvent.click(card);
      fireEvent.click(screen.getByRole('button', { name: '決定' }));
    }
    fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));

    // Now in INTER_ZONE_CHOICE — self-return is offered here, and only here.
    expect(screen.getByText(/次のゾーンへ進みますか/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));

    expect(screen.getByRole('heading', { name: '自主帰還しました' })).toBeTruthy();
    expect(screen.getByText('クリア済みゾーン数: 1')).toBeTruthy();
  });
});
