interface CommandMenuProps {
  enabled: boolean;
  onSelectAttack: () => void;
}

/**
 * MVP-1 boundary (CLAUDE.md §27): only アタック is implemented. Guard/
 * Charge/Search/Spell/Item are not rendered — this is not "6 buttons,
 * 5 disabled," it is the smallest command menu that proves the loop.
 */
export function CommandMenu({ enabled, onSelectAttack }: CommandMenuProps) {
  return (
    <div className="command-menu">
      <button type="button" disabled={!enabled} onClick={onSelectAttack}>
        アタック
      </button>
    </div>
  );
}
