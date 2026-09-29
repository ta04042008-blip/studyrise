interface BattleEndViewProps {
  outcome: 'win' | 'lose';
}

export function BattleEndView({ outcome }: BattleEndViewProps) {
  const isWin = outcome === 'win';
  return (
    <div className={`battle-end-view battle-end-view--${outcome}`}>
      <div className="battle-end-view__eyebrow">{isWin ? 'BATTLE CLEAR' : 'BATTLE FAILED'}</div>
      <p className="battle-end-view__title">{isWin ? '勝利！' : '敗北……'}</p>
      <p className="battle-end-view__message">
        {isWin ? '敵を撃破した。報酬を確認しよう。' : 'パーティが戦闘不能になった。'}
      </p>
    </div>
  );
}
