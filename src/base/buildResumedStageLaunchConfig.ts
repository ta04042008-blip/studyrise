import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';
import type { StageDefinition } from '../engine/stage/StageEngine.types';
import type { RunSavePayload } from '../engine/save/RunSave';
import type { DepartureItemCatalogEntry, StageLaunchConfig } from './base.types';
import { filterQuestionsByScope } from './questionScope';
import { resolveBattleItemsFromSlots } from './buildStageLaunchConfig';

/**
 * MVP-9: the resume-time counterpart to `buildStageLaunchConfig` — turns a
 * saved `RunSavePayload` back into the `StageLaunchConfig` shape
 * `useStageController` needs, WITHOUT re-deriving anything that was
 * confirmed at departure time:
 *
 *  - `resolvedParty` is used as-is (never re-resolved from the current
 *    PermanentState — spec §18.17/user's explicit MVP-9 instruction §12: a
 *    Stage attempt's battle stats are fixed at departure and must never
 *    drift on resume).
 *  - `questions`/`battleItems` ARE re-derived (from `questionScope`/
 *    `itemSlotSelection` against the current content catalogs) — these are
 *    plain content lookups with no randomness and no confirmed-value risk,
 *    so re-deriving them avoids duplicating question/item content in the
 *    save (CLAUDE.md §15).
 *  - `runSeed` comes from the saved `stageRunState`, not a freshly assigned
 *    one — resuming must never mint a new seed.
 */
export function buildResumedStageLaunchConfig(
  payload: RunSavePayload,
  stage: StageDefinition,
  questionPool: readonly QuestionDefinition[],
  itemCatalogById: Record<string, DepartureItemCatalogEntry>,
): StageLaunchConfig {
  return {
    party: payload.resolvedParty,
    stage,
    questions: filterQuestionsByScope(questionPool, payload.questionScope),
    battleItems: resolveBattleItemsFromSlots(payload.itemSlotSelection, itemCatalogById),
    runSeed: payload.stageRunState.runSeed,
  };
}
