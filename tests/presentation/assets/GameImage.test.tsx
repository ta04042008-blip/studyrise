import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GameImage } from '../../../src/presentation/assets/GameImage';

afterEach(cleanup);

describe('GameImage', () => {
  it('renders an <img> with the given src, alt, and className when src is provided', () => {
    render(<GameImage src="/assets/studyrise/characters/hayama_tomoya.png" alt="葉山智也" className="portrait" />);
    const img = screen.getByRole('img', { name: '葉山智也' }) as HTMLImageElement;
    expect(img.src).toContain('/assets/studyrise/characters/hayama_tomoya.png');
    expect(img.alt).toBe('葉山智也');
    expect(img.className).toBe('portrait');
  });

  it('renders nothing when src is undefined', () => {
    const { container } = render(<GameImage src={undefined} alt="葉山智也" />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.firstChild).toBeNull();
  });

  it('falls back to rendering nothing after the image fails to load, without throwing', () => {
    render(<GameImage src="/assets/studyrise/characters/hayama_tomoya.png" alt="葉山智也" />);
    const img = screen.getByRole('img', { name: '葉山智也' });

    expect(() => fireEvent.error(img)).not.toThrow();

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows the image again once a different src is supplied after a load error', () => {
    const { rerender } = render(<GameImage src="/assets/studyrise/characters/hayama_tomoya.png" alt="葉山智也" />);
    fireEvent.error(screen.getByRole('img', { name: '葉山智也' }));
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<GameImage src="/assets/studyrise/characters/nagumo_ayano.png" alt="南雲彩乃" />);

    const img = screen.getByRole('img', { name: '南雲彩乃' }) as HTMLImageElement;
    expect(img.src).toContain('/assets/studyrise/characters/nagumo_ayano.png');
  });

  it('re-attempts the same src if it comes back around after an unrelated src change', () => {
    const { rerender } = render(<GameImage src="/assets/studyrise/characters/hayama_tomoya.png" alt="葉山智也" />);
    fireEvent.error(screen.getByRole('img', { name: '葉山智也' }));
    expect(screen.queryByRole('img')).toBeNull();

    rerender(<GameImage src="/assets/studyrise/characters/nagumo_ayano.png" alt="南雲彩乃" />);
    rerender(<GameImage src="/assets/studyrise/characters/hayama_tomoya.png" alt="葉山智也" />);

    expect(screen.getByRole('img', { name: '葉山智也' })).toBeTruthy();
  });
});
