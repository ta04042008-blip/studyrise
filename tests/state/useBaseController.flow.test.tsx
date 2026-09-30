import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { sampleQuestions } from '../../src/data/questions/sampleQuestions';
import { sampleArea } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { sampleParty } from '../../src/data/characters/sampleCharacters';
import { sampleItem } from '../../src/data/items/sampleItem';

afterEach(cleanup);

function Harness() {
  return <>{useBaseController({ questionPool: sampleQuestions })}</>;
}

describe('useBaseController — Base → Area → Stage → 出撃準備 → 出撃確認 → Stage', () => {
  it('drives the full departure flow from Base Home into a mounted Stage', async () => {
    render(<Harness />);

    // MVP-9: Base Home only renders after the async SaveSystem boot load
    // resolves (BOOT_LOADING first) — wait for it once, up front.
    await screen.findByRole('button', { name: '出撃' });

    // Base Home: exactly the 6 official hotspots (user's explicit MVP-6 instruction).
    for (const label of ['出撃', '編成', 'キャラクター', '装備', '持ち物', '記録']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }

    fireEvent.click(screen.getByRole('button', { name: '出撃' }));

    // Area select — shown even with exactly one Area (user's explicit instruction).
    expect(screen.getByRole('heading', { name: 'エリア選択' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: sampleArea.name }));

    // Stage select.
    expect(screen.getByRole('heading', { name: `ステージ選択（${sampleArea.name}）` })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: sampleStage.name }));

    // 出撃準備: 0人パーティのままでは出撃確認へ進めない (Party 0人不可).
    expect(screen.getByRole('heading', { name: '出撃準備' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '出撃確認へ' }) as HTMLButtonElement).disabled).toBe(true);

    // 編成 — reused PartyEditView, entered from 出撃準備.
    fireEvent.click(screen.getByRole('button', { name: '編成を変更' }));
    expect(screen.getByRole('heading', { name: '編成' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: sampleParty[0].name }));
    fireEvent.click(screen.getByRole('button', { name: '決定' }));

    // Back on 出撃準備, party now shows.
    expect(screen.getByRole('heading', { name: '出撃準備' })).toBeTruthy();
    expect(screen.getByText(sampleParty[0].name)).toBeTruthy();

    // 持ち込みアイテム: fill slot 1.
    const [itemSlot1] = screen.getAllByRole('combobox');
    fireEvent.change(itemSlot1, { target: { value: sampleItem.id } });

    // 出題範囲: still <2 subjects selected → 出撃確認へ stays disabled.
    expect((screen.getByRole('button', { name: '出撃確認へ' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText(/数学（教科単位選択）/));
    fireEvent.click(screen.getByLabelText(/英語（教科単位選択）/));

    expect((screen.getByRole('button', { name: '出撃確認へ' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '出撃確認へ' }));

    // 出撃確認: summary, then 出撃.
    expect(screen.getByRole('heading', { name: '出撃確認' })).toBeTruthy();
    expect(screen.getByText(`ステージ: ${sampleStage.name}`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '出撃' }));

    // Stage mounted.
    expect(screen.getByRole('heading', { name: 'StudyRise — Stage攻略' })).toBeTruthy();
    expect(document.querySelector('.command-menu')).toBeTruthy();
  });
});
