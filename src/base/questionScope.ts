import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';
import type { QuestionScopeSelection, QuestionUnitRef } from './base.types';

export interface SubjectCatalogEntry {
  subject: string;
  fields: { field: string; units: string[] }[];
}

/**
 * Derives the selectable 教科→分野→単元 tree straight from whatever
 * QuestionDefinitions currently exist (user instruction: MVP-6 has no
 * separate curriculum table yet — derive it from content data). Pure and
 * order-stable (first-seen order), so it renders the same tree on every
 * call for the same pool.
 */
export function deriveQuestionCatalog(pool: readonly QuestionDefinition[]): SubjectCatalogEntry[] {
  const bySubject = new Map<string, Map<string, Set<string>>>();
  for (const q of pool) {
    if (!bySubject.has(q.subject)) bySubject.set(q.subject, new Map());
    const byField = bySubject.get(q.subject)!;
    if (!byField.has(q.field)) byField.set(q.field, new Set());
    byField.get(q.field)!.add(q.unit);
  }
  return Array.from(bySubject.entries()).map(([subject, byField]) => ({
    subject,
    fields: Array.from(byField.entries()).map(([field, units]) => ({ field, units: Array.from(units) })),
  }));
}

function unitKey(ref: QuestionUnitRef): string {
  return `${ref.subject}\u0000${ref.field}\u0000${ref.unit}`;
}

export function isUnitSelected(scope: QuestionScopeSelection, ref: QuestionUnitRef): boolean {
  const key = unitKey(ref);
  return scope.some((s) => unitKey(s) === key);
}

/** Toggles exactly one 単元 on/off (spec §12.2 単元個別ON/OFF). */
export function toggleUnit(scope: QuestionScopeSelection, ref: QuestionUnitRef): QuestionScopeSelection {
  return isUnitSelected(scope, ref) ? scope.filter((s) => unitKey(s) !== unitKey(ref)) : [...scope, ref];
}

/** Spec §12.2 教科単位全選択/全解除. */
export function setSubjectSelected(
  scope: QuestionScopeSelection,
  catalog: SubjectCatalogEntry[],
  subject: string,
  selected: boolean,
): QuestionScopeSelection {
  const withoutSubject = scope.filter((s) => s.subject !== subject);
  if (!selected) return withoutSubject;
  const entry = catalog.find((c) => c.subject === subject);
  if (!entry) return withoutSubject;
  const allUnits = entry.fields.flatMap((f) => f.units.map((unit) => ({ subject, field: f.field, unit })));
  return [...withoutSubject, ...allUnits];
}

/** Spec §12.2 分野単位全選択/全解除. */
export function setFieldSelected(
  scope: QuestionScopeSelection,
  catalog: SubjectCatalogEntry[],
  subject: string,
  field: string,
  selected: boolean,
): QuestionScopeSelection {
  const withoutField = scope.filter((s) => !(s.subject === subject && s.field === field));
  if (!selected) return withoutField;
  const subjectEntry = catalog.find((c) => c.subject === subject);
  const fieldEntry = subjectEntry?.fields.find((f) => f.field === field);
  if (!fieldEntry) return withoutField;
  return [...withoutField, ...fieldEntry.units.map((unit) => ({ subject, field, unit }))];
}

/** Spec §12.2: 出撃には最低2教科、選択した各教科に最低1単元が必要。 */
export const MIN_SELECTED_SUBJECTS = 2;

export interface QuestionScopeValidation {
  valid: boolean;
  errors: string[];
}

export function validateQuestionScope(scope: QuestionScopeSelection): QuestionScopeValidation {
  const errors: string[] = [];
  const subjects = new Set(scope.map((s) => s.subject));
  if (subjects.size < MIN_SELECTED_SUBJECTS) {
    errors.push(`教科は最低${MIN_SELECTED_SUBJECTS}つ選択してください（現在${subjects.size}）`);
  }
  // Every scope entry IS one selected unit, so "選択した各教科に1単元以上"
  // (spec §12.2) holds automatically once a subject appears at all — no
  // separate per-subject unit-count check is needed.
  return { valid: errors.length === 0, errors };
}

/** Filters a question pool down to exactly the selected 教科＋分野＋単元 (base-layer only — QuestionEngine itself is never touched, per user instruction). */
export function filterQuestionsByScope(
  pool: readonly QuestionDefinition[],
  scope: QuestionScopeSelection,
): QuestionDefinition[] {
  if (scope.length === 0) return [];
  const keys = new Set(scope.map(unitKey));
  return pool.filter((q) => keys.has(unitKey({ subject: q.subject, field: q.field, unit: q.unit })));
}
