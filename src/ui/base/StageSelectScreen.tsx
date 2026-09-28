import type { AreaDefinition } from '../../base/base.types';
import type { StageDefinition } from '../../engine/stage/StageEngine.types';

interface StageSelectScreenProps {
  area: AreaDefinition;
  stages: StageDefinition[];
  onSelect: (stageId: string) => void;
  onBack: () => void;
}

/** エリア選択 → ステージ選択 (spec v0.6 §2.1/§3.3). */
export function StageSelectScreen({ area, stages, onSelect, onBack }: StageSelectScreenProps) {
  return (
    <div className="stage-select-screen">
      <h1>ステージ選択（{area.name}）</h1>
      <ul className="base-list">
        {stages.map((stage) => (
          <li key={stage.id}>
            <button type="button" onClick={() => onSelect(stage.id)}>
              {stage.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBack}>
        エリア選択へ戻る
      </button>
    </div>
  );
}
