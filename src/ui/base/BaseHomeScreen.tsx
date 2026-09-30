import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import type { AppPhase } from '../../base/base.types';
import { GameImage } from '../../presentation/assets/GameImage';
import {
  resolveBaseHomeBackgroundPath,
  resolveCharacterDetailArtPath,
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
  onSelect: (target: AppPhase) => void;
}

/**
 * 拠点ホーム: fixed background + current party leader + bottom navigation.
 * Presentation only (CLAUDE.md §9): the screen never mutates party/save data
 * itself and delegates every navigation request to useBaseController.
 */
export function BaseHomeScreen({ leader, onSelect }: BaseHomeScreenProps) {
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
