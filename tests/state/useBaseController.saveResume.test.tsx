import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { createInMemorySaveRepository } from '../../src/engine/save/InMemorySaveRepository';
import { createSaveSystem, type SaveSystem } from '../../src/engine/save/SaveSystem';
import { sampleArea } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { sampleParty } from '../../src/data/characters/sampleCharacters';
import { answerCurrentOfficialQuestionCorrectly } from '../fixtures/officialQuestionDriver';

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

function clickIfPresent(selector: string): boolean {
  const el = document.querySelector<HTMLButtonElement>(selector);
  if (el && !el.disabled) {
    fireEvent.click(el);
    return true;
  }
  return false;
}

/** Drives exactly one question-based command to its explanation, answering correctly. */
async function answerOneCorrectQuestion(): Promise<boolean> {
  if (!clickIfPresent('.command-menu button')) return false;
  clickIfPresent('.target-select-view button');
  clickIfPresent('.subject-star-select button');
  if (!document.querySelector('.question-view')) return false;

  answerCurrentOfficialQuestionCorrectly();

  if (document.querySelector('.command-animation-view')) {
    await waitFor(
      () => expect(document.querySelector('.explanation-view')).not.toBeNull(),
      { timeout: 1200, interval: 20 },
    );
  }
  return true;
}

async function driveZoneBattleToWin(maxSteps = 1500): Promise<'won' | 'lost' | 'stuck' | 'timeout'> {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';
    if (clickIfPresent('.command-menu button')) continue;
    if (clickIfPresent('.target-select-view button')) continue;
    if (clickIfPresent('.subject-star-select button')) continue;

    if (document.querySelector('.question-view')) {
      answerCurrentOfficialQuestionCorrectly();
      continue;
    }

    if (document.querySelector('.command-animation-view')) {
      await waitFor(
        () => {
          if (document.querySelector('.command-animation-view')) throw new Error('command animation still running');
        },
        { timeout: 1200, interval: 20 },
      );
      continue;
    }

    if (document.querySelector('.explanation-view')) {
      const nextBtn = await screen.findByRole('button', { name: '次へ' }, { timeout: 800 });
      fireEvent.click(nextBtn);
      continue;
    }

    const spellNext = screen.queryByRole('button', { name: /^(次の問題へ|準備完了)$/ });
    if (spellNext) {
      fireEvent.click(spellNext);
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
  fireEvent.click(screen.getByRole('button', { name: 'パーティを保存' }));

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
    expect(await answerOneCorrectQuestion()).toBe(true);
    // Land back on a stable resting phase (EXPLANATION) before "reloading".
    const hpBefore = currentHpText();

    reload(saveSystem);

    // MVP-9: must land on the resume-choice screen, never straight to Base or a fresh Stage.
    expect(await screen.findByRole('button', { name: '途中から再開' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '出撃' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '途中から再開' }));

    // Resumed straight back into the Stage, at the same HP.
    await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());
    expect(currentHpText()).toBe(hpBefore);
  });

  it('a RunSave blocks a fresh departure until resolved, and 中断データを破棄 clears it (never re-prompts after)', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();
    await answerOneCorrectQuestion();

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

    expect(await driveZoneBattleToWin()).toBe('won');
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
    await answerOneCorrectQuestion();
    const hpBefore = currentHpText();

    reload(saveSystem, true);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());
    expect(currentHpText()).toBe(hpBefore);

    // Finish the run and confirm the permanent reward is still granted
    // exactly once under StrictMode's double-invoked effects/updaters.
    expect(await driveZoneBattleToWin()).toBe('won');
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

describe('useBaseController — restore-order safety (MVP-9 audit item 2)', () => {
  it('resuming a Battle and immediately reloading again (no action taken) never overwrites the restored live checkpoint with a fresh initial state', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();
    await answerOneCorrectQuestion();

    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());
    const hpAfterFirstResume = currentHpText();

    // White-box check: read what SaveSystem actually has stored right after
    // that resume, with NO player action in between.
    const bootAfterFirstResume = await saveSystem.loadBoot();
    const snapshotAfterFirstResume = bootAfterFirstResume.run?.payload.liveBattleSnapshot;
    expect(snapshotAfterFirstResume).toBeTruthy();

    // Reload/resume TWICE more, doing nothing each time — a fresh engine's
    // initial state must never sneak into the live checkpoint before the
    // saved snapshot is restored.
    for (let i = 0; i < 2; i++) {
      reload(saveSystem);
      fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
      await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());
      expect(currentHpText()).toBe(hpAfterFirstResume);

      const boot = await saveSystem.loadBoot();
      expect(boot.run?.payload.liveBattleSnapshot).toEqual(snapshotAfterFirstResume);
    }
  });

  it('resuming a Reward phase and immediately reloading again (no action taken) never re-rolls or drops the restored candidates', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();
    expect(await driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const candidatesBefore = Array.from(document.querySelectorAll('.reward-card__name')).map((el) => el.textContent);

    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await screen.findByText(candidatesBefore[0] ?? '');
    const bootAfterFirstResume = await saveSystem.loadBoot();
    const snapshotAfterFirstResume = bootAfterFirstResume.run?.payload.liveRewardSnapshot;
    expect(snapshotAfterFirstResume).toBeTruthy();

    for (let i = 0; i < 2; i++) {
      reload(saveSystem);
      fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
      await screen.findByText(candidatesBefore[0] ?? '');
      const candidatesNow = Array.from(document.querySelectorAll('.reward-card__name')).map((el) => el.textContent);
      expect(candidatesNow).toEqual(candidatesBefore);

      const boot = await saveSystem.loadBoot();
      expect(boot.run?.payload.liveRewardSnapshot).toEqual(snapshotAfterFirstResume);
    }
  });
});

