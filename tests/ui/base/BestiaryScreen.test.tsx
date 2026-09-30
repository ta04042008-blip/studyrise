import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BestiaryScreen } from '../../../src/ui/base/BestiaryScreen';
import { sampleEnemy } from '../../../src/data/enemies/sampleEnemy';

afterEach(cleanup);

describe('BestiaryScreen', () => {
  it('keeps unseen enemies hidden and encountered enemies locked until defeated', () => {
    const { rerender } = render(<BestiaryScreen enemies={[sampleEnemy]} bestiary={{}} onBack={() => {}} />);
    expect(screen.getAllByText('？？？').length).toBeGreaterThan(0);
    expect(screen.getByText('まだ遭遇していません。')).toBeTruthy();

    rerender(
      <BestiaryScreen
        enemies={[sampleEnemy]}
        bestiary={{
          [sampleEnemy.id]: { encountered: true, defeated: false, observedActionNames: ['アタック'] },
        }}
        onBack={() => {}}
      />,
    );

    expect(screen.getAllByText(sampleEnemy.name).length).toBeGreaterThan(0);
    expect(screen.getByText(/1回撃破すると詳細観測データ/)).toBeTruthy();
  });

  it('shows stats and only observed action details after defeat', () => {
    render(
      <BestiaryScreen
        enemies={[sampleEnemy]}
        bestiary={{
          [sampleEnemy.id]: { encountered: true, defeated: true, observedActionNames: ['アタック'] },
        }}
        onBack={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(sampleEnemy.name) }));
    expect(screen.getByText('撃破済み')).toBeTruthy();
    expect(screen.getByText('学力')).toBeTruthy();
    expect(screen.getByText('アタック')).toBeTruthy();
    expect(screen.getByText(/通常攻撃/)).toBeTruthy();
  });
});
