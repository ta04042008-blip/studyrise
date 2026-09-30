import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { driveSampleZoneBattleToWin } from '../fixtures/sampleBattleDriver';
import { StageSessionScreen } from '../../src/state/StageSessionScreen';
import type { StageLaunchConfig } from '../../src/base/base.types';
import type { CharacterDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { StageDefinition } from '../../src/engine/stage/StageEngine.types';
import { sampleEnemy } from '../../src/data/enemies/sampleEnemy';
import { sampleSpell } from '../../src/data/spells/sampleSpell';
import { sampleQuestionsCoreFive } from '../../src/data/questions/sampleQuestions';

afterEach(cleanup);

const powerfulCharacter: CharacterDefinition = {
  id: 'char_test_strict',
  name: 'テスト勇者',
  baseStats: { attack: 1000, defense: 50, speed: 99, maxHp: 999, maxMp: 5 },
  initialSpellId: sampleSpell.id,
  additionalSpellPoolIds: [],
};

const stage: StageDefinition = {
  id: 'stage_test_strict',
  name: 'テストステージ（StrictMode確認用）',
  zones: [
    {
      id: 'zone1',
      enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e1' }],
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
  runSeed: 999,
};

describe('StageSessionScreen under React.StrictMode (Rules of Hooks / no double Stage start)', () => {
  it('mounts exactly one Stage session — one command menu, not two', () => {
    render(
      <StrictMode>
        <StageSessionScreen config={config} onReturnToBase={() => {}} />
      </StrictMode>,
    );
    expect(document.querySelectorAll('.command-menu')).toHaveLength(1);
  });

  it('calls onReturnToBase exactly once per tap after a completed lap, even under StrictMode double-invocation', async () => {
    const onReturnToBase = vi.fn();
    render(
      <StrictMode>
        <StageSessionScreen config={config} onReturnToBase={onReturnToBase} />
      </StrictMode>,
    );

    expect(await driveSampleZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
    fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);

    expect(screen.getByRole('heading', { name: '1周目を踏破' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'クリアして拠点へ帰還' }));
    expect(screen.getByRole('heading', { name: 'ステージクリア！' })).toBeTruthy();
    expect(screen.getByText('完全踏破: 1周')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onReturnToBase).toHaveBeenCalledTimes(1);
  });
});
