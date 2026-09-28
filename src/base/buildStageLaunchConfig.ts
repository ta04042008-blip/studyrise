import type { ItemBattleSlot } from '../engine/battle/BattleEngine.types';
import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';
import type { StageDefinition } from '../engine/stage/StageEngine.types';
import type { DepartureDraft, DepartureItemCatalogEntry, StageLaunchConfig } from './base.types';
import { filterQuestionsByScope } from './questionScope';

/**
 * The only place a confirmed `DepartureDraft` turns into a `StageLaunchConfig`
 * (CLAUDE.md §21 — no other MVP-6 code path may synthesize one). Pure: no
 * randomness (`runSeed` is supplied by the caller, spec §18.14), no engine
 * calls — just reshaping already-chosen base state into StageEngine's
 * required input shape.
 */
/**
 * Resolves the 3-slot departure item selection (catalog ids, possibly with
 * empty slots) into full battle-ready `ItemBattleSlot`s at their default
 * use count — shared by a fresh departure (`buildStageLaunchConfig`) and a
 * resumed Run (`buildResumedStageLaunchConfig`, MVP-9), since both start
 * from the same kind of selection and need the exact same resolution.
 */
export function resolveBattleItemsFromSlots(
  itemSlots: DepartureDraft['itemSlots'],
  itemCatalogById: Record<string, DepartureItemCatalogEntry>,
): ItemBattleSlot[] {
  return itemSlots
    .filter((itemId): itemId is string => itemId !== null)
    .map((itemId) => itemCatalogById[itemId])
    .filter((entry): entry is DepartureItemCatalogEntry => entry !== undefined)
    .map((entry) => ({ item: entry.item, remainingUses: entry.defaultUses }));
}

export function buildStageLaunchConfig(
  draft: DepartureDraft,
  stage: StageDefinition,
  questionPool: readonly QuestionDefinition[],
  itemCatalogById: Record<string, DepartureItemCatalogEntry>,
  runSeed: number,
): StageLaunchConfig {
  return {
    party: draft.party,
    stage,
    questions: filterQuestionsByScope(questionPool, draft.questionScope),
    battleItems: resolveBattleItemsFromSlots(draft.itemSlots, itemCatalogById),
    runSeed,
  };
}
