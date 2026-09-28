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
});
