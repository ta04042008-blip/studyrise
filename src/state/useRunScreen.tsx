import { useCallback, useMemo, useState } from 'react';
import { BattleScreen } from '../ui/battle/BattleScreen';
import { RewardScreen } from '../ui/roguelite/RewardScreen';
import { useBattleController } from './useBattleController';
import { useRogueliteController } from './useRogueliteController';
import { createRogueliteEngine } from '../engine/roguelite/RogueliteEngine';
import type { RunState } from '../engine/roguelite/RogueliteEngine.types';
import { sampleParty } from '../data/characters/sampleCharacters';
import { sampleEnemyZone } from '../data/enemies/sampleEnemies';
import { sampleQuestions } from '../data/questions/sampleQuestions';
import { sampleSpell } from '../data/spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../data/spells/sampleAdditionalSpells';
import { sampleItem } from '../data/items/sampleItem';
import { sampleRewardDefinitions } from '../data/roguelite/sampleRewardDefinitions';
import { rewardConfig } from '../config/rewardConfig';
import { createRandomService } from '../engine/random/RandomService';
import type { ItemBattleSlot, SpellDefinition } from '../engine/battle/BattleEngine.types';

const spellsById: Record<string, SpellDefinition> = Object.fromEntries(
  [sampleSpell, sampleAdditionalSpellIce, sampleAdditionalSpellHeal].map((s) => [s.id, s]),
);

const characterNameById: Record<string, string> = Object.fromEntries(sampleParty.map((c) => [c.id, c.name]));

/**
 * MVP-4 standalone verification harness — chains Battle → Reward → Battle
 * in memory (spec brief: "1ゾーン戦闘をクリアした後に報酬画面へ移り、報酬生成
 * →リロール→1つ選択→効果適用→次の戦闘へ引き継げるところまで"). Real
 * multi-zone/stage progression, base, permanent growth, equipment and save
 * are all MVP-5+ (CLAUDE.md §21) — deliberately not implemented here.
 *
 * No BattleEngine REWARD phase exists: RogueliteEngine only ever runs
 * between one BattleEngine instance's BATTLE_END(win) and the next
 * instance's construction (see BattleEngine.types.ts's BattlePhase doc).
 */
export function useRunScreen() {
  const [zoneIndex, setZoneIndex] = useState(0);
  const [phaseKind, setPhaseKind] = useState<'battle' | 'reward'>('battle');
  const [isRareRewardEvent, setRareRewardEvent] = useState(false); // dev-only harness toggle (spec: real trigger rule is not MVP-4's job)

  // One RogueliteEngine (and its one RandomService stream) per zone attempt —
  // shared by both the pre-battle stat resolution and the post-battle
  // reward phase, so a reroll's randomness is never perturbed by anything
  // battle-related and vice versa (CLAUDE.md §10).
  const rogueliteEngine = useMemo(
    () =>
      createRogueliteEngine({
        spellsById,
        rewardDefinitions: sampleRewardDefinitions,
        config: rewardConfig,
        random: createRandomService(zoneIndex * 7919 + 1),
      }),
    [zoneIndex],
  );

  const [runState, setRunState] = useState<RunState>(() => rogueliteEngine.createInitialRunState(sampleParty));

  const battleInputs = rogueliteEngine.resolveBattleInputsForRun(sampleParty, runState);
  const initialItems = useMemo<ItemBattleSlot[]>(() => [{ item: sampleItem, remainingUses: 2 }], [zoneIndex]);

  const battleController = useBattleController({
    players: battleInputs.players,
    enemies: sampleEnemyZone,
    questions: sampleQuestions,
    spellsById,
    initialItems,
    knownSpellsByPlayerId: battleInputs.knownSpellsByPlayerId,
    playerCommandModifiers: battleInputs.playerCommandModifiers,
    initialHpByPlayerId: battleInputs.initialHpByPlayerId,
    seed: zoneIndex * 1000 + 1,
  });

  const rogueliteController = useRogueliteController({
    characters: sampleParty,
    runState,
    isRareRewardEvent,
    engine: rogueliteEngine,
    onComplete: setRunState,
  });

  const handleProceedToReward = useCallback(() => {
    // Spec §2.4/§8: surviving characters carry their HP into the next zone
    // (MP alone resets to 0, already true — BattleEngine always starts a
    // fresh actor's MP at 0 regardless of initialHpByPlayerId). This is the
    // one point where the just-finished battle's real ending HP must be
    // written into RunState — RogueliteEngine's reward application (HP
    // boost/heal) and resolveBattleInputsForRun both read
    // runState.currentHpByCharacterId as their starting point, so if this
    // snapshot is skipped, every zone would silently restart at full HP
    // instead of carrying real damage forward. KO'd characters carry over
    // at 0 — MVP-4 does not invent a revival percentage (spec §8 leaves it
    // unconfirmed), so they simply remain KO'd going into the reward phase
    // and the next battle, exactly like an un-implemented rule should.
    setRunState((prev) => ({
      ...prev,
      currentHpByCharacterId: Object.fromEntries(battleController.state.players.map((p) => [p.id, p.currentHp])),
    }));
    setPhaseKind('reward');
  }, [battleController]);

  const handleProceedToNextBattle = useCallback(() => {
    setZoneIndex((z) => z + 1);
    setPhaseKind('battle');
  }, []);

  const handleResetAfterDefeat = useCallback(() => {
    // Spec §9.8: defeat wipes the roguelite build, same as clear/self-return.
    setRunState((prev) => rogueliteEngine.resetRunBuild(prev, sampleParty));
    setZoneIndex((z) => z + 1);
    setPhaseKind('battle');
  }, [rogueliteEngine]);

  const devPanel = import.meta.env.DEV && (
    <div className="dev-panel">
      <label>
        <input
          type="checkbox"
          checked={isRareRewardEvent}
          onChange={(e) => setRareRewardEvent(e.target.checked)}
          disabled={phaseKind === 'reward'}
        />
        希少報酬イベント（次の報酬フェーズを4候補にする）
      </label>
    </div>
  );

  if (phaseKind === 'battle') {
    const { state } = battleController;
    return (
      <>
        <h1>StudyRise — MVP-4 ローグライト報酬 検証</h1>
        {devPanel}
        <BattleScreen controller={battleController} />
        {state.phase === 'BATTLE_END' && state.outcome === 'win' && (
          <button type="button" onClick={handleProceedToReward}>
            ゾーンクリア → 報酬へ
          </button>
        )}
        {state.phase === 'BATTLE_END' && state.outcome === 'lose' && (
          <button type="button" onClick={handleResetAfterDefeat}>
            敗北 — ビルドをリセットしてやり直す
          </button>
        )}
      </>
    );
  }

  return (
    <>
      <h1>StudyRise — MVP-4 ローグライト報酬 検証</h1>
      {devPanel}
      <RewardScreen
        controller={rogueliteController}
        characterNameById={characterNameById}
        onProceedToNextBattle={handleProceedToNextBattle}
      />
    </>
  );
}
