import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import type { AppPhase } from '../../base/base.types';
import { GameImage } from '../../presentation/assets/GameImage';
import {
  resolveBaseHomeBackgroundPath,
  resolveCharacterDetailArtPath,
  resolveCoinIconPath,
  resolveSagesStoneIconPath,
} from '../../presentation/assets/studyRiseAssets';

export interface HomeNavItemDefinition {
  id: string;
  label: string;
  target: AppPhase;
}

/**
 * Base-home navigation. These are navigation controls, not background
 * hotspots: the background remains presentation-only while every destination
 * stays reachable from the fixed bottom navigation.
 */
export const HOME_NAV_ITEMS: HomeNavItemDefinition[] = [
  { id: 'departure', label: '出撃', target: 'AREA_SELECT' },
  { id: 'character', label: '仲間', target: 'CHARACTER_LIST' },
  { id: 'party', label: '編成', target: 'PARTY_EDIT' },
  { id: 'equipment', label: '装備', target: 'EQUIPMENT_LIST' },
  { id: 'inventory', label: '持ち物', target: 'INVENTORY_LIST' },
  { id: 'record', label: '記録', target: 'RECORD_LIST' },
];

interface BaseHomeScreenProps {
  leader?: CharacterDefinition | null;
  currency?: number;
  sagesStone?: number;
  onSelect: (target: AppPhase) => void;
}

/**
 * 拠点ホーム: fixed background + current party leader + bottom navigation.
 * Presentation only (CLAUDE.md §9): the screen never mutates party/save data
 * itself and delegates every navigation request to useBaseController.
 */
const NUMBER_FORMAT = new Intl.NumberFormat('ja-JP');

export function BaseHomeScreen({
  leader,
  currency = 0,
  sagesStone = 0,
  onSelect,
}: BaseHomeScreenProps) {
  const leaderArtPath = resolveCharacterDetailArtPath(leader?.id);

  return (
    <div className="base-home">
      <GameImage
        src={resolveBaseHomeBackgroundPath()}
        alt=""
        className="base-home__background-art"
      />
      <div className="base-home__shade" aria-hidden="true" />

      <div className="base-home__title" aria-label="拠点">
        拠点
      </div>

      <aside className="base-home__resources" aria-label="所持資源">
        <div className="base-home__resource" aria-label={`コイン ${NUMBER_FORMAT.format(currency)}`}>
          <GameImage
            src={resolveCoinIconPath()}
            alt=""
            className="base-home__resource-icon"
          />
          <span className="base-home__resource-value">{NUMBER_FORMAT.format(currency)}</span>
        </div>
        <div className="base-home__resource" aria-label={`賢者の石 ${NUMBER_FORMAT.format(sagesStone)}`}>
          <GameImage
            src={resolveSagesStoneIconPath()}
            alt=""
            className="base-home__resource-icon"
          />
          <span className="base-home__resource-value">{NUMBER_FORMAT.format(sagesStone)}</span>
        </div>
      </aside>

      {leader && leaderArtPath && (
        <div className="base-home__leader" data-character-id={leader.id}>
          <GameImage
            src={leaderArtPath}
            alt={`${leader.name} パーティ先頭`}
            className="base-home__leader-art"
          />
          <div className="base-home__leader-name">{leader.name}</div>
        </div>
      )}

      <nav className="base-home__nav" aria-label="拠点メニュー">
        {HOME_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="base-home__nav-button"
            onClick={() => onSelect(item.target)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
