import { useEffect, useMemo, useRef, useState } from 'react';
import { ZoneBattlePanel } from '../ui/stage/ZoneBattlePanel';
import { ZoneRewardPanel } from '../ui/stage/ZoneRewardPanel';
import { InterZoneChoiceView } from '../ui/stage/InterZoneChoiceView';
import { StageResultView } from '../ui/stage/StageResultView';
import { createStageEngine, diffConsumedItemCounts, type RunResolver } from '../engine/stage/StageEngine';
import type { StageRunState } from '../engine/stage/StageEngine.types';
import type { StageEndContext } from '../engine/progression/ProgressionSystem.types';
import { stageConfig } from '../config/stageConfig';
import { createRogueliteEngine } from '../engine/roguelite/RogueliteEngine';
import { createRandomService } from '../engine/random/RandomService';
import { enemyDefinitionsById } from '../data/enemies/enemyDefinitionsById';
import { spellsById } from '../data/spells/spellsById';
import { sampleRewardDefinitions } from '../data/roguelite/sampleRewardDefinitions';
import { rewardConfig } from '../config/rewardConfig';
import type { ItemBattleSlot, BattleEngineSnapshot } from '../engine/battle/BattleEngine.types';
import type { RewardPhaseSnapshot, RunState } from '../engine/roguelite/RogueliteEngine.types';
import type { StageLaunchConfig } from '../base/base.types';
import type { QuestionResult } from '../engine/learningHistory/LearningHistory.types';

export type { StageLaunchConfig } from '../base/base.types';

const stageEngine = createStageEngine({ config: stageConfig });

/**
 * `resolveBattleInputsForRun`/`createInitialRunState`/`resetRunBuild` are all
 * randomness-free (see StageEngine.ts's RunResolver doc), so one stable
 * RogueliteEngine instance can serve as the "single source" StageEngine
 * delegates to for those three methods (MVP-5 correction 4) — the *reward*
 * candidate generation itself always goes through a fresh, per-zone,
 * reward-seeded instance instead (see ZoneRewardPanel).
 */
const runResolver: RunResolver = createRogueliteEngine({
  spellsById,
  rewardDefinitions: sampleRewardDefinitions,
  config: rewardConfig,
  random: createRandomService(0),
});

/**
 * MVP-9: everything the resumable Run checkpoint needs whenever it changes
 * in a way that should refresh at least the `live` tier (spec §15.2/§15.3).
 * The caller (useBaseController) combines this with the static parts of a
 * RunSavePayload it already holds (areaId/stageId/resolvedParty/
 * questionScope/itemSlotSelection) — this hook itself never touches
 * SaveSystem/IndexedDB directly (CLAUDE.md §21).
 */
export interface RunProgressUpdate {
  stageRunState: StageRunState;
  liveBattleSnapshot: BattleEngineSnapshot | null;
  liveRewardSnapshot: RewardPhaseSnapshot | null;
}

export interface UseStageControllerSaveHooks {
  /**
   * MVP-9: resume an in-progress Stage attempt from a previously saved
   * checkpoint instead of calling `createInitialState`. Read only once, at
   * this hook's initial construction.
   */
  resumeFrom?: {
    stageRunState: StageRunState;
    liveBattleSnapshot: BattleEngineSnapshot | null;
    liveRewardSnapshot: RewardPhaseSnapshot | null;
  };
  /**
   * Fired once, synchronously, right after this Stage attempt's very first
   * Zone battle begins — at initial mount (a fresh, non-resumed departure)
   * and at `restart()` (spec's "もう一度" — a brand new attempt with a new
   * runSeed). The coordinator should refresh ALL THREE checkpoint tiers
   * (`stageStart`/`zoneStart`/`live`) from this state — never fired again
   * mid-attempt, so `stageStart` stays exactly what it was at departure
   * (spec §15.3/user's explicit 3-tier instruction).
   */
  onStageStart?: (stageRunState: StageRunState) => void;
  /**
   * Fired once per subsequent Zone battle begun via `continueToNextZone`
   * (never for the Stage's first zone — see `onStageStart`). The
   * coordinator should refresh the `zoneStart` and `live` tiers.
   */
  onZoneStart?: (stageRunState: StageRunState) => void;
  /**
   * Fired after every other confirmed state change that should refresh the
   * `live` tier only: a Zone won/lost, a reward phase's per-character apply
   * or full completion, proceeding out of the reward screen, and every
   * stable Battle/Reward snapshot change bubbled up from
   * ZoneBattlePanel/ZoneRewardPanel. Never fired from a `useEffect` watching
   * arbitrary state — only from the exact event handler that caused the
   * change (CLAUDE.md §18/§28).
   */
  onProgressChange?: (update: RunProgressUpdate) => void;
}

