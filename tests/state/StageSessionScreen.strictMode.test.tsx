import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StageSessionScreen } from '../../src/state/StageSessionScreen';
import type { StageLaunchConfig } from '../../src/base/base.types';
import type { CharacterDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { StageDefinition } from '../../src/engine/stage/StageEngine.types';
import { sampleEnemy } from '../../src/data/enemies/sampleEnemy';
import { sampleSpell } from '../../src/data/spells/sampleSpell';
import { sampleQuestions } from '../../src/data/questions/sampleQuestions';

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
  questions: sampleQuestions,
  battleItems: [],
  runSeed: 999,
};

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

function driveToWin(maxSteps = 200) {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (clickIfPresent('.command-menu button')) continue;
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

describe('StageSessionScreen under React.StrictMode (Rules of Hooks / no double Stage start)', () => {
  it('mounts exactly one Stage session — one command menu, not two', () => {
    render(
      <StrictMode>
        <StageSessionScreen config={config} onReturnToBase={() => {}} />
      </StrictMode>,
    );
    expect(document.querySelectorAll('.command-menu')).toHaveLength(1);
  });

  it('calls onReturnToBase exactly once per tap, even under StrictMode double-invocation', () => {
    const onReturnToBase = vi.fn();
    render(
      <StrictMode>
        <StageSessionScreen config={config} onReturnToBase={onReturnToBase} />
      </StrictMode>,
    );

    expect(driveToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
    fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);

    expect(screen.getByRole('heading', { name: 'ステージクリア！' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onReturnToBase).toHaveBeenCalledTimes(1);
  });
});
