import type { QuestionScopeSelection } from '../../base/base.types';
import { isUnitSelected, setFieldSelected, setSubjectSelected, toggleUnit, type SubjectCatalogEntry } from '../../base/questionScope';

interface QuestionScopeSelectorProps {
  catalog: SubjectCatalogEntry[];
  scope: QuestionScopeSelection;
  onChange: (scope: QuestionScopeSelection) => void;
}

/**
 * 出題範囲 選択 (spec §12.2): 教科→分野→単元 の階層を維持し、教科単位全選択、
 * 分野単位全選択、単元個別ON/OFFをすべて提供する。純粋なローカル表示ロジック
 * のみで、実際の選択状態計算（全選択/全解除の判定・トグル）は
 * src/base/questionScope.ts の純粋関数に委譲する（CLAUDE.md §9）。
 */
export function QuestionScopeSelector({ catalog, scope, onChange }: QuestionScopeSelectorProps) {
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

              return (
                <div key={fieldEntry.field} className="question-scope-selector__field">
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
                  <ul className="question-scope-selector__units">
                    {fieldEntry.units.map((unit) => {
                      const ref = { subject: subjectEntry.subject, field: fieldEntry.field, unit };
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
                </div>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
