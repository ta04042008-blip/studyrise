import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { createInMemorySaveRepository } from '../../src/engine/save/InMemorySaveRepository';
import { createSaveSystem, type SaveSystem } from '../../src/engine/save/SaveSystem';

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

describe('useBaseController — Base resource HUD', () => {
  it('shows PermanentState currency and rare unlock resource on Base home', async () => {
    render(<Harness saveSystem={newSaveSystem()} />);

    expect(await screen.findByLabelText('コイン 200')).toBeTruthy();
    expect(screen.getByLabelText('賢者の石 0')).toBeTruthy();
  });
});
