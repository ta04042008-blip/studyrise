import type { StageLaunchConfig } from '../base/base.types';
import { sampleParty } from './characters/sampleCharacters';
import { sampleStage } from './stages/sampleStage';
import { sampleQuestionsCoreFive } from './questions/sampleQuestions';
import { sampleItem } from './items/sampleItem';

/**
 * Test/dev factory only (user's explicit MVP-6 instruction) — never used as
 * an implicit production fallback. Production `StageLaunchConfig`s are
 * always built from a confirmed `DepartureDraft` via
 * `src/base/buildStageLaunchConfig.ts`. Existing MVP-1〜9 regression tests
 * use this to keep exercising sample content without driving the base UI;
 * it deliberately keeps using only `sampleQuestionsCoreFive` (not the full
 * MVP-10 50-question bank) so those tests' hardcoded question-text→answer
 * maps stay valid (user's explicit MVP-10 instruction not to disturb
 * existing test fixtures).
 */
export function createSampleStageLaunchConfig(runSeed = 1): StageLaunchConfig {
  return {
    party: sampleParty,
    stage: sampleStage,
    questions: sampleQuestionsCoreFive,
    battleItems: [{ item: sampleItem, remainingUses: 2 }],
    runSeed,
  };
}
