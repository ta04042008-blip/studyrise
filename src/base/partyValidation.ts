import type { CharacterDefinition } from '../engine/battle/BattleEngine.types';

/** Spec §4.1: 1〜3人, MVP has no bench/mid-stage swap. */
export const MIN_PARTY_SIZE = 1;
export const MAX_PARTY_SIZE = 3;

export interface PartyValidation {
  valid: boolean;
  errors: string[];
}

/** Pure validation (CLAUDE.md §9/§14 pattern) — never embedded in a component. */
export function validateParty(party: CharacterDefinition[]): PartyValidation {
  const errors: string[] = [];
  if (party.length < MIN_PARTY_SIZE) {
    errors.push('パーティを1人以上編成してください');
  }
  if (party.length > MAX_PARTY_SIZE) {
    errors.push(`パーティは最大${MAX_PARTY_SIZE}人までです`);
  }
  return { valid: errors.length === 0, errors };
}
