import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { createInMemorySaveRepository } from '../../src/engine/save/InMemorySaveRepository';
import { createSaveSystem, type SaveSystem } from '../../src/engine/save/SaveSystem';
import { sampleArea } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { sampleParty } from '../../src/data/characters/sampleCharacters';

afterEach(cleanup);

function Harness({ saveSystem }: { saveSystem: SaveSystem }) {
  return <>{useBaseController({ saveSystem })}</>;
}

function StrictHarness({ saveSystem }: { saveSystem: SaveSystem }) {
  return (
    <StrictMode>
      <Harness saveSystem={saveSystem} />
    </StrictMode>
  );
}

function newSaveSystem(): SaveSystem {
  let tick = 0;
  return createSaveSystem({ repository: createInMemorySaveRepository(), clock: { now: () => tick++ } });
}

/**
 * Simulates closing and reopening the app: unmounts the current tree and
 * mounts a brand new one against the SAME SaveSystem (i.e. the same
 * backing store) — a fresh React component tree with no leftover in-memory
 * state, exactly like a real page reload, minus IndexedDB itself (which has
 * its own dedicated tests in IndexedDbSaveRepository.test.ts). The caller is
 * responsible for awaiting whatever screen should appear once the async
 * boot load resolves (e.g. `await screen.findByRole(...)`) — this helper
 * only handles the unmount/remount itself.
 */
function reload(saveSystem: SaveSystem, strict = false) {
  cleanup();
  render(strict ? <StrictHarness saveSystem={saveSystem} /> : <Harness saveSystem={saveSystem} />);
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

/** Drives exactly one question-based command to completion (COMMAND_SELECT -> EXPLANATION), answering correctly. */
function answerOneCorrectQuestion(): boolean {
  if (!clickIfPresent('.command-menu button')) return false;
  clickIfPresent('.target-select-view button');
  clickIfPresent('.subject-star-select button');
  const questionText = document.querySelector('.question-view__text');
  if (!questionText) return false;
  const idx = CORRECT_INDEX_BY_TEXT[questionText.textContent?.trim() ?? ''] ?? 0;
  const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
  fireEvent.click(radios[idx]);
  fireEvent.click(screen.getByRole('button', { name: '回答する' }));
  return true;
}

function driveZoneBattleToWin(maxSteps = 1500): 'won' | 'lost' | 'stuck' | 'timeout' {
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

async function driveToStageStart() {
  fireEvent.click(await screen.findByRole('button', { name: '出撃' }));
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

function currentHpText(): string {
  return document.querySelector('.hp-bar__label')?.textContent ?? '';
}

describe('useBaseController — Run resume across a simulated reload (MVP-9)', () => {
  it('mid-battle progress (HP/answered history) survives a reload via 途中から再開, without re-showing Base first', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();

    // Take exactly one confirmed action so there is real mid-battle progress.
    expect(answerOneCorrectQuestion()).toBe(true);
    // Land back on a stable resting phase (EXPLANATION) before "reloading".
    const hpBefore = currentHpText();

    reload(saveSystem);

    // MVP-9: must land on the resume-choice screen, never straight to Base or a fresh Stage.
    expect(await screen.findByRole('button', { name: '途中から再開' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '出撃' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '途中から再開' }));

    // Resumed straight back into the Stage, at the same HP.
    await screen.findByRole('heading', { name: 'StudyRise — Stage攻略' });
    expect(currentHpText()).toBe(hpBefore);
  });

  it('a RunSave blocks a fresh departure until resolved, and 中断データを破棄 clears it (never re-prompts after)', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();
    answerOneCorrectQuestion();

    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '中断データを破棄して拠点へ' }));

    expect(await screen.findByRole('button', { name: '出撃' })).toBeTruthy();

    // A further reload must NOT resurrect the discarded Run.
    reload(saveSystem);
    expect(await screen.findByRole('button', { name: '出撃' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '途中から再開' })).toBeNull();
  });

  it('Stage Result survives a reload unresolved, and reward is granted exactly once even across a reload right at that screen', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();

    expect(driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
    fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));
    expect(screen.getByRole('heading', { name: '自主帰還しました' })).toBeTruthy();

    // Reload while sitting at StageResult, BEFORE ever pressing 拠点へ戻る.
    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    expect(await screen.findByRole('heading', { name: '自主帰還しました' })).toBeTruthy();

    // Only now does the permanent reward get granted.
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(await screen.findByRole('button', { name: '出撃' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '持ち物' }));
    expect(screen.getByText('215')).toBeTruthy(); // 200 + zone1's 15 currency reward, granted exactly once

    // A reload after finalize must show no resume prompt and the same, un-duplicated reward.
    reload(saveSystem);
    expect(await screen.findByRole('button', { name: '出撃' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '持ち物' }));
    expect(screen.getByText('215')).toBeTruthy();
    expect(screen.queryByText('230')).toBeNull();
  });

  it('StrictMode double-invocation never corrupts the boot load, Stage-start checkpoint, or resume flow', async () => {
    const saveSystem = newSaveSystem();
    render(<StrictHarness saveSystem={saveSystem} />);
    await driveToStageStart();
    answerOneCorrectQuestion();
    const hpBefore = currentHpText();

    reload(saveSystem, true);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await screen.findByRole('heading', { name: 'StudyRise — Stage攻略' });
    expect(currentHpText()).toBe(hpBefore);

    // Finish the run and confirm the permanent reward is still granted
    // exactly once under StrictMode's double-invoked effects/updaters.
    expect(driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
    fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));

    fireEvent.click(await screen.findByRole('button', { name: '持ち物' }));
    expect(screen.getByText('215')).toBeTruthy();
    expect(screen.queryByText('230')).toBeNull();
  });
});
