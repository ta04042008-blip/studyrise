import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('useBaseController — persistent Base memo', () => {
  it('saves memo text to PermanentSave and restores it after reload', async () => {
    const saveSystem = newSaveSystem();
    render(<Harness saveSystem={saveSystem} />);

    fireEvent.click(await screen.findByRole('button', { name: 'メモ' }));

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' });
    fireEvent.change(textarea, { target: { value: '明日は数学IIの微分を復習する' } });
    fireEvent.click(screen.getByRole('button', { name: 'メモを保存' }));

    await waitFor(async () => {
      const boot = await saveSystem.loadBoot();
      expect(boot.permanent?.baseMemo).toBe('明日は数学IIの微分を復習する');
    });

    cleanup();
    render(<Harness saveSystem={saveSystem} />);

    fireEvent.click(await screen.findByRole('button', { name: 'メモ' }));
    expect((screen.getByRole('textbox', { name: 'メモ内容' }) as HTMLTextAreaElement).value)
      .toBe('明日は数学IIの微分を復習する');
  });
});
