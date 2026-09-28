import type { PermanentState } from '../../engine/progression/ProgressionSystem.types';
import { createEmptyPermanentCharacterState } from '../../engine/progression/ProgressionSystem';
import { UPGRADE_MATERIAL_ID } from '../../config/progressionConfig';
import { sampleParty } from '../characters/sampleCharacters';
import { sampleStage } from '../stages/sampleStage';
import { sampleItem } from '../items/sampleItem';

/**
 * MVP-7 dev/sample PermanentState (user's explicit decision doc §20 initial
 * values: 200 coin / 10 upgrade material / 0 unlock crystal, plus 3x each
 * existing departure-item-catalog consumable). This is MVP verification
 * data only — not a production save (MVP-9's SaveSystem owns real
 * persistence). All three existing sample characters and the one existing
 * sample stage are unlocked from the start (regression safety — MVP-1〜6's
 * roster/stage select flows must keep working unchanged).
 */
export function createSampleInitialPermanentState(): PermanentState {
  return {
    characters: Object.fromEntries(sampleParty.map((c) => [c.id, createEmptyPermanentCharacterState(c.id)])),
    unlockedCharacterIds: sampleParty.map((c) => c.id),
    unlockedStageIds: [sampleStage.id],
    clearedStageIds: [],
    currency: 200,
    materials: { [UPGRADE_MATERIAL_ID]: 10 },
    rareUnlockResource: 0,
    inventory: {
      equipment: [],
      consumables: { [sampleItem.id]: 3 },
    },
  };
}
