import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoScreen } from '../../../src/ui/base/MemoScreen';

afterEach(cleanup);

describe('MemoScreen', () => {
  it('renders an existing memo, edits it, and saves the new text', () => {
    const onSave = vi.fn();
    render(<MemoScreen initialMemo="復習: 二次関数" onSave={onSave} onBack={() => {}} />);

    const textarea = screen.getByRole('textbox', { name: 'メモ内容' }) as HTMLTextAreaElement;
    expect(textarea.value).toBe('復習: 二次関数');

    fireEvent.change(textarea, { target: { value: '英単語を30語復習する' } });
    fireEvent.click(screen.getByRole('button', { name: 'メモを保存' }));

    expect(onSave).toHaveBeenCalledWith('英単語を30語復習する');
    expect(screen.getByRole('status').textContent).toContain('保存しました');
  });

  it('returns to Base without implicitly saving edits', () => {
    const onSave = vi.fn();
    const onBack = vi.fn();
    render(<MemoScreen initialMemo="" onSave={onSave} onBack={onBack} />);

    fireEvent.change(screen.getByRole('textbox', { name: 'メモ内容' }), {
      target: { value: '未保存のメモ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
