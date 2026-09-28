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
import { sampleParty } from '../data/characters/sampleCharacters';
import { sampleStage, sampleEnemyDefinitionsById } from '../data/stages/sampleStage';
import { sampleQuestions } from '../data/questions/sampleQuestions';
import { sampleSpell } from '../data/spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../data/spells/sampleAdditionalSpells';
import { sampleItem } from '../data/items/sampleItem';
import { sampleRewardDefinitions } from '../data/roguelite/sampleRewardDefinitions';
import { rewardConfig } from '../config/rewardConfig';
import type { ItemBattleSlot, SpellDefinition } from '../engine/battle/BattleEngine.types';
import type { RunState } from '../engine/roguelite/RogueliteEngine.types';

const spellsById: Record<string, SpellDefinition> = Object.fromEntries(
  [sampleSpell, sampleAdditionalSpellIce, sampleAdditionalSpellHeal].map((s) => [s.id, s]),
);

const characterNameById: Record<string, string> = Object.fromEntries(sampleParty.map((c) => [c.id, c.name]));

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

const DEFAULT_RUN_SEED = 1;

/**
 * MVP-5 entry point: generalizes MVP-4's Battle → Reward → Battle harness
 * into StageEngine's Battle Zone1 → Reward → Battle Zone2 → ... → Boss →
 * Reward → StageResult flow (CLAUDE.md §21, spec v0.5 §2). No Stage-select
 * screen yet (MVP-5 scope) — always the one sample Stage, always Zone 1 on
 * (re)start (spec §2.4).
 */
export function useStageController() {
  const [runSeed, setRunSeed] = useState(DEFAULT_RUN_SEED);

  const [stageState, setStageState] = useState<StageRunState>(() =>
    stageEngine.createInitialState(sampleStage, sampleParty, runSeed, runResolver),
  );

  const zone = stageEngine.currentZone(sampleStage, stageState);
  const battleSeed = stageEngine.deriveZoneBattleSeed(sampleStage, stageState);
  const rewardSeed = stageEngine.deriveZoneRewardSeed(sampleStage, stageState);

  // One stable item loadout per zone attempt (spec §5.10: unused items return to inventory at zone end — MVP-5 doesn't yet model that transfer, so each zone simply starts with a fresh 3-slot loadout, same as MVP-4's harness).
  const initialItems = useMemo<ItemBattleSlot[]>(() => [{ item: sampleItem, remainingUses: 2 }], [zone.id]);

  function restart() {
    const nextSeed = runSeed + 1;
    setRunSeed(nextSeed);
    setStageState(stageEngine.createInitialState(sampleStage, sampleParty, nextSeed, runResolver));
  }

  const devPanel = import.meta.env.DEV && (
    <div className="dev-panel">
      <p>
        runSeed: {stageState.runSeed} / zone: {stageState.currentZoneIndex + 1}/{sampleStage.zones.length} ({zone.id})
      </p>
    </div>
  );

  switch (stageState.phase) {
    case 'ZONE_BATTLE': {
      const enemies = stageEngine.resolveZoneEnemies(sampleStage, stageState, sampleEnemyDefinitionsById);
      return (
        <>
          <h1>StudyRise — MVP-5 ステージ進行 検証</h1>
          {devPanel}
          <ZoneBattlePanel
            key={zone.id}
            party={sampleParty}
            enemies={enemies}
            runState={stageState.runState}
            runResolver={runResolver}
            questions={sampleQuestions}
            spellsById={spellsById}
            initialItems={initialItems}
            seed={battleSeed}
            onWin={(survivorHp) => setStageState((s) => stageEngine.recordZoneWin(s, survivorHp))}
            onLose={() => setStageState((s) => stageEngine.recordZoneDefeat(s, sampleParty, runResolver))}
          />
        </>
      );
    }
    case 'ZONE_REWARD': {
      const isFinalZone = zone.isFinalZone;
      return (
        <>
          <h1>StudyRise — MVP-5 ステージ進行 検証</h1>
          {devPanel}
          <ZoneRewardPanel
            key={zone.id}
            party={sampleParty}
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
              setStageState((s) => stageEngine.completeZoneReward(sampleStage, s, sampleParty, runResolver))
            }
          />
        </>
      );
    }
    case 'INTER_ZONE_CHOICE': {
      return (
        <>
          <h1>StudyRise — MVP-5 ステージ進行 検証</h1>
          {devPanel}
          <InterZoneChoiceView
            onContinue={() =>
              setStageState((s) => stageEngine.continueToNextZone(sampleStage, s, sampleParty, runResolver))
            }
            onSelfReturn={() => setStageState((s) => stageEngine.selfReturn(s, sampleParty, runResolver))}
          />
        </>
      );
    }
    case 'STAGE_RESULT': {
      return (
        <>
          <h1>StudyRise — MVP-5 ステージ進行 検証</h1>
          <StageResultView result={stageState.result!} onRestart={restart} />
        </>
      );
    }
  }
}
