import { describe, expect, it } from 'vitest';
import { validateDeparture } from '../../src/base/departureValidation';
import { createEmptyDepartureDraft } from '../../src/base/base.types';
import { sampleParty } from '../../src/data/characters/sampleCharacters';
import { sampleQuestions } from '../../src/data/questions/sampleQuestions';
import { sampleStage } from '../../src/data/stages/sampleStage';

const validScope = [
  { subject: '数学', field: '計算', unit: '四則演算' },
  { subject: '英語', field: '語彙', unit: '基本単語' },
];

describe('validateDeparture (spec v0.6 §3.3/§12.2)', () => {
  it('rejects an empty draft (no stage, no party, no scope)', () => {
    expect(validateDeparture(createEmptyDepartureDraft(), sampleQuestions).valid).toBe(false);
  });

  it('accepts a fully-filled draft', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0]],
      questionScope: validScope,
    };
    expect(validateDeparture(draft, sampleQuestions).valid).toBe(true);
  });

  it('rejects fewer than 2 selected subjects even with a valid party/stage', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0]],
      questionScope: [{ subject: '数学', field: '計算', unit: '四則演算' }],
    };
    expect(validateDeparture(draft, sampleQuestions).valid).toBe(false);
  });

  it('rejects departure when the selected scope matches zero questions', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0]],
      questionScope: [
        { subject: '数学', field: '存在しない分野', unit: '存在しない単元' },
        { subject: '英語', field: '存在しない分野', unit: '存在しない単元' },
      ],
    };
    const result = validateDeparture(draft, sampleQuestions);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('問題がありません'))).toBe(true);
  });

  describe('ownedQuantityById (MVP-7 decision doc §14 — 3slot選択時の所持数validation)', () => {
    function baseDraft() {
      return { ...createEmptyDepartureDraft(), stageId: sampleStage.id, party: [sampleParty[0]], questionScope: validScope };
    }

    it('is unaffected when ownedQuantityById is omitted (pre-MVP-7 callers)', () => {
      const draft = { ...baseDraft(), itemSlots: ['item_x', 'item_x', 'item_x'] as [string, string, string] };
      expect(validateDeparture(draft, sampleQuestions).valid).toBe(true);
    });

    it('accepts a selection at or under the owned quantity, including the same item across multiple slots', () => {
      const draft = { ...baseDraft(), itemSlots: ['item_x', 'item_x', null] as [string, string | null, string | null] };
      expect(validateDeparture(draft, sampleQuestions, { item_x: 2 }).valid).toBe(true);
    });

    it('rejects a selection that exceeds the owned quantity', () => {
      const draft = { ...baseDraft(), itemSlots: ['item_x', 'item_x', 'item_x'] as [string, string, string] };
      const result = validateDeparture(draft, sampleQuestions, { item_x: 2 });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('所持数'))).toBe(true);
    });
  });
});
