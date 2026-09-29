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
    <div className={`stage-result-view stage-result-view--${result.outcome.toLowerCase()}`}>
      <div className="stage-result-view__eyebrow">
        {result.outcome === 'CLEARED' ? 'STAGE CLEAR' : result.outcome === 'DEFEATED' ? 'STAGE FAILED' : 'RETURN'}
      </div>
      <h2>{OUTCOME_LABEL[result.outcome]}</h2>
      <p className="stage-result-view__summary">クリア済みゾーン数: {result.zonesCleared}</p>
      <p className="stage-result-view__message">
        {result.outcome === 'CLEARED'
          ? 'ステージ攻略完了。獲得した成果を確認して拠点へ戻ろう。'
          : result.outcome === 'DEFEATED'
            ? '今回の挑戦はここまで。拠点で準備を整えて再挑戦しよう。'
            : 'ここまでの進行を確定して拠点へ帰還します。'}
      </p>
      <div className="stage-result-view__actions">
      <button type="button" onClick={onReturnToBase}>
        拠点へ戻る
      </button>
      {onRestart && (
        <button type="button" onClick={onRestart}>
          もう一度挑戦する（Zone 1から）
        </button>
      )}
      </div>
    </div>
  );
}
