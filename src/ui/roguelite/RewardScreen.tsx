import type { RogueliteController } from '../../state/useRogueliteController';
import { RewardCard } from './RewardCard';

interface RewardScreenProps {
  controller: RogueliteController;
  characterNameById: Record<string, string>;
  /** Only ever actionable once controller.phase.complete is true (spec: proceeding to the next battle is gated on the last character's reward being applied). */
  onProceedToNextBattle: () => void;
  /** Label for the completion-banner button (e.g. Final Zone says "ステージクリアへ" instead of the default). */
  nextLabel?: string;
}

/**
 * Pure presentation + input collection (CLAUDE.md §9): reads `controller.phase`
 * and dispatches to it. No reward generation/rarity/synergy calculation
 * happens here — see RogueliteEngine.
 */
export function RewardScreen({ controller, characterNameById, onProceedToNextBattle, nextLabel }: RewardScreenProps) {
  const { phase } = controller;
  const session = phase.currentRewardSession;
  const targetName = characterNameById[session.targetCharacterId] ?? session.targetCharacterId;
  const canAct = session.status === 'CANDIDATES_READY';

  return (
    <div className="reward-screen">
      <h2>{targetName}の報酬</h2>
      <p className="reward-screen__progress">
        {phase.currentCharacterIndex + 1} / {phase.characterOrder.length}人目
        {session.isRareRewardEvent ? '（希少報酬イベント）' : ''}
      </p>

      <div className="reward-screen__cards">
        {session.candidates.map((candidate) => (
          <RewardCard
            key={candidate.candidateKey}
            candidate={candidate}
            selected={session.selectedCandidateKey === candidate.candidateKey}
            disabled={!canAct}
            onClick={() => controller.selectCandidate(candidate.candidateKey)}
          />
        ))}
      </div>

      <div className="reward-screen__actions">
        <button type="button" disabled={!canAct || session.rerollRemaining <= 0} onClick={controller.reroll}>
          リロール（残り{session.rerollRemaining}回）
        </button>
        <button type="button" disabled={!canAct || !session.selectedCandidateKey} onClick={controller.confirm}>
          決定
        </button>
      </div>

      {phase.complete && (
        <div className="reward-screen__complete">
          <p>全員の報酬選択が完了しました。</p>
          <button type="button" onClick={onProceedToNextBattle}>
            {nextLabel ?? '次の戦闘へ'}
          </button>
        </div>
      )}
    </div>
  );
}