/**
 * MVP-6 entry point for exactly one Stage attempt (spec v0.6 §2/§18.13-18.14).
 * `config` is REQUIRED — this hook never falls back to sample content on its
 * own (user's explicit MVP-6 correction: no implicit sample-data fallback in
 * production code). The base layer is the only caller in production, via
 * `buildStageLaunchConfig`/`buildResumedStageLaunchConfig` after 出撃確認 or
 * Resume; tests/dev code may use `createSampleStageLaunchConfig()` to build
 * one explicitly.
 *
 * Must be called unconditionally on every render of whatever component
 * hosts it — `StageSessionScreen` is that one component, mounted/unmounted
 * by the base layer's phase switch, never called from behind an `if` inside
 * a shared hook (Rules of Hooks, user's explicit MVP-6 requirement).
 */
export function useStageController(
  config: StageLaunchConfig,
  onReturnToBase: (endContext: StageEndContext) => void,
  onQuestionResult?: (result: QuestionResult) => void,
  saveHooks?: UseStageControllerSaveHooks,
) {
  const { party, stage, questions, battleItems, runSeed: initialRunSeed } = config;

  // MVP-9: consumed exactly once — a `restart()` always begins a genuinely
  // fresh attempt and must never let a stale resumed snapshot leak into it
  // (see restart()'s own comment below).
  const resumeFromRef = useRef(saveHooks?.resumeFrom ?? null);

  const [runSeed, setRunSeed] = useState(resumeFromRef.current?.stageRunState.runSeed ?? initialRunSeed);

  const [stageState, setStageState] = useState<StageRunState>(() =>
    resumeFromRef.current
      ? resumeFromRef.current.stageRunState
      : stageEngine.createInitialState(stage, party, runSeed, runResolver, battleItems),
  );

  // Fires exactly once, for the Stage's very first Zone (spec: whether this
  // mount is a fresh departure or a resumed one, `stageStart`/`zoneStart`
  // must already reflect *some* valid state — a fresh departure has none
  // yet, so this is what creates them; a resumed session already has them
  // from before, so this deliberately does NOT re-fire on resume, only on a
  // genuinely fresh departure).
  useEffect(() => {
    if (!resumeFromRef.current) {
      saveHooks?.onStageStart?.(stageState);
    }
    // Intentionally mount-only: this must reflect the FIRST render's state,
    // before any player action — not re-run on later state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const characterNameById = useMemo<Record<string, string>>(
    () => Object.fromEntries(party.map((c) => [c.id, c.name])),
    [party],
  );

  const zone = stageEngine.currentZone(stage, stageState);
  const battleSeed = stageEngine.deriveZoneBattleSeed(stage, stageState);
  const rewardSeed = stageEngine.deriveZoneRewardSeed(stage, stageState);

  // MVP-9: a saved live snapshot only ever applies to the exact Zone it was
  // captured in — once the player moves on (win/lose/next Zone), later
  // Zones must start fresh, never accidentally reuse a stale snapshot from
  // before a reload (see also restart()'s ref reset).
  const resumeZoneId = resumeFromRef.current ? stage.zones[resumeFromRef.current.stageRunState.currentZoneIndex]?.id : null;
  const battleRestoreSnapshot =
    resumeFromRef.current && zone.id === resumeZoneId ? resumeFromRef.current.liveBattleSnapshot ?? undefined : undefined;
  const rewardRestoreSnapshot =
    resumeFromRef.current && zone.id === resumeZoneId ? resumeFromRef.current.liveRewardSnapshot ?? undefined : undefined;

  // The party-shared item pool carries across the WHOLE Stage attempt (spec
  // §5.10/§14, MVP-7 decision doc §14 — no longer refilled per zone).
  // `stageState.battleItems` only changes reference at the same moments
  // `zone.id` does (recordZoneWin/recordZoneDefeat/createInitialState), so
  // keying on `zone.id` alone still gives BattleEngine a fresh, isolated
  // clone each zone without re-cloning on every unrelated re-render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialItems = useMemo<ItemBattleSlot[]>(() => stageState.battleItems.map((slot) => ({ ...slot })), [zone.id]);

  function notifyProgress(next: StageRunState, live: Partial<RunProgressUpdate> = {}) {
    saveHooks?.onProgressChange?.({
      stageRunState: next,
      liveBattleSnapshot: live.liveBattleSnapshot ?? null,
      liveRewardSnapshot: live.liveRewardSnapshot ?? null,
    });
  }

  function restart() {
    // A restart is a brand new attempt (new runSeed) — never let a resumed
    // snapshot from the attempt being replaced leak into it.
    resumeFromRef.current = null;
    const nextSeed = runSeed + 1;
    const next = stageEngine.createInitialState(stage, party, nextSeed, runResolver, battleItems);
    setRunSeed(nextSeed);
    setStageState(next);
    saveHooks?.onStageStart?.(next);
  }

  const devPanel = import.meta.env.DEV && (
    <div className="dev-panel">
      <p>
        runSeed: {stageState.runSeed} / zone: {stageState.currentZoneIndex + 1}/{stage.zones.length} ({zone.id})
      </p>
    </div>
  );

  switch (stageState.phase) {
    case 'ZONE_BATTLE': {
      const enemies = stageEngine.resolveZoneEnemies(stage, stageState, enemyDefinitionsById);
      return (
        <>
          <h1>StudyRise — Stage攻略</h1>
          {devPanel}
          <ZoneBattlePanel
            key={zone.id}
            stageId={stage.id}
            party={party}
            enemies={enemies}
            runState={stageState.runState}
            runResolver={runResolver}
            questions={questions}
            spellsById={spellsById}
            initialItems={initialItems}
            seed={battleSeed}
            onQuestionResult={onQuestionResult}
            restoreSnapshot={battleRestoreSnapshot}
            onSnapshotChange={(snapshot) => notifyProgress(stageState, { liveBattleSnapshot: snapshot })}
            onWin={(survivorHp, remainingItems) => {
              const next = stageEngine.recordZoneWin(stage, stageState, survivorHp, remainingItems);
              setStageState(next);
              notifyProgress(next);
            }}
            onLose={(remainingItems) => {
              const next = stageEngine.recordZoneDefeat(stageState, party, runResolver, remainingItems);
              setStageState(next);
              notifyProgress(next);
            }}
          />
        </>
      );
    }
    case 'ZONE_REWARD': {
      const isFinalZone = zone.isFinalZone;
      return (
        <>
          <h1>StudyRise — Stage攻略</h1>
          {devPanel}
          <ZoneRewardPanel
            key={zone.id}
            party={party}
            isRareRewardEvent={zone.isRareRewardEvent}
            runState={stageState.runState}
            rewardSeed={rewardSeed}
            spellsById={spellsById}
            rewardDefinitions={sampleRewardDefinitions}
            characterNameById={characterNameById}
            nextLabel={isFinalZone ? 'ステージクリアへ' : '次のゾーンへ'}
            restoreSnapshot={rewardRestoreSnapshot}
            onSnapshotChange={(snapshot) => notifyProgress(stageState, { liveRewardSnapshot: snapshot })}
            onRunStateChange={(nextRunState: RunState) => {
              const next = stageEngine.updateRunState(stageState, nextRunState);
              setStageState(next);
              notifyProgress(next);
            }}
            onProceedFromReward={() => {
              const next = stageEngine.completeZoneReward(stage, stageState, party, runResolver);
              setStageState(next);
              notifyProgress(next);
            }}
          />
        </>
      );
    }
    case 'INTER_ZONE_CHOICE': {
      return (
        <>
          <h1>StudyRise — Stage攻略</h1>
          {devPanel}
          <InterZoneChoiceView
            onContinue={() => {
              const next = stageEngine.continueToNextZone(stage, stageState, party, runResolver);
              setStageState(next);
              notifyProgress(next);
              saveHooks?.onZoneStart?.(next);
            }}
            onSelfReturn={() => {
              const next = stageEngine.selfReturn(stageState, party, runResolver);
              setStageState(next);
              notifyProgress(next);
            }}
          />
        </>
      );
    }
    case 'STAGE_RESULT': {
      // Pure data shaping only (no RNG, no PermanentState mutation) — safe
      // to compute during render. The actual permanent-reward reconciliation
      // is deferred to Base's "拠点へ戻る" click handler (MVP-7 decision doc
      // §19: reconcileStageResult runs exactly once, from an event handler,
      // never a React effect). MVP-9: the RunSave checkpoint is deliberately
      // NOT cleared just because STAGE_RESULT was reached — a reload here
      // must redisplay this exact result, never re-run reconcileStageResult
      // twice (spec §15.2/user's explicit instruction §16).
      const stageEndContext: StageEndContext = {
        stageResult: stageState.result!,
        stage,
        partyCharacterIds: party.map((c) => c.id),
        runSeed: stageState.runSeed,
        consumedItemCounts: diffConsumedItemCounts(battleItems, stageState.battleItems),
      };
      return (
        <>
          <h1>StudyRise — Stage攻略</h1>
          <StageResultView
            result={stageState.result!}
            onReturnToBase={() => onReturnToBase(stageEndContext)}
            onRestart={restart}
          />
        </>
      );
    }
  }
}
