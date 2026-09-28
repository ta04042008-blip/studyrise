import type { AreaDefinition } from '../../base/base.types';

interface AreaSelectScreenProps {
  areas: AreaDefinition[];
  onSelect: (areaId: string) => void;
  onBack: () => void;
}

/**
 * 拠点 → エリア選択 (spec v0.6 §2.1/§3.3). Shown even with exactly one Area
 * (user's explicit MVP-6 instruction) so the エリア＞ステージ＞ゾーン
 * hierarchy is visible in the flow, not collapsed away.
 */
export function AreaSelectScreen({ areas, onSelect, onBack }: AreaSelectScreenProps) {
  return (
    <div className="area-select-screen">
      <h1>エリア選択</h1>
      <ul className="base-list">
        {areas.map((area) => (
          <li key={area.id}>
            <button type="button" onClick={() => onSelect(area.id)}>
              {area.name}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBack}>
        拠点へ戻る
      </button>
    </div>
  );
}
