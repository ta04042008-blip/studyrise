import type { StageResult } from '../../engine/stage/StageEngine.types';

interface StageResultViewProps {
  result: StageResult;
  /** Main MVP-6 flow (spec §2.3 手順8): every outcome — Clear/Defeat/Self Return — returns here. */
  onReturnToBase: () => void;
  /** Dev-only retry shortcut (spec §2.4: retry always starts from Zone 1). Optional — omit to hide it. */
  onRestart?: () => void;
}

const OUTCOME_LABEL: Record<StageResult['outcome'], string> = {
  CLEARED: 'ステージクリア！',
  DEFEATED: '敗北……',
  SELF_RETURNED: '自主帰還しました',
};

/** Presentation only (CLAUDE.md §9). No permanent-reward integration here (MVP-7+). */
export function StageResultView({ result, onReturnToBase, onRestart }: StageResultViewProps) {
  return (
    <div className="stage-result-view">
      <h2>{OUTCOME_LABEL[result.outcome]}</h2>
      <p>クリア済みゾーン数: {result.zonesCleared}</p>
      <button type="button" onClick={onReturnToBase}>
        拠点へ戻る
      </button>
      {onRestart && (
        <button type="button" onClick={onRestart}>
          もう一度挑戦する（Zone 1から）
        </button>
      )}
    </div>
  );
}
