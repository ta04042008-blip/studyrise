import { useMemo } from 'react';
import { RewardScreen } from '../roguelite/RewardScreen';
import { useRogueliteController } from '../../state/useRogueliteController';
import { createRogueliteEngine } from '../../engine/roguelite/RogueliteEngine';
import { createRandomService, createRandomServiceFromState } from '../../engine/random/RandomService';
import { rewardConfig } from '../../config/rewardConfig';
import type { CharacterDefinition, SpellDefinition } from '../../engine/battle/BattleEngine.types';
import type { RewardDefinition, RewardPhaseSnapshot, RunState } from '../../engine/roguelite/RogueliteEngine.types';

interface ZoneRewardPanelProps {
  party: CharacterDefinition[];
  isRareRewardEvent: boolean;
  runState: RunState;
  rewardSeed: number;
  spellsById: Record<string, SpellDefinition>;
  rewardDefinitions: RewardDefinition[];
  characterNameById: Record<string, string>;
  nextLabel: string;
  /**
   * Fired exactly once, when the last deployed character's reward has been
   * applied (mirrors useRogueliteController's own onComplete contract —
   * mid-phase per-character applies stay local to this component's
   * RogueliteEngine instance and never touch StageEngine's state).
   */
  onRunStateChange: (nextRunState: RunState) => void;
  /** Fired only once the reward phase is complete AND the player taps the completion banner's button. */
  onProceedFromReward: () => void;
  /** MVP-9: resume an in-progress reward phase instead of generating fresh candidates from `rewardSeed`. */
  restoreSnapshot?: RewardPhaseSnapshot;
  /** MVP-9: fired after initial candidate generation, reroll, and confirm/apply — see useRogueliteController's onSnapshotChange doc. */
  onSnapshotChange?: (snapshot: RewardPhaseSnapshot) => void;
}

/**
 * One Zone's reward phase (CLAUDE.md §9). Meant to be mounted with
 * `key={zoneId}` by its caller: `useRogueliteController`'s internal
 * `RewardPhaseSession` state is only initialized on mount (spec §9.4's
 * candidate generation happens exactly once per Zone's reward phase), so a
 * fresh mount per Zone is what guarantees a fresh session each time — see
 * StageEngine.ts's RunResolver doc comment for why this component owns its
 * own RogueliteEngine instance instead of receiving one.
 */
export function ZoneRewardPanel({
  party,
  isRareRewardEvent,
  runState,
  rewardSeed,
  spellsById,
  rewardDefinitions,
  characterNameById,
  nextLabel,
  onRunStateChange,
  onProceedFromReward,
  restoreSnapshot,
  onSnapshotChange,
}: ZoneRewardPanelProps) {
  // MVP-9: kept as its own memo (not just baked into rogueliteEngine) so
  // useRogueliteController can snapshot its cursor after each mutating call
  // — RogueliteEngine itself never exposes the `random` it was built with.
  const rewardRandom = useMemo(
    () => (restoreSnapshot ? createRandomServiceFromState(restoreSnapshot.randomState) : createRandomService(rewardSeed)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rewardSeed],
  );

  const rogueliteEngine = useMemo(
    () =>
      createRogueliteEngine({
        spellsById,
        rewardDefinitions,
        config: rewardConfig,
        random: rewardRandom,
      }),
    [rewardRandom, spellsById, rewardDefinitions],
  );

  const rogueliteController = useRogueliteController({
    characters: party,
    runState,
    isRareRewardEvent,
    engine: rogueliteEngine,
    random: rewardRandom,
    onComplete: onRunStateChange,
    restoreSnapshot,
    onSnapshotChange,
  });

  return (
    <RewardScreen
      controller={rogueliteController}
      characterNameById={characterNameById}
      onProceedToNextBattle={onProceedFromReward}
      nextLabel={nextLabel}
    />
  );
}
