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
 * (spec §3.3/§12.2). Combines party size, 出題範囲 shape, and the resulting
 * question count — never duplicated ad hoc inside a screen component
 * (CLAUDE.md §9).
 */
export function validateDeparture(draft: DepartureDraft, questionPool: readonly QuestionDefinition[]): DepartureValidation {
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

  return { valid: errors.length === 0, errors };
}
