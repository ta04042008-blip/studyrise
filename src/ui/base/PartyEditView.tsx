import { useState } from 'react';
import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import { MAX_PARTY_SIZE, validateParty } from '../../base/partyValidation';

interface PartyEditViewProps {
  roster: CharacterDefinition[];
  selected: CharacterDefinition[];
  onSave: (party: CharacterDefinition[]) => void;
  onCancel: () => void;
}

/**
 * 編成 (spec v0.6 §4.1: 1〜3人, 編成順=戦闘参加順). Shared by both the base
 * home's standalone 編成 hotspot and 出撃準備's 編成 section (user's explicit
 * instruction — one component, two entry points). Tap order IS battle order
 * (CLAUDE.md §9: no combat logic here — just collecting an ordered
 * selection for the caller to persist).
 */
export function PartyEditView({ roster, selected, onSave, onCancel }: PartyEditViewProps) {
  const [party, setParty] = useState<CharacterDefinition[]>(selected);

  function toggle(character: CharacterDefinition) {
    setParty((current) => {
      const isSelected = current.some((c) => c.id === character.id);
      if (isSelected) return current.filter((c) => c.id !== character.id);
      if (current.length >= MAX_PARTY_SIZE) return current; // no-op — already full
      return [...current, character];
    });
  }

  const validation = validateParty(party);

  return (
    <div className="party-edit-view">
      <h1>編成</h1>
      <p>1〜3人を選択してください（選択順＝戦闘参加順）</p>
      <ol className="party-edit-view__selected">
        {party.map((c) => (
          <li key={c.id}>{c.name}</li>
        ))}
      </ol>
      <ul className="base-list">
        {roster.map((character) => {
          const isSelected = party.some((c) => c.id === character.id);
          return (
            <li key={character.id}>
              <button type="button" aria-pressed={isSelected} onClick={() => toggle(character)}>
                {isSelected ? '✓ ' : ''}
                {character.name}
              </button>
            </li>
          );
        })}
      </ul>
      {!validation.valid && <p className="base-validation-errors">{validation.errors.join(' / ')}</p>}
      <div className="base-actions">
        <button type="button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="button" disabled={!validation.valid} onClick={() => onSave(party)}>
          パーティを保存
        </button>
      </div>
    </div>
  );
}
