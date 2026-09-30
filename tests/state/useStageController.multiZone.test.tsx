import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useStageController } from '../../src/state/useStageController';
import { createSampleStageLaunchConfig } from '../../src/data/createSampleStageLaunchConfig';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { driveSampleZoneBattleToWin } from '../fixtures/sampleBattleDriver';

afterEach(cleanup);

function Harness() {
  return <>{useStageController(createSampleStageLaunchConfig(), () => {})}</>;
}

function readHpBars(): Record<string, { current: number; max: number }> {
  const result: Record<string, { current: number; max: number }> = {};
  for (const el of document.querySelectorAll<HTMLElement>('.hp-bar__label')) {
    const text = el.textContent ?? '';
    const match = text.match(/^(?:▶\s*)?(\S+)\s+HP (\d+) \/ (\d+)/);
    if (match) result[match[1]] = { current: Number(match[2]), max: Number(match[3]) };
  }
  return result;
}

const PARTY_LABELS = ['葉山智也', '南雲彩乃', '岡村駆'];

function completeRewardPhaseAndProceed() {
  for (const label of PARTY_LABELS) {
    expect(screen.getByRole('heading', { name: new RegExp(`^${label}の報酬$`) })).toBeTruthy();
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
  }
  fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);
}

describe('useStageController — 10-Zone Stage flow', () => {
  it('uses the official 10-zone Stage and carries survivor HP from Zone 1 into Zone 2', async () => {
    expect(sampleStage.zones).toHaveLength(10);
    expect(sampleStage.zones[9].isFinalZone).toBe(true);

    render(<Harness />);

    expect(await driveSampleZoneBattleToWin()).toBe('won');
    const zone1EndingHp = readHpBars();
    for (const label of PARTY_LABELS) expect(zone1EndingHp[label]).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    expect(document.querySelectorAll('.reward-card')).toHaveLength(3);
    completeRewardPhaseAndProceed();

    expect(screen.getByText(/次のゾーンへ進みますか/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));

    const zone2StartHp = readHpBars();
    for (const label of PARTY_LABELS) {
      expect(zone2StartHp[label].current).toBe(zone1EndingHp[label].current);
    }

    // Zone 2 is still the original runner + watcher story-anchor formation.
    expect(document.querySelectorAll('.battle-screen__enemy-slot')).toHaveLength(2);
  });
});
