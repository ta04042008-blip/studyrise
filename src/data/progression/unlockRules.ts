import type { CharacterUnlockRule, StageUnlockRule } from '../../engine/progression/ProgressionSystem.types';

/**
 * PLACEHOLDER content — MVP-7's sample content is exactly one Area/Stage and
 * three characters, all unlocked by default (regression safety, user's
 * explicit instruction not to gate the existing MVP-1〜6 sample roster/
 * stage). There is nothing left to unlock yet, so these lists are
 * intentionally empty; the rule TYPES and reconcileStageResult's evaluation
 * logic are still exercised directly via test fixtures (user's explicit
 * instruction — "unlock logic はtest fixtureで検証して構いません").
 * STAGE_FIRST_CLEAR / UNLOCK_RESOURCE are the only two rule kinds MVP-7
 * implements (AREA_CLEAR/SPECIAL_CONDITION/STORY are future work, spec §10.7
 * decision doc §12).
 */
export const sampleCharacterUnlockRules: CharacterUnlockRule[] = [];

export const sampleStageUnlockRules: StageUnlockRule[] = [];