describe('useBaseController — additional real-scenario coverage (MVP-9 audit item 3)', () => {
  it('an unanswered QUESTION survives a reload: same questionId shown, choice selection resets to unselected', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();

    fireEvent.click(screen.getByRole('button', { name: 'アタック' }));
    clickIfPresent('.target-select-view button');
    clickIfPresent('.subject-star-select button');
    const questionBefore = document.querySelector('.question-view__text')!.textContent!.trim();
    expect(document.querySelectorAll('.question-view input[type=radio]:checked')).toHaveLength(0);

    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await screen.findByText(questionBefore);

    // Same question, never re-rolled, and the never-confirmed selection is
    // simply absent again (spec: unconfirmed UI selection is not saved).
    expect(document.querySelector('.question-view__text')?.textContent?.trim()).toBe(questionBefore);
    expect(document.querySelectorAll('.question-view input[type=radio]:checked')).toHaveLength(0);
  });

  it('Search-revealed enemy actions and turn order survive a reload, including the HIDDEN full planned-action queue (white-box)', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();

    fireEvent.click(screen.getByRole('button', { name: 'サーチ' }));
    clickIfPresent('.target-select-view button');
    clickIfPresent('.subject-star-select button');
    answerCurrentOfficialQuestionCorrectly();
    // submitAnswer() enters COMMAND_ANIMATION and then automatically reaches
    // EXPLANATION. Search is already applied there; inspect/save that stable
    // state BEFORE pressing 次へ, because the following enemy turn may consume
    // part (or all) of the revealed queue.
    await waitFor(() => expect(document.querySelector('.explanation-view')).not.toBeNull(), { timeout: 1200 });

    const searchPanelBefore = document.querySelector('.search-info-panel')?.textContent;
    const turnOrderBefore = document.querySelector('.turn-order-view')?.textContent;
    expect(searchPanelBefore).toBeTruthy();

    const bootBefore = await saveSystem.loadBoot();
    const hiddenPlannedBefore = bootBefore.run?.payload.liveBattleSnapshot?.enemyPlannedActions;
    const hiddenRevealedCountBefore = bootBefore.run?.payload.liveBattleSnapshot?.revealedCountByEnemyId;
    expect(hiddenPlannedBefore).toBeTruthy();

    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());

    // Player-visible: identical revealed actions and identical turn order.
    expect(document.querySelector('.search-info-panel')?.textContent).toBe(searchPanelBefore);
    expect(document.querySelector('.turn-order-view')?.textContent).toBe(turnOrderBefore);

    // Hidden (never shown to the player): the FULL planned-action queue and
    // revealed-count bookkeeping must also match exactly — not just the
    // player-visible prefix (user's explicit MVP-9 instruction).
    const bootAfter = await saveSystem.loadBoot();
    expect(bootAfter.run?.payload.liveBattleSnapshot?.enemyPlannedActions).toEqual(hiddenPlannedBefore);
    expect(bootAfter.run?.payload.liveBattleSnapshot?.revealedCountByEnemyId).toEqual(hiddenRevealedCountBefore);
  });

  it('Zone 2 mid-battle (after a Zone 1 clear + reward pick) survives a reload: zone index / HP / MP / RunBuild / item pool / timeline / phase all match — not just Zone 1', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);
    await driveToStageStart();

    expect(await driveZoneBattleToWin()).toBe('won');
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' })); // grants a RunBuild entry
    fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);
    fireEvent.click(screen.getByRole('button', { name: '次のゾーンへ' }));
    await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());

    // Take a couple of confirmed actions in Zone 2 so HP/MP/timeline/items are non-trivial.
    await answerOneCorrectQuestion();
    await waitFor(() => expect(document.querySelector('.explanation-view')).not.toBeNull(), { timeout: 1200 });
    fireEvent.click(await screen.findByRole('button', { name: '次へ' }, { timeout: 800 }));
    await answerOneCorrectQuestion();

    const bootBefore = await saveSystem.loadBoot();
    const before = bootBefore.run?.payload;
    expect(before?.stageRunState.currentZoneIndex).toBe(1); // zone_2, not zone_1

    reload(saveSystem);
    fireEvent.click(await screen.findByRole('button', { name: '途中から再開' }));
    await waitFor(() => expect(document.querySelector('.zone-battle-panel')).not.toBeNull());

    const bootAfter = await saveSystem.loadBoot();
    const after = bootAfter.run?.payload;

    expect(after?.stageRunState.currentZoneIndex).toBe(before?.stageRunState.currentZoneIndex);
    // HP + RunBuild (spells/command boosts/temp stat boosts gained from the Zone 1 reward).
    expect(after?.stageRunState.runState).toEqual(before?.stageRunState.runState);
    // Battle item pool (party-shared, carries across zones).
    expect(after?.stageRunState.battleItems).toEqual(before?.stageRunState.battleItems);
    // Per-actor HP/MP, exactly as BattleEngine tracks them.
    expect(after?.liveBattleSnapshot?.state.players).toEqual(before?.liveBattleSnapshot?.state.players);
    // Timeline (turn order gauges) and current Battle phase.
    expect(after?.liveBattleSnapshot?.state.timeline).toEqual(before?.liveBattleSnapshot?.state.timeline);
    expect(after?.liveBattleSnapshot?.state.phase).toBe(before?.liveBattleSnapshot?.state.phase);
  });
});
