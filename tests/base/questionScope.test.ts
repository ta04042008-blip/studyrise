import { describe, expect, it } from 'vitest';
import {
  deriveQuestionCatalog,
  filterQuestionsByScope,
  isUnitSelected,
  setFieldSelected,
  setSubjectSelected,
  toggleUnit,
  validateQuestionScope,
} from '../../src/base/questionScope';
import { sampleQuestions } from '../../src/data/questions/sampleQuestions';

const catalog = deriveQuestionCatalog(sampleQuestions);

describe('deriveQuestionCatalog', () => {
  it('derives 教科→分野→単元 from the question pool (spec §12.2)', () => {
    const subjects = catalog.map((c) => c.subject).sort();
    expect(subjects).toEqual(['数学', '英語'].sort());
    const math = catalog.find((c) => c.subject === '数学')!;
    expect(math.fields.map((f) => f.field).sort()).toEqual(['図形', '数の性質', '数量関係', '計算'].sort());
  });
});

describe('toggleUnit / isUnitSelected', () => {
  it('adds then removes a unit', () => {
    const ref = { subject: '数学', field: '計算', unit: '四則演算' };
    let scope = toggleUnit([], ref);
    expect(isUnitSelected(scope, ref)).toBe(true);
    scope = toggleUnit(scope, ref);
    expect(isUnitSelected(scope, ref)).toBe(false);
  });
});

describe('setSubjectSelected / setFieldSelected (spec §12.2 教科単位/分野単位全選択)', () => {
  it('selects every unit under a subject, and clears it back out', () => {
    const selected = setSubjectSelected([], catalog, '数学', true);
    const mathUnits = catalog.find((c) => c.subject === '数学')!.fields.flatMap((f) => f.units);
    expect(selected.filter((s) => s.subject === '数学')).toHaveLength(mathUnits.length);

    const cleared = setSubjectSelected(selected, catalog, '数学', false);
    expect(cleared.filter((s) => s.subject === '数学')).toHaveLength(0);
  });

  it('selects every unit under one field only', () => {
    const selected = setFieldSelected([], catalog, '数学', '計算', true);
    expect(selected.every((s) => s.subject === '数学' && s.field === '計算')).toBe(true);
    expect(selected.length).toBeGreaterThan(0);
  });
});

describe('validateQuestionScope (spec §12.2: 最低2教科、各教科1単元以上)', () => {
  it('rejects fewer than 2 subjects', () => {
    const scope = [{ subject: '数学', field: '計算', unit: '四則演算' }];
    expect(validateQuestionScope(scope).valid).toBe(false);
  });

  it('accepts 2+ subjects, each with at least 1 unit', () => {
    const scope = [
      { subject: '数学', field: '計算', unit: '四則演算' },
      { subject: '英語', field: '語彙', unit: '基本単語' },
    ];
    expect(validateQuestionScope(scope).valid).toBe(true);
  });

  it('does not cap the number of selected units', () => {
    const allUnits = setSubjectSelected(setSubjectSelected([], catalog, '数学', true), catalog, '英語', true);
    expect(validateQuestionScope(allUnits).valid).toBe(true);
  });
});

describe('filterQuestionsByScope (Question scope filtering)', () => {
  it('returns only questions matching a selected unit', () => {
    const scope = [{ subject: '数学', field: '計算', unit: '四則演算' }];
    const filtered = filterQuestionsByScope(sampleQuestions, scope);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((q) => q.subject === '数学' && q.field === '計算' && q.unit === '四則演算')).toBe(true);
  });

  it('returns an empty array for an empty scope', () => {
    expect(filterQuestionsByScope(sampleQuestions, [])).toHaveLength(0);
  });

  it('returns no questions for a unit that does not exist in the pool', () => {
    const scope = [{ subject: '数学', field: '存在しない分野', unit: '存在しない単元' }];
    expect(filterQuestionsByScope(sampleQuestions, scope)).toHaveLength(0);
  });
});
