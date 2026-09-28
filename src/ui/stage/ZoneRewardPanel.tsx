import { useMemo } from 'react';
import { RewardScreen } from '../roguelite/RewardScreen';
import { useRogueliteController } from '../../state/useRogueliteController';
import { createRogueliteEngine } from '../../engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../engine/random/RandomService';
import { rewardConfig } from '../../config/rewardConfig';
import type { CharacterDefinition, SpellDefinition } from '../../engine/battle/BattleEngine.types';
import type { RewardDefinition, RunState } from '../../engine/roguelite/RogueliteEngine.types';

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
}: ZoneRewardPanelProps) {
  const rogueliteEngine = useMemo(
    () =>
      createRogueliteEngine({
        spellsById,
        rewardDefinitions,
        config: rewardConfig,
        random: createRandomService(rewardSeed),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rewardSeed],
  );

  const rogueliteController = useRogueliteController({
    characters: party,
    runState,
    isRareRewardEvent,
    engine: rogueliteEngine,
    onComplete: onRunStateChange,
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
