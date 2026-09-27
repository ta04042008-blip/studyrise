interface TargetSelectViewProps {
  candidateIds: string[];
  actorNameById: Record<string, string>;
  actorHpById: Record<string, { current: number; max: number }>;
  onSelect: (targetId: string) => void;
}

/**
 * TARGET_SELECT phase (MVP-3 requirement 6/7/8/9): only ever shown when a
 * command's target must be chosen among more than one alive candidate —
 * BattleEngine already auto-resolves the single-candidate case, so this
 * view never needs to special-case "only one enemy alive".
 */
export function TargetSelectView({ candidateIds, actorNameById, actorHpById, onSelect }: TargetSelectViewProps) {
  return (
    <div className="target-select-view">
      <p>対象を選んでください</p>
      <ul>
        {candidateIds.map((id) => {
          const hp = actorHpById[id];
          return (
            <li key={id}>
              <button type="button" onClick={() => onSelect(id)}>
                {actorNameById[id] ?? id}
                {hp ? `（HP ${hp.current}/${hp.max}）` : ''}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
