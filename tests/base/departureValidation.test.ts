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
});
