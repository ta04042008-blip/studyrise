import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BattleActorDetailModal } from '../../../src/ui/battle/BattleActorDetailModal';
import type { BattleActor } from '../../../src/engine/battle/BattleEngine.types';

afterEach(cleanup);

const player: BattleActor = {
  id: 'p1',
  definitionId: 'char_1',
  name: 'テスト主人公',
  kind: 'player',
  attack: 20,
  defense: 10,
  speed: 15,
  maxHp: 100,
  currentHp: 80,
  maxMp: 0,
  currentMp: 0,
  guard: null,
};

const enemy: BattleActor = {
  id: 'e1',
  definitionId: 'enemy_1',
  name: 'テスト敵',
  kind: 'enemy',
  attack: 12,
  defense: 8,
  speed: 7,
  maxHp: 60,
  currentHp: 44,
  maxMp: 0,
  currentMp: 0,
  guard: null,
};

describe('BattleActorDetailModal', () => {
  it('shows player battle stats and known spells', () => {
    render(
      <BattleActorDetailModal
        actor={player}
        knownSpells={[{ spellId: 's1', level: 2, name: 'ブレイク', mpCost: 0 }]}
        knownSkill={{
          skillId: 'skill_test',
          name: 'テストパッシブ',
          trigger: 'SEARCH_SUCCESS',
          description: 'サーチ成功時に反応する固有スキル。',
        }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'テスト主人公の詳細' })).toBeTruthy();
    expect(screen.getByText('80 / 100')).toBeTruthy();
    expect(screen.getByText('ブレイク Lv2')).toBeTruthy();
    expect(screen.getByText('テストパッシブ')).toBeTruthy();
    expect(screen.getByText('サーチ成功時に反応する固有スキル。')).toBeTruthy();
  });

  it('locks enemy stats until defeated, then reveals observed actions', () => {
    const { rerender } = render(
      <BattleActorDetailModal
        actor={enemy}
        enemyObservation={{ encountered: true, defeated: false, observedActionNames: ['アタック'] }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('詳細観測データ未解放')).toBeTruthy();
    expect(screen.queryByText('学力')).toBeNull();

    rerender(
      <BattleActorDetailModal
        actor={enemy}
        enemyObservation={{ encountered: true, defeated: true, observedActionNames: ['アタック'] }}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText('学力')).toBeTruthy();
    expect(screen.getByText('アタック')).toBeTruthy();
  });

  it('closes from the explicit close control', () => {
    const onClose = vi.fn();
    render(<BattleActorDetailModal actor={player} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
