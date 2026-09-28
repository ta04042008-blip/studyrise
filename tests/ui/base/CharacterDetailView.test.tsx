import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CharacterDetailView } from '../../../src/ui/base/CharacterDetailView';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import { spellsById } from '../../../src/data/spells/spellsById';

afterEach(cleanup);

describe('CharacterDetailView (MVP-6 range only, user instruction)', () => {
  const character = sampleParty[0];

  it('shows name / HP / 学力 / 忍耐力 / 思考速度 / MP / 初期スペル', () => {
    render(<CharacterDetailView character={character} onBack={() => {}} />);
    expect(screen.getByRole('heading', { name: character.name })).toBeTruthy();
    expect(screen.getByText('HP')).toBeTruthy();
    expect(screen.getByText('学力')).toBeTruthy();
    expect(screen.getByText('忍耐力')).toBeTruthy();
    expect(screen.getByText('思考速度')).toBeTruthy();
    expect(screen.getByText('MP')).toBeTruthy();
    expect(screen.getByText('初期スペル')).toBeTruthy();
    const initialSpellName = spellsById[character.initialSpellId].name;
    expect(screen.getByText(initialSpellName)).toBeTruthy();
  });

  it('never renders internal ids (character.id, initialSpellId, additionalSpellPoolIds)', () => {
    render(<CharacterDetailView character={character} onBack={() => {}} />);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(character.id);
    expect(text).not.toContain(character.initialSpellId);
    for (const poolId of character.additionalSpellPoolIds) {
      expect(text).not.toContain(poolId);
    }
  });
});
