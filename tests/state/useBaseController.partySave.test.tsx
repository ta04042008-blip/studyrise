import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { createInMemorySaveRepository } from '../../src/engine/save/InMemorySaveRepository';
import { createSaveSystem, type SaveSystem } from '../../src/engine/save/SaveSystem';
import { sampleParty } from '../../src/data/characters/sampleCharacters';
import { sampleArea } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';

afterEach(cleanup);

function newSaveSystem(): SaveSystem {
  let tick = 0;
  return createSaveSystem({
    repository: createInMemorySaveRepository(),
    clock: { now: () => tick++ },
  });
}

function Harness({ saveSystem }: { saveSystem: SaveSystem }) {
  return <>{useBaseController({ saveSystem })}</>;
}

describe('useBaseController — saved Base party', () => {
  it('persists party order, restores the leader after reload, and reuses the saved party for departure', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);

    await screen.findByRole('button', { name: '編成' });
    fireEvent.click(screen.getByRole('button', { name: '編成' }));

    // Save Ayano first so the leader visibly changes from the fresh-save
    // presentation fallback (Tomoya) and order persistence is exercised.
    fireEvent.click(screen.getByRole('button', { name: sampleParty[1].name }));
    fireEvent.click(screen.getByRole('button', { name: sampleParty[0].name }));
    fireEvent.click(screen.getByRole('button', { name: 'パーティを保存' }));

    expect(screen.getByRole('img', { name: `${sampleParty[1].name} パーティ先頭` })).toBeTruthy();

    await waitFor(async () => {
      const boot = await saveSystem.loadBoot();
      expect(boot.permanent?.savedPartyCharacterIds).toEqual([
        sampleParty[1].id,
        sampleParty[0].id,
      ]);
    });

    cleanup();
    render(<Harness saveSystem={saveSystem} />);

    expect(await screen.findByRole('img', { name: `${sampleParty[1].name} パーティ先頭` })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '出撃' }));
    fireEvent.click(screen.getByRole('button', { name: sampleArea.name }));
    fireEvent.click(screen.getByRole('button', { name: sampleStage.name }));

    expect(screen.getByRole('heading', { name: '出撃準備' })).toBeTruthy();
    expect(screen.getByText(sampleParty[1].name)).toBeTruthy();
    expect(screen.getByText(sampleParty[0].name)).toBeTruthy();
  });
});
