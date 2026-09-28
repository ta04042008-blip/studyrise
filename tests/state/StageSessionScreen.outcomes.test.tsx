import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StageSessionScreen } from '../../src/state/StageSessionScreen';
import type { StageLaunchConfig } from '../../src/base/base.types';
import type { CharacterDefinition } from '../../src/engine/battle/BattleEngine.types';
import type { StageDefinition } from '../../src/engine/stage/StageEngine.types';
import { sampleEnemy } from '../../src/data/enemies/sampleEnemy';
import { sampleSpell } from '../../src/data/spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../../src/data/spells/sampleAdditionalSpells';
import { sampleQuestions } from '../../src/data/questions/sampleQuestions';

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
    zones: [{ id: `${id}_zone1`, enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e1' }], isRareRewardEvent: false, isFinalZone: true }],
  };
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

/** Drives a single-character, single-enemy Zone battle to its end via Attack + correct answers. */
function driveZoneBattleToEnd(maxSteps = 200): 'won' | 'lost' | 'stuck' | 'timeout' {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';
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

function completeSingleCharacterRewardAndProceed() {
  const card = document.querySelector<HTMLElement>('.reward-card')!;
  fireEvent.click(card);
  fireEvent.click(screen.getByRole('button', { name: '決定' }));
  const proceedButton = document.querySelector<HTMLElement>('.reward-screen__complete button')!;
  fireEvent.click(proceedButton);
}

describe('StageSessionScreen — every outcome returns to Base via onReturnToBase', () => {
  it('Stage Clear → 拠点へ戻る', () => {
    const config: StageLaunchConfig = {
      party: [powerfulCharacter],
      stage: oneZoneFinalStage('stage_test_clear'),
      questions: sampleQuestions,
      battleItems: [],
      runSeed: 101,
    };
    const onReturnToBase = vi.fn();
    render(<StageSessionScreen config={config} onReturnToBase={onReturnToBase} />);

    expect(driveZoneBattleToEnd()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    completeSingleCharacterRewardAndProceed();

    expect(screen.getByRole('heading', { name: 'ステージクリア！' })).toBeTruthy();
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

  it('Self Return → 拠点へ戻る', () => {
    const stage: StageDefinition = {
      id: 'stage_test_selfreturn',
      name: 'テストステージ（自主帰還）',
      zones: [
        { id: 'zone1', enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e1' }], isRareRewardEvent: false, isFinalZone: false },
        { id: 'zone2_final', enemies: [{ enemyDefinitionId: sampleEnemy.id, instanceId: 'e2' }], isRareRewardEvent: false, isFinalZone: true },
      ],
    };
    const config: StageLaunchConfig = {
      party: [powerfulCharacter],
      stage,
      questions: sampleQuestions,
      battleItems: [],
      runSeed: 103,
    };
    const onReturnToBase = vi.fn();
    render(<StageSessionScreen config={config} onReturnToBase={onReturnToBase} />);

    expect(driveZoneBattleToEnd()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    completeSingleCharacterRewardAndProceed();

    expect(screen.getByText(/次のゾーンへ進みますか/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));

    expect(screen.getByRole('heading', { name: '自主帰還しました' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onReturnToBase).toHaveBeenCalledTimes(1);
  });
});
