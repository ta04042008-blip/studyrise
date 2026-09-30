import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { createInMemorySaveRepository } from '../../src/engine/save/InMemorySaveRepository';
import { createSaveSystem, type SaveSystem } from '../../src/engine/save/SaveSystem';
import { createSampleInitialPermanentState } from '../../src/data/progression/createInitialPermanentState';
import { sampleEnemy } from '../../src/data/enemies/sampleEnemy';

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

describe('useBaseController — persistent Bestiary', () => {
  it('loads saved enemy observations and shows them from Base navigation', async () => {
    const saveSystem = newSaveSystem();
    const permanent = createSampleInitialPermanentState();
    permanent.enemyBestiary = {
      [sampleEnemy.id]: {
        encountered: true,
        defeated: true,
        observedActionNames: ['アタック'],
      },
    };
    await saveSystem.commit({ permanent });

    render(<Harness saveSystem={saveSystem} />);

    fireEvent.click(await screen.findByRole('button', { name: '図鑑' }));
    expect(screen.getByRole('heading', { name: '図鑑' })).toBeTruthy();
    expect(screen.getAllByText(sampleEnemy.name).length).toBeGreaterThan(0);
    expect(screen.getByText('撃破済み')).toBeTruthy();
    expect(screen.getByText(/通常攻撃/)).toBeTruthy();
  });
});
