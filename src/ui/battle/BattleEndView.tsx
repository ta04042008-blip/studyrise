interface BattleEndViewProps {
  outcome: 'win' | 'lose';
}

export function BattleEndView({ outcome }: BattleEndViewProps) {
  return (
    <div className="battle-end-view">
      <p>{outcome === 'win' ? '勝利！' : '敗北……'}</p>
    </div>
  );
}
