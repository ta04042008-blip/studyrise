import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';

interface CharacterListViewProps {
  roster: CharacterDefinition[];
  onSelect: (characterId: string) => void;
  onBack: () => void;
}

/** キャラクター一覧 (spec v0.6 §4). Only player-facing names — no internal ids shown. */
export function CharacterListView({ roster, onSelect, onBack }: CharacterListViewProps) {
  return (
    <div className="character-list-view">
      <h1>キャラクター</h1>
      <ul className="base-list">
        {roster.map((character) => (
          <li key={character.id}>
            <button type="button" onClick={() => onSelect(character.id)}>
              {character.name}
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
