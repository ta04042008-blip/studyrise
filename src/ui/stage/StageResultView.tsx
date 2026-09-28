import type { StageResult } from '../../engine/stage/StageEngine.types';

interface StageResultViewProps {
  result: StageResult;
  /** Dev-only restart (MVP-5 has no Stage-select screen yet — spec §2.4: retry always starts from Zone 1). */
  onRestart: () => void;
}

const OUTCOME_LABEL: Record<StageResult['outcome'], string> = {
  CLEARED: 'ステージクリア！',
  DEFEATED: '敗北……',
  SELF_RETURNED: '自主帰還しました',
};

/** Presentation only (CLAUDE.md §9). No permanent-reward/base integration here (MVP-6/7+). */
export function StageResultView({ result, onRestart }: StageResultViewProps) {
  return (
    <div className="stage-result-view">
      <h2>{OUTCOME_LABEL[result.outcome]}</h2>
      <p>クリア済みゾーン数: {result.zonesCleared}</p>
      <button type="button" onClick={onRestart}>
        もう一度挑戦する（Zone 1から）
      </button>
    </div>
  );
}
