interface HpBarProps {
  label: string;
  current: number;
  max: number;
  /** Highlights whose turn it is — MVP-3 requirement 5 ("現在行動者" display). */
  isCurrentActor?: boolean;
}

/**
 * Accessibility baseline (CLAUDE.md §17): HP is always shown as readable
 * numeric text, and KO is shown as text, not communicated by bar color
 * alone (MVP-3 requirement 11: a KO'd actor cannot act for the rest of the
 * zone).
 */
export function HpBar({ label, current, max, isCurrentActor }: HpBarProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const isKO = current <= 0;

  return (
    <div className={`hp-bar${isKO ? ' hp-bar--ko' : ''}${isCurrentActor ? ' hp-bar--current' : ''}`}>
      <div className="hp-bar__label">
        {isCurrentActor && <span className="hp-bar__current-marker">▶ </span>}
        {label} HP {current} / {max}
        {isKO && <span className="hp-bar__ko-label">（KO）</span>}
      </div>
      <div className="hp-bar__track" role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={max}>
        <div className="hp-bar__fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}
