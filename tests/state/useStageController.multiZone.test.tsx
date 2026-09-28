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

/** Drives COMMAND_SELECT→...→EXPLANATION/RESULT_APPLY loops with "アタック" + correct answers until the zone's battle ends. */
function driveZoneBattleToWin(maxSteps = 1500) {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';

    if (clickIfPresent('.command-menu button')) continue; // "アタック" is always the first, enabled command button
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

function readHpBars(): Record<string, { current: number; max: number }> {
  const result: Record<string, { current: number; max: number }> = {};
  for (const el of document.querySelectorAll<HTMLElement>('.hp-bar__label')) {
    const text = el.textContent ?? '';
    const m = text.match(/^(?:▶\s*)?(\S+)\s+HP (\d+) \/ (\d+)/);
    if (m) result[m[1]] = { current: Number(m[2]), max: Number(m[3]) };
  }
  return result;
}

const PARTY_LABELS = ['主人公', '魔法使い', '騎士'];

/** Drives every deployed character's reward selection (first offered candidate each), then taps the completion banner's continue/clear button. */
function completeRewardPhaseAndProceed() {
  for (const label of PARTY_LABELS) {
    expect(screen.getByRole('heading', { name: new RegExp(`^${label}の報酬$`) })).toBeTruthy();
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
  }
  // Whichever completion-banner label is showing (次のゾーンへ / ステージクリアへ).
  const proceedButton = document.querySelector<HTMLElement>('.reward-screen__complete button')!;
  fireEvent.click(proceedButton);
}

describe('useStageController — full multi-zone Stage flow (spec v0.5 §2, MVP-5)', () => {
  it('Zone1 → Reward → Zone2 (rare event, duplicate enemy species) → Reward → Zone3 (Final/Boss) → Reward → Stage Clear', () => {
    render(<Harness />);

    // --- Zone 1 ---
    expect(driveZoneBattleToWin()).toBe('won');
    const zone1EndingHp = readHpBars();
    for (const label of PARTY_LABELS) expect(zone1EndingHp[label]).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    // Zone 1 is not a rare-reward-event zone: exactly 3 candidates offered.
    expect(document.querySelectorAll('.reward-card')).toHaveLength(3);
    completeRewardPhaseAndProceed();

    // --- INTER_ZONE_CHOICE between Zone1 and Zone2 ---
    expect(screen.getByText(/次のゾーンへ進みますか/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));

    // Zone 2 starts: survivors' HP carried over (never reset to full unless
    // already full), new enemies (2× same species) start fresh.
    const zone2StartHp = readHpBars();
    for (const label of PARTY_LABELS) {
      expect(zone2StartHp[label].current).toBe(zone1EndingHp[label].current);
    }
    expect(document.querySelectorAll('.hp-bar').length).toBeGreaterThanOrEqual(2 + PARTY_LABELS.length); // 2 goblins + party

    // --- Zone 2 (rare reward event, duplicate enemy species) ---
    expect(driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    // Zone 2 IS a rare-reward-event zone: 4 candidates offered (ZoneDefinition.isRareRewardEvent reflected).
    expect(document.querySelectorAll('.reward-card')).toHaveLength(4);
    completeRewardPhaseAndProceed();

    // --- INTER_ZONE_CHOICE between Zone2 and Zone3 ---
    fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));

    // --- Zone 3 (Final Zone, boss present) ---
    expect(driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    expect(document.querySelectorAll('.reward-card')).toHaveLength(3); // Final Zone still uses the normal reward rule
    // Final Zone's completion banner reads differently, and there is no INTER_ZONE_CHOICE afterward.
    for (const label of PARTY_LABELS) {
      expect(screen.getByRole('heading', { name: new RegExp(`^${label}の報酬$`) })).toBeTruthy();
      const card = document.querySelector<HTMLElement>('.reward-card')!;
      fireEvent.click(card);
      fireEvent.click(screen.getByRole('button', { name: '決定' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'ステージクリアへ' }));

    // --- Stage Clear ---
    expect(screen.getByRole('heading', { name: 'ステージクリア！' })).toBeTruthy();
    expect(screen.getByText('クリア済みゾーン数: 3')).toBeTruthy();
  });
});
