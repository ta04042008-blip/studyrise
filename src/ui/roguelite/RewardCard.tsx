import type { RewardCandidate } from '../../engine/roguelite/RogueliteEngine.types';
import { rarityLabel } from './rarityLabel';

interface RewardCardProps {
  candidate: RewardCandidate;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function RewardCard({ candidate, selected, disabled, onClick }: RewardCardProps) {
  return (
    <button
      type="button"
      className={`reward-card${selected ? ' reward-card--selected' : ''}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      <div className="reward-card__rarity">{rarityLabel(candidate.rarity)}</div>
      <div className="reward-card__name">{candidate.reward.name}</div>
      <div className="reward-card__description">{candidate.reward.description}</div>
    </button>
  );
}
