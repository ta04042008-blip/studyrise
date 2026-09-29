import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CharacterDetailView } from '../../../src/ui/base/CharacterDetailView';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import { spellsById } from '../../../src/data/spells/spellsById';
import { createEmptyPermanentCharacterState, expRequiredForLevel } from '../../../src/engine/progression/ProgressionSystem';
import { progressionConfig } from '../../../src/config/progressionConfig';

afterEach(cleanup);

describe('CharacterDetailView (MVP-6 baseline + MVP-7 Level/EXP/装備 additions)', () => {
  const character = sampleParty[0];
  const characterState = createEmptyPermanentCharacterState(character.id);
  const nextLevelExpRequired = expRequiredForLevel(characterState.level, progressionConfig.expCurve);

  function renderView() {
    render(
      <CharacterDetailView
        character={character}
        characterState={characterState}
        resolvedBaseStats={character.baseStats}
        nextLevelExpRequired={nextLevelExpRequired}
        equipmentDefsById={{}}
        equipmentInstances={[]}
        onBack={() => {}}
      />,
    );
  }

  it('shows name / HP / 学力 / 忍耐力 / 思考速度 / MP / 初期スペル', () => {
    renderView();
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

  it('shows the registered character art path through GameImage', () => {
    renderView();
    const img = screen.getByRole('img', { name: character.name }) as HTMLImageElement;
    expect(img.src).toContain('/assets/studyrise/characters/hayama_tomoya.png');
  });

  it('shows Level / EXP / 次Lvまでの必要EXP and 装備 slots (MVP-7)', () => {
    renderView();
    expect(screen.getByText('Level')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText(`0 / 次Lvまで ${nextLevelExpRequired}`)).toBeTruthy();
    expect(screen.getByText('武器')).toBeTruthy();
    expect(screen.getByText('防具')).toBeTruthy();
    expect(screen.getByText('アクセサリー')).toBeTruthy();
    expect(screen.getAllByText('未装備')).toHaveLength(3);
  });

  it('never renders internal ids (character.id, initialSpellId, additionalSpellPoolIds)', () => {
    renderView();
    const text = document.body.textContent ?? '';
    expect(text).not.toContain(character.id);
    expect(text).not.toContain(character.initialSpellId);
    for (const poolId of character.additionalSpellPoolIds) {
      expect(text).not.toContain(poolId);
    }
  });
});
