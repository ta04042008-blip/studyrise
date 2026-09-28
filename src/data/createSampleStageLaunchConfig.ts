import type { StageLaunchConfig } from '../base/base.types';
import { sampleParty } from './characters/sampleCharacters';
import { sampleStage } from './stages/sampleStage';
import { sampleQuestions } from './questions/sampleQuestions';
import { sampleItem } from './items/sampleItem';

/**
 * Test/dev factory only (user's explicit MVP-6 instruction) — never used as
 * an implicit production fallback. Production `StageLaunchConfig`s are
 * always built from a confirmed `DepartureDraft` via
 * `src/base/buildStageLaunchConfig.ts`. Existing MVP-5 tests use this to
 * keep exercising the full sample content (party/stage/questions) without
 * driving the new base UI.
 */
export function createSampleStageLaunchConfig(runSeed = 1): StageLaunchConfig {
  return {
    party: sampleParty,
    stage: sampleStage,
    questions: sampleQuestions,
    battleItems: [{ item: sampleItem, remainingUses: 2 }],
    runSeed,
  };
}
