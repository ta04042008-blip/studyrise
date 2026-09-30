import { useState } from 'react';
import type { QuestionScopeSelection } from '../../base/base.types';
import { isUnitSelected, setFieldSelected, setSubjectSelected, toggleUnit, type SubjectCatalogEntry } from '../../base/questionScope';

interface QuestionScopeSelectorProps {
  catalog: SubjectCatalogEntry[];
  scope: QuestionScopeSelection;
  onChange: (scope: QuestionScopeSelection) => void;
}

interface ActiveField {
  subject: string;
  field: string;
}

/**
 * 出題範囲 選択 (spec §12.2): 教科→分野→単元 の階層を維持し、教科単位全選択、
 * 分野単位全選択、単元個別ON/OFFをすべて提供する。単元一覧は分野ごとの小窓へ
 * まとめ、正式問題バンクの単元数が増えても出撃準備画面を縦長にしすぎない。
 * 選択状態の計算・トグルは src/base/questionScope.ts の純粋関数へ委譲する。
 */
export function QuestionScopeSelector({ catalog, scope, onChange }: QuestionScopeSelectorProps) {
  const [activeField, setActiveField] = useState<ActiveField | null>(null);

  const activeSubjectEntry = activeField
    ? catalog.find((entry) => entry.subject === activeField.subject)
    : undefined;
  const activeFieldEntry = activeSubjectEntry?.fields.find((entry) => entry.field === activeField?.field);
  const activeFieldRefs = activeField && activeFieldEntry
    ? activeFieldEntry.units.map((unit) => ({ subject: activeField.subject, field: activeField.field, unit }))
    : [];
  const activeSelectedCount = activeFieldRefs.filter((ref) => isUnitSelected(scope, ref)).length;

  return (
    <div className="question-scope-selector">
      {catalog.map((subjectEntry) => {
        const allUnitsInSubject = subjectEntry.fields.flatMap((f) =>
          f.units.map((unit) => ({ subject: subjectEntry.subject, field: f.field, unit })),
        );
        const subjectFullySelected =
          allUnitsInSubject.length > 0 && allUnitsInSubject.every((ref) => isUnitSelected(scope, ref));

        return (
          <fieldset key={subjectEntry.subject} className="question-scope-selector__subject">
            <legend>
              <label>
                <input
                  type="checkbox"
                  checked={subjectFullySelected}
                  onChange={(e) => onChange(setSubjectSelected(scope, catalog, subjectEntry.subject, e.target.checked))}
                />
                {subjectEntry.subject}（教科単位選択）
              </label>
            </legend>

            {subjectEntry.fields.map((fieldEntry) => {
              const fieldRefs = fieldEntry.units.map((unit) => ({
                subject: subjectEntry.subject,
                field: fieldEntry.field,
                unit,
              }));
              const fieldFullySelected = fieldRefs.length > 0 && fieldRefs.every((ref) => isUnitSelected(scope, ref));
              const selectedCount = fieldRefs.filter((ref) => isUnitSelected(scope, ref)).length;

              return (
                <div key={fieldEntry.field} className="question-scope-selector__field">
                  <div className="question-scope-selector__field-row">
                    <label>
                      <input
                        type="checkbox"
                        checked={fieldFullySelected}
                        onChange={(e) =>
                          onChange(setFieldSelected(scope, catalog, subjectEntry.subject, fieldEntry.field, e.target.checked))
                        }
                      />
                      {fieldEntry.field}（分野単位選択）
                    </label>
                    <button
                      type="button"
                      className="question-scope-selector__open-units"
                      aria-label={`${fieldEntry.field}の単元を選択`}
                      onClick={() => setActiveField({ subject: subjectEntry.subject, field: fieldEntry.field })}
                    >
                      単元を選択
                      <span className="question-scope-selector__selection-count">
                        {selectedCount} / {fieldRefs.length}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </fieldset>
        );
      })}

      {activeField && activeFieldEntry && (
        <div
          className="question-scope-selector__modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveField(null);
          }}
        >
          <div
            className="question-scope-selector__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="question-scope-unit-dialog-title"
          >
            <div className="question-scope-selector__modal-header">
              <div>
                <p className="question-scope-selector__modal-subject">{activeField.subject}</p>
                <h3 id="question-scope-unit-dialog-title">{activeField.field}の単元</h3>
              </div>
              <button
                type="button"
                className="question-scope-selector__modal-close"
                aria-label="単元選択を閉じる"
                onClick={() => setActiveField(null)}
              >
                ×
              </button>
            </div>

            <p className="question-scope-selector__modal-count">
              選択中 {activeSelectedCount} / {activeFieldEntry.units.length}
            </p>

            <ul className="question-scope-selector__units">
              {activeFieldEntry.units.map((unit) => {
                const ref = { subject: activeField.subject, field: activeField.field, unit };
                return (
                  <li key={unit}>
                    <label>
                      <input
                        type="checkbox"
                        checked={isUnitSelected(scope, ref)}
                        onChange={() => onChange(toggleUnit(scope, ref))}
                      />
                      {unit}
                    </label>
                  </li>
                );
              })}
            </ul>

            <div className="question-scope-selector__modal-actions">
              <button
                type="button"
                onClick={() => onChange(setFieldSelected(scope, catalog, activeField.subject, activeField.field, true))}
              >
                すべて選択
              </button>
              <button
                type="button"
                onClick={() => onChange(setFieldSelected(scope, catalog, activeField.subject, activeField.field, false))}
              >
                すべて解除
              </button>
              <button type="button" onClick={() => setActiveField(null)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
