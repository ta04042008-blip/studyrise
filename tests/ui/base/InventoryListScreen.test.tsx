import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InventoryListScreen } from '../../../src/ui/base/InventoryListScreen';
import { sampleDepartureItemCatalog } from '../../../src/data/items/sampleDepartureItemCatalog';
import { sampleItem } from '../../../src/data/items/sampleItem';
import { UPGRADE_MATERIAL_ID } from '../../../src/config/progressionConfig';
import { makeTestPermanentState } from '../../engine/progression/fixtures';

afterEach(cleanup);

describe('InventoryListScreen (spec §15, MVP-7 decision doc §15)', () => {
  it('shows currency, material, rareUnlockResource and consumables with quantities', () => {
    const permanentState = makeTestPermanentState({
      currency: 250,
      materials: { [UPGRADE_MATERIAL_ID]: 12 },
      rareUnlockResource: 3,
      inventory: { equipment: [], consumables: { [sampleItem.id]: 4 } },
    });
    render(<InventoryListScreen permanentState={permanentState} itemCatalog={sampleDepartureItemCatalog} onBack={() => {}} />);
    expect(screen.getByText('250')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText(`${sampleItem.name} × 4`)).toBeTruthy();
  });

  it('never shows a consumable at quantity 0', () => {
    const permanentState = makeTestPermanentState({ inventory: { equipment: [], consumables: { [sampleItem.id]: 0 } } });
    render(<InventoryListScreen permanentState={permanentState} itemCatalog={sampleDepartureItemCatalog} onBack={() => {}} />);
    expect(screen.getByText('所持している消費アイテムはありません。')).toBeTruthy();
  });

  it('does not render any equipment-management controls (装備 is a separate screen, decision doc §15)', () => {
    const permanentState = makeTestPermanentState();
    render(<InventoryListScreen permanentState={permanentState} itemCatalog={sampleDepartureItemCatalog} onBack={() => {}} />);
    expect(screen.queryByRole('button', { name: '装備' })).toBeFalsy();
    expect(screen.queryByRole('button', { name: '強化' })).toBeFalsy();
  });

  it('拠点へ戻る calls onBack', () => {
    const permanentState = makeTestPermanentState();
    const onBack = vi.fn();
    render(<InventoryListScreen permanentState={permanentState} itemCatalog={sampleDepartureItemCatalog} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(onBack).toHaveBeenCalled();
  });
});
