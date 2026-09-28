import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PartyEditView } from '../../../src/ui/base/PartyEditView';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import type { CharacterDefinition } from '../../../src/engine/battle/BattleEngine.types';

afterEach(cleanup);

function fakeCharacter(id: string): CharacterDefinition {
  return {
    id,
    name: id,
    baseStats: { attack: 10, defense: 5, speed: 5, maxHp: 50, maxMp: 5 },
    initialSpellId: 'spell_test',
    additionalSpellPoolIds: [],
  };
}

const fourCharacterRoster = ['char_1', 'char_2', 'char_3', 'char_4'].map(fakeCharacter);

function rosterButton(name: string) {
  return screen.getByRole('button', { name: new RegExp(name) });
}

describe('PartyEditView (spec v0.6 §4.1: 1〜3人)', () => {
  it('disables 決定 with 0 selected (Party 0人不可)', () => {
    render(<PartyEditView roster={sampleParty} selected={[]} onSave={() => {}} onCancel={() => {}} />);
    expect((screen.getByRole('button', { name: '決定' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables 決定 with 1 selected (Party 1人可)', () => {
    render(<PartyEditView roster={sampleParty} selected={[]} onSave={() => {}} onCancel={() => {}} />);
    fireEvent.click(rosterButton(sampleParty[0].name));
    expect((screen.getByRole('button', { name: '決定' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('enables 決定 with all 3 selected (Party 3人可) and saves in selection order', () => {
    const onSave = vi.fn();
    render(<PartyEditView roster={sampleParty} selected={[]} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(rosterButton(sampleParty[2].name));
    fireEvent.click(rosterButton(sampleParty[0].name));
    fireEvent.click(rosterButton(sampleParty[1].name));
    const confirmButton = screen.getByRole('button', { name: '決定' });
    expect((confirmButton as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(confirmButton);
    expect(onSave).toHaveBeenCalledWith([sampleParty[2], sampleParty[0], sampleParty[1]]);
  });

  it('refuses a 4th selection (Party 4人不可): tapping a 4th roster member from a 4-person roster is a no-op', () => {
    const onSave = vi.fn();
    render(<PartyEditView roster={fourCharacterRoster} selected={[]} onSave={onSave} onCancel={() => {}} />);
    fireEvent.click(rosterButton('char_1'));
    fireEvent.click(rosterButton('char_2'));
    fireEvent.click(rosterButton('char_3'));
    fireEvent.click(rosterButton('char_4')); // 4th tap — must be ignored, party stays at 3

    expect(rosterButton('char_4').getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
    expect(onSave).toHaveBeenCalledWith(fourCharacterRoster.slice(0, 3));
  });
});
