import { Hotspot } from './Hotspot';
import type { AppPhase } from '../../base/base.types';

export interface HomeHotspotDefinition {
  id: string;
  label: string;
  target: AppPhase;
  xPercent: number;
  yPercent: number;
}

/**
 * The exactly-6 official hotspots (user's MVP-6 instruction — no 補助メニュー
 * this round). Positions are kept well inside [0,100] on both axes with
 * margin so they never sit at/beyond the background's edge regardless of
 * how the background element is scaled (CLAUDE.md §16/§17).
 */
export const HOME_HOTSPOTS: HomeHotspotDefinition[] = [
  { id: 'departure', label: '出撃', target: 'AREA_SELECT', xPercent: 20, yPercent: 28 },
  { id: 'party', label: '編成', target: 'PARTY_EDIT', xPercent: 50, yPercent: 28 },
  { id: 'character', label: 'キャラクター', target: 'CHARACTER_LIST', xPercent: 80, yPercent: 28 },
  { id: 'equipment', label: '装備', target: 'EQUIPMENT_LIST', xPercent: 20, yPercent: 68 },
  { id: 'inventory', label: '持ち物', target: 'INVENTORY_LIST', xPercent: 50, yPercent: 68 },
  { id: 'record', label: '記録', target: 'RECORD_LIST', xPercent: 80, yPercent: 68 },
];

interface BaseHomeScreenProps {
  onSelect: (target: AppPhase) => void;
}

/**
 * 拠点ホーム (spec v0.6 §3.1): one PLACEHOLDER background + tappable
 * hotspots, no free walking. Presentation only (CLAUDE.md §9) — every tap
 * just requests a phase change from useBaseController.
 */
export function BaseHomeScreen({ onSelect }: BaseHomeScreenProps) {
  return (
    <div className="base-home">
      <h1>拠点</h1>
      <div className="base-home__background" aria-label="拠点ホーム背景（PLACEHOLDER）">
        {HOME_HOTSPOTS.map((hotspot) => (
          <Hotspot
            key={hotspot.id}
            label={hotspot.label}
            xPercent={hotspot.xPercent}
            yPercent={hotspot.yPercent}
            onClick={() => onSelect(hotspot.target)}
          />
        ))}
      </div>
    </div>
  );
}
