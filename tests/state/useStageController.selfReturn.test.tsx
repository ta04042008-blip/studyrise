import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { driveSampleZoneBattleToWin } from '../fixtures/sampleBattleDriver';
import { useStageController } from '../../src/state/useStageController';
import { createSampleStageLaunchConfig } from '../../src/data/createSampleStageLaunchConfig';

afterEach(cleanup);

function Harness() {
  return <>{useStageController(createSampleStageLaunchConfig(), () => {})}</>;
}

const PARTY_LABELS = ['葉山智也', '南雲彩乃', '岡村駆'];

describe('useStageController — self-return (spec §2.5, MVP-5)', () => {
  it('is only offered between zones, discards the run build, and ends the stage as SELF_RETURNED', async () => {
    render(<Harness />);

    expect(await driveSampleZoneBattleToWin()).toBe('won');
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
