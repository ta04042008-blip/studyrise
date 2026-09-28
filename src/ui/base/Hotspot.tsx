interface HotspotProps {
  label: string;
  xPercent: number;
  yPercent: number;
  onClick: () => void;
}

/**
 * One tappable point over the base background (spec v0.6 §3.1: 背景 +
 * ホットスポット, no free walking). Positioned with percentages so it stays
 * correctly placed as the background scales (CLAUDE.md §16/§17: adequate
 * tap target, label always shown — never color-only).
 */
export function Hotspot({ label, xPercent, yPercent, onClick }: HotspotProps) {
  return (
    <button
      type="button"
      className="hotspot"
      style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
