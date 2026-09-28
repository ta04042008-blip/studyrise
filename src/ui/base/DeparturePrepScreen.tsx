import type { BattleItemSlotSelection, DepartureDraft, DepartureItemCatalogEntry, QuestionScopeSelection } from '../../base/base.types';
import type { DepartureValidation } from '../../base/departureValidation';
import type { SubjectCatalogEntry } from '../../base/questionScope';
import type { EquipmentDefinition, PermanentState } from '../../engine/progression/ProgressionSystem.types';
import { ItemSlotPicker } from './ItemSlotPicker';
import { QuestionScopeSelector } from './QuestionScopeSelector';
import { resolveEquippedName } from './equipmentDisplay';

interface DeparturePrepScreenProps {
  draft: DepartureDraft;
  questionCatalog: SubjectCatalogEntry[];
  itemCatalog: DepartureItemCatalogEntry[];
  /** Owned quantity per itemDefinitionId (MVP-7 decision doc §14) — passed straight through to ItemSlotPicker. */
  ownedQuantityById?: Record<string, number>;
  /** MVP-7: 装備確認 is now real, read-only equipped-gear display (spec §3.6 — still not editable from here; edit via the 装備 screen). */
  permanentState: PermanentState;
  equipmentDefsById: Record<string, EquipmentDefinition>;
  validation: DepartureValidation;
  onEditParty: () => void;
  onChangeItemSlots: (slots: BattleItemSlotSelection) => void;
  onChangeQuestionScope: (scope: QuestionScopeSelection) => void;
  onBack: () => void;
  onProceed: () => void;
}

/**
 * 出撃準備 (spec v0.6 §3.3): パーティ／装備確認（閲覧のみ）／持ち込みアイテム
 * ／出題範囲 の4項目。装備はMVP-7まで編集不可（user's explicit instruction）
 * — プレースホルダー表示のみで出撃を妨げない。
 */
export function DeparturePrepScreen({
  draft,
  questionCatalog,
  itemCatalog,
  ownedQuantityById,
  permanentState,
  equipmentDefsById,
  validation,
  onEditParty,
  onChangeItemSlots,
  onChangeQuestionScope,
  onBack,
  onProceed,
}: DeparturePrepScreenProps) {
  return (
    <div className="departure-prep-screen">
      <h1>出撃準備</h1>

      <section className="departure-prep-screen__section">
        <h2>パーティ</h2>
        <ol>
          {draft.party.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ol>
        <button type="button" onClick={onEditParty}>
          編成を変更
        </button>
      </section>

      <section className="departure-prep-screen__section">
        <h2>装備確認</h2>
        {draft.party.length === 0 ? (
          <p>パーティが編成されていません。</p>
        ) : (
          <ul>
            {draft.party.map((c) => {
              const characterState = permanentState.characters[c.id];
              return (
                <li key={c.id}>
                  {c.name}:{' '}
                  {characterState
                    ? (['weaponInstanceId', 'armorInstanceId', 'accessoryInstanceId'] as const)
                        .map((slotKey) => resolveEquippedName(characterState.equipped[slotKey], permanentState.inventory.equipment, equipmentDefsById))
                        .join(' / ')
                    : '未装備 / 未装備 / 未装備'}
                </li>
              );
            })}
          </ul>
        )}
        <p>装備の変更は拠点の「装備」画面から行えます（このStageの出撃には影響しません）。</p>
      </section>

      <section className="departure-prep-screen__section">
        <h2>持ち込みアイテム</h2>
        <ItemSlotPicker
          catalog={itemCatalog}
          slots={draft.itemSlots}
          onChange={onChangeItemSlots}
          ownedQuantityById={ownedQuantityById}
        />
      </section>

      <section className="departure-prep-screen__section">
        <h2>出題範囲</h2>
        <QuestionScopeSelector catalog={questionCatalog} scope={draft.questionScope} onChange={onChangeQuestionScope} />
      </section>

      {!validation.valid && (
        <ul className="base-validation-errors">
          {validation.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      <div className="base-actions">
        <button type="button" onClick={onBack}>
          ステージ選択へ戻る
        </button>
        <button type="button" disabled={!validation.valid} onClick={onProceed}>
          出撃確認へ
        </button>
      </div>
    </div>
  );
}
