import type { DepartureDraft, DepartureItemCatalogEntry } from '../../base/base.types';
import type { QuestionDefinition } from '../../engine/question/QuestionEngine.types';
import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import { filterQuestionsByScope } from '../../base/questionScope';

interface DepartureConfirmScreenProps {
  draft: DepartureDraft;
  stage: StageDefinition;
  questionPool: readonly QuestionDefinition[];
  itemCatalogById: Record<string, DepartureItemCatalogEntry>;
  confirming: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

/** 出撃確認 (spec v0.6 §3.3): 選択内容のサマリ表示 + 出撃（二重タップ防止, CLAUDE.md §13）。 */
export function DepartureConfirmScreen({
  draft,
  stage,
  questionPool,
  itemCatalogById,
  confirming,
  onConfirm,
  onBack,
}: DepartureConfirmScreenProps) {
  const matchingQuestionCount = filterQuestionsByScope(questionPool, draft.questionScope).length;
  const selectedSubjects = Array.from(new Set(draft.questionScope.map((s) => s.subject)));

  return (
    <div className="departure-confirm-screen">
      <h1>出撃確認</h1>
      <p>ステージ: {stage.name}</p>

      <section>
        <h2>パーティ</h2>
        <ol>
          {draft.party.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ol>
      </section>

      <section>
        <h2>持ち込みアイテム</h2>
        <ul>
          {draft.itemSlots.map((itemId, index) => (
            <li key={index}>{itemId ? (itemCatalogById[itemId]?.item.name ?? itemId) : '（空）'}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>出題範囲</h2>
        <p>教科: {selectedSubjects.join('、')}</p>
        <p>対象問題数: {matchingQuestionCount}</p>
      </section>

      <div className="base-actions">
        <button type="button" onClick={onBack} disabled={confirming}>
          出撃準備へ戻る
        </button>
        <button type="button" disabled={confirming} onClick={onConfirm}>
          出撃
        </button>
      </div>
    </div>
  );
}
