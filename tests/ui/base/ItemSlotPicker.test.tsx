import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ItemSlotPicker } from '../../../src/ui/base/ItemSlotPicker';
import { sampleDepartureItemCatalog } from '../../../src/data/items/sampleDepartureItemCatalog';
import { sampleItem } from '../../../src/data/items/sampleItem';

afterEach(cleanup);

describe('ItemSlotPicker (spec §5.10 持ち込み3枠, MVP-6 temporary catalog)', () => {
  it('renders exactly 3 slots', () => {
    render(<ItemSlotPicker catalog={sampleDepartureItemCatalog} slots={[null, null, null]} onChange={() => {}} />);
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
  });

  it('allows every slot to stay empty', () => {
    render(<ItemSlotPicker catalog={sampleDepartureItemCatalog} slots={[null, null, null]} onChange={() => {}} />);
    for (const select of screen.getAllByRole('combobox') as HTMLSelectElement[]) {
      expect(select.value).toBe('');
    }
  });

  it('reports the new slot contents on change, leaving the other slots untouched', () => {
    const onChange = vi.fn();
    render(<ItemSlotPicker catalog={sampleDepartureItemCatalog} slots={[null, null, null]} onChange={onChange} />);
    const [first] = screen.getAllByRole('combobox');
    fireEvent.change(first, { target: { value: sampleItem.id } });
    expect(onChange).toHaveBeenCalledWith([sampleItem.id, null, null]);
  });

  describe('ownedQuantityById (MVP-7 decision doc §14 — persistent Inventory quantity cap)', () => {
    it('allows the same item across multiple slots up to the owned quantity (同じitemを複数枠へ)', () => {
      render(
        <ItemSlotPicker
          catalog={sampleDepartureItemCatalog}
          slots={[sampleItem.id, null, null]}
          onChange={() => {}}
          ownedQuantityById={{ [sampleItem.id]: 2 }}
        />,
      );
      const [, second] = screen.getAllByRole('combobox') as HTMLSelectElement[];
      const optionInSecondSlot = Array.from(second.options).find((o) => o.value === sampleItem.id)!;
      expect(optionInSecondSlot.disabled).toBe(false); // 1 used elsewhere, owns 2 → still selectable
    });

    it('disables an item option in a slot once every other slot combined already uses up the owned quantity', () => {
      render(
        <ItemSlotPicker
          catalog={sampleDepartureItemCatalog}
          slots={[sampleItem.id, sampleItem.id, null]}
          onChange={() => {}}
          ownedQuantityById={{ [sampleItem.id]: 2 }}
        />,
      );
      const [, , third] = screen.getAllByRole('combobox') as HTMLSelectElement[];
      const optionInThirdSlot = Array.from(third.options).find((o) => o.value === sampleItem.id)!;
      expect(optionInThirdSlot.disabled).toBe(true); // both owned copies already placed in slots 1/2
    });

    it('never disables options when ownedQuantityById is omitted (pre-MVP-7 callers unaffected)', () => {
      render(
        <ItemSlotPicker catalog={sampleDepartureItemCatalog} slots={[sampleItem.id, sampleItem.id, null]} onChange={() => {}} />,
      );
      const [, , third] = screen.getAllByRole('combobox') as HTMLSelectElement[];
      const optionInThirdSlot = Array.from(third.options).find((o) => o.value === sampleItem.id)!;
      expect(optionInThirdSlot.disabled).toBe(false);
    });
  });
});
