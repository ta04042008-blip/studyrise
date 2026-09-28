import { useMemo, useState } from 'react';
import { ZoneBattlePanel } from '../ui/stage/ZoneBattlePanel';
import { ZoneRewardPanel } from '../ui/stage/ZoneRewardPanel';
import { InterZoneChoiceView } from '../ui/stage/InterZoneChoiceView';
import { StageResultView } from '../ui/stage/StageResultView';
import { createStageEngine, type RunResolver } from '../engine/stage/StageEngine';
import type { StageRunState } from '../engine/stage/StageEngine.types';
import { stageConfig } from '../config/stageConfig';
import { createRogueliteEngine } from '../engine/roguelite/RogueliteEngine';
import { createRandomService } from '../engine/random/RandomService';
import { sampleEnemyDefinitionsById } from '../data/stages/sampleStage';
import { spellsById } from '../data/spells/spellsById';
import { sampleRewardDefinitions } from '../data/roguelite/sampleRewardDefinitions';
import { rewardConfig } from '../config/rewardConfig';
import type { ItemBattleSlot } from '../engine/battle/BattleEngine.types';
import type { RunState } from '../engine/roguelite/RogueliteEngine.types';
import type { StageLaunchConfig } from '../base/base.types';

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
 * MVP-6 entry point for exactly one Stage attempt (spec v0.6 §2/§18.13-18.14).
 * `config` is REQUIRED — this hook never falls back to sample content on its
 * own (user's explicit MVP-6 correction: no implicit sample-data fallback in
 * production code). The base layer is the only caller in production, via
 * `buildStageLaunchConfig` after 出撃確認 (src/base/buildStageLaunchConfig.ts);
 * tests/dev code may use `createSampleStageLaunchConfig()`
 * (src/data/createSampleStageLaunchConfig.ts) to build one explicitly.
 *
 * Must be called unconditionally on every render of whatever component
 * hosts it — `StageSessionScreen` is that one component, mounted/unmounted
 * by the base layer's phase switch, never called from behind an `if` inside
 * a shared hook (Rules of Hooks, user's explicit MVP-6 requirement).
 */
export function useStageController(config: StageLaunchConfig, onReturnToBase: () => void) {
  const { party, stage, questions, battleItems, runSeed: initialRunSeed } = config;

  const [runSeed, setRunSeed] = useState(initialRunSeed);

  const [stageState, setStageState] = useState<StageRunState>(() =>
    stageEngine.createInitialState(stage, party, runSeed, runResolver),
  );

  const characterNameById = useMemo<Record<string, string>>(
    () => Object.fromEntries(party.map((c) => [c.id, c.name])),
    [party],
  );

  const zone = stageEngine.currentZone(stage, stageState);
  const battleSeed = stageEngine.deriveZoneBattleSeed(stage, stageState);
  const rewardSeed = stageEngine.deriveZoneRewardSeed(stage, stageState);

  // One stable item loadout per zone attempt (spec §5.10: unused items
  // return to inventory at zone end — MVP-6 doesn't yet model that
  // transfer, so each zone simply starts fresh from the launch-time
  // loadout, same as MVP-5's harness).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialItems = useMemo<ItemBattleSlot[]>(() => battleItems.map((slot) => ({ ...slot })), [zone.id]);

  function restart() {
    const nextSeed = runSeed + 1;
    setRunSeed(nextSeed);
    setStageState(stageEngine.createInitialState(stage, party, nextSeed, runResolver));
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
      const enemies = stageEngine.resolveZoneEnemies(stage, stageState, sampleEnemyDefinitionsById);
      return (
        <>
          <h1>StudyRise — Stage攻略</h1>
          {devPanel}
          <ZoneBattlePanel
            key={zone.id}
            party={party}
            enemies={enemies}
            runState={stageState.runState}
            runResolver={runResolver}
            questions={questions}
            spellsById={spellsById}
            initialItems={initialItems}
            seed={battleSeed}
            onWin={(survivorHp) => setStageState((s) => stageEngine.recordZoneWin(s, survivorHp))}
            onLose={() => setStageState((s) => stageEngine.recordZoneDefeat(s, party, runResolver))}
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
            onRunStateChange={(nextRunState: RunState) =>
              setStageState((s) => stageEngine.updateRunState(s, nextRunState))
            }
            onProceedFromReward={() =>
              setStageState((s) => stageEngine.completeZoneReward(stage, s, party, runResolver))
            }
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
            onContinue={() => setStageState((s) => stageEngine.continueToNextZone(stage, s, party, runResolver))}
            onSelfReturn={() => setStageState((s) => stageEngine.selfReturn(s, party, runResolver))}
          />
        </>
      );
    }
    case 'STAGE_RESULT': {
      return (
        <>
          <h1>StudyRise — Stage攻略</h1>
          <StageResultView result={stageState.result!} onReturnToBase={onReturnToBase} onRestart={restart} />
        </>
      );
    }
  }
}
