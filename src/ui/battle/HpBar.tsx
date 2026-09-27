interface HpBarProps {
  label: string;
  current: number;
  max: number;
}

/**
 * Accessibility baseline (CLAUDE.md §17): HP is always shown as readable
 * numeric text, not communicated by bar color alone.
 */
export function HpBar({ label, current, max }: HpBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;

  return (
    <div className="hp-bar">
      <div className="hp-bar__label">
        {label} HP {current} / {max}
      </div>
      <div className="hp-bar__track" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
        <div className="hp-bar__fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
