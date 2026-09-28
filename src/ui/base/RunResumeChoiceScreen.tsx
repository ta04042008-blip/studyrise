interface RunResumeChoiceScreenProps {
  stageName: string;
  onResume: () => void;
  onDiscard: () => void;
}

/**
 * MVP-9: shown at startup whenever a RunSave checkpoint was found (spec
 * §15.2 — "起動時に勝手に戦闘画面へ飛ばすのではなく...選択できる画面").
 * Presentation only (CLAUDE.md §9): both buttons just report the player's
 * choice — resuming (reconstructing StageLaunchConfig from the saved
 * checkpoint) and discarding (clearing all 3 Run checkpoint tiers) both
 * happen one level up, in useBaseController.
 */
export function RunResumeChoiceScreen({ stageName, onResume, onDiscard }: RunResumeChoiceScreenProps) {
  return (
    <div className="run-resume-choice-screen">
      <p>「{stageName}」に挑戦中のデータがあります。</p>
      <div className="run-resume-choice-screen__actions">
        <button type="button" onClick={onResume}>
          途中から再開
        </button>
        <button type="button" onClick={onDiscard}>
          中断データを破棄して拠点へ
        </button>
      </div>
    </div>
  );
}
