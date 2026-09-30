import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QuestionScopeSelector } from '../../../src/ui/base/QuestionScopeSelector';
import type { QuestionScopeSelection } from '../../../src/base/base.types';
import type { SubjectCatalogEntry } from '../../../src/base/questionScope';

afterEach(cleanup);

const catalog: SubjectCatalogEntry[] = [
  {
    subject: '数学',
    fields: [
      { field: '数学I', units: ['数と式', '集合・命題'] },
      { field: '数学A', units: ['場合の数', '確率'] },
    ],
  },
  {
    subject: '英語',
    fields: [
      { field: '語彙', units: ['基本語彙', '文脈語彙'] },
    ],
  },
];

function Harness() {
  const [scope, setScope] = useState<QuestionScopeSelection>([]);
  return <QuestionScopeSelector catalog={catalog} scope={scope} onChange={setScope} />;
}

describe('QuestionScopeSelector unit modal', () => {
  it('keeps unit rows hidden until the field picker is opened', () => {
    render(<Harness />);

    expect(screen.queryByText('数と式')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '数学Iの単元を選択' }));

    const dialog = screen.getByRole('dialog', { name: '数学Iの単元' });
    expect(within(dialog).getByText('数と式')).toBeTruthy();
    expect(within(dialog).getByText('集合・命題')).toBeTruthy();
  });

  it('toggles individual units in the modal and keeps the selected count after closing', () => {
    render(<Harness />);

    const openButton = screen.getByRole('button', { name: '数学Iの単元を選択' });
    expect(openButton.textContent).toContain('0 / 2');

    fireEvent.click(openButton);
    const dialog = screen.getByRole('dialog', { name: '数学Iの単元' });
    fireEvent.click(within(dialog).getByRole('checkbox', { name: '数と式' }));

    expect(within(dialog).getByText('選択中 1 / 2')).toBeTruthy();

    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: '数学Iの単元を選択' }).textContent).toContain('1 / 2');
  });

  it('preserves field-level select all while units live in the modal', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('checkbox', { name: '数学I（分野単位選択）' }));
    expect(screen.getByRole('button', { name: '数学Iの単元を選択' }).textContent).toContain('2 / 2');

    fireEvent.click(screen.getByRole('button', { name: '数学Iの単元を選択' }));
    const dialog = screen.getByRole('dialog', { name: '数学Iの単元' });
    expect((within(dialog).getByRole('checkbox', { name: '数と式' }) as HTMLInputElement).checked).toBe(true);
    expect((within(dialog).getByRole('checkbox', { name: '集合・命題' }) as HTMLInputElement).checked).toBe(true);
  });
});
