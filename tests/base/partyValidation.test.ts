import { describe, expect, it } from 'vitest';
import { validateParty } from '../../src/base/partyValidation';
import { sampleParty } from '../../src/data/characters/sampleCharacters';

describe('validateParty (spec v0.6 §4.1: 1〜3人)', () => {
  it('rejects 0 characters', () => {
    expect(validateParty([]).valid).toBe(false);
  });

  it('accepts 1 character', () => {
    expect(validateParty([sampleParty[0]]).valid).toBe(true);
  });

  it('accepts 3 characters', () => {
    expect(validateParty(sampleParty).valid).toBe(true);
  });

  it('rejects 4+ characters', () => {
    const four = [...sampleParty, sampleParty[0]];
    expect(validateParty(four).valid).toBe(false);
  });
});
