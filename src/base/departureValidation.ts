import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';
import type { DepartureDraft } from './base.types';
import { validateParty } from './partyValidation';
import { filterQuestionsByScope, validateQuestionScope } from './questionScope';

export interface DepartureValidation {
  valid: boolean;
  errors: string[];
}

/**
 * The single source of truth for "can 出撃準備 proceed to 出撃確認/出撃"
 * (spec §3.3/§12.2). Combines party size, 出題範囲 shape, the resulting
 * question count, and (MVP-7) the persistent-Inventory quantity check for
 * 持ち込みアイテム3枠 — never duplicated ad hoc inside a screen component
 * (CLAUDE.md §9). `ownedQuantityById` is optional so callers/tests that
 * predate MVP-7's permanent Inventory (no consumable-quantity concept yet)
 * keep working unchanged.
 */
export function validateDeparture(
  draft: DepartureDraft,
  questionPool: readonly QuestionDefinition[],
  ownedQuantityById?: Record<string, number>,
): DepartureValidation {
  const errors: string[] = [];

  if (!draft.stageId) {
    errors.push('ステージが選択されていません');
  }

  errors.push(...validateParty(draft.party).errors);

  const scopeValidation = validateQuestionScope(draft.questionScope);
  errors.push(...scopeValidation.errors);

  if (scopeValidation.valid && filterQuestionsByScope(questionPool, draft.questionScope).length === 0) {
    errors.push('選択した出題範囲に問題がありません');
  }

  if (ownedQuantityById) {
    const selectedCounts: Record<string, number> = {};
    for (const itemId of draft.itemSlots) {
      if (!itemId) continue;
      selectedCounts[itemId] = (selectedCounts[itemId] ?? 0) + 1;
    }
    for (const [itemId, selectedCount] of Object.entries(selectedCounts)) {
      if (selectedCount > (ownedQuantityById[itemId] ?? 0)) {
        errors.push('持ち込みアイテムの選択数が所持数を超えています');
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
