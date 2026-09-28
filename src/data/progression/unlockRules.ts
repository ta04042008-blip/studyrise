import type { CharacterUnlockRule, StageUnlockRule } from '../../engine/progression/ProgressionSystem.types';
import { sampleStage } from '../stages/sampleStage';
import { stageHaruka02 } from '../stages/stageHaruka02';
import { stageHaruka03 } from '../stages/stageHaruka03';

/**
 * MVP-10 official content — Stage1初回クリア→Stage2 unlock、Stage2初回クリア
 * →Stage3 unlockという第1エリア進行(user's explicit MVP-10 instruction §7)。
 * Expressed purely as data (STAGE_FIRST_CLEAR rules) — StageEngine gains no
 * per-Stage if文; ProgressionSystem.reconcileStageResult evaluates these
 * generically. All 3 MVP-10 characters remain unlocked by default
 * (regression safety — no CharacterUnlockRule needed yet).
 */
export const sampleCharacterUnlockRules: CharacterUnlockRule[] = [];

export const sampleStageUnlockRules: StageUnlockRule[] = [
  { type: 'STAGE_FIRST_CLEAR', stageId: sampleStage.id, unlocksStageIds: [stageHaruka02.id] },
  { type: 'STAGE_FIRST_CLEAR', stageId: stageHaruka02.id, unlocksStageIds: [stageHaruka03.id] },
];
