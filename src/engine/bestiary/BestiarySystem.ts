export interface EnemyBestiaryEntry {
  /** True once the enemy has appeared in a battle. */
  encountered: boolean;
  /** True once this enemy definition has been defeated at least once. */
  defeated: boolean;
  /** Unique action display names observed by actual execution or Search. */
  observedActionNames: string[];
}

export type EnemyBestiaryState = Record<string, EnemyBestiaryEntry>;

export type EnemyObservationEvent =
  | { type: 'ENCOUNTERED'; enemyDefinitionId: string }
  | { type: 'DEFEATED'; enemyDefinitionId: string }
  | { type: 'ACTION_OBSERVED'; enemyDefinitionId: string; actionName: string };

function normalizeEntry(entry: EnemyBestiaryEntry | undefined): EnemyBestiaryEntry {
  return entry ?? { encountered: false, defeated: false, observedActionNames: [] };
}

/**
 * Idempotently applies one observation event. The same battle snapshot can
 * safely be reported more than once without duplicating data.
 */
export function applyEnemyObservation(
  current: EnemyBestiaryState | undefined,
  event: EnemyObservationEvent,
): { state: EnemyBestiaryState; changed: boolean } {
  const state = current ?? {};
  const previous = normalizeEntry(state[event.enemyDefinitionId]);

  let next: EnemyBestiaryEntry = previous;
  switch (event.type) {
    case 'ENCOUNTERED':
      if (!previous.encountered) next = { ...previous, encountered: true };
      break;
    case 'DEFEATED':
      if (!previous.encountered || !previous.defeated) {
        next = { ...previous, encountered: true, defeated: true };
      }
      break;
    case 'ACTION_OBSERVED': {
      if (!previous.observedActionNames.includes(event.actionName)) {
        next = {
          ...previous,
          encountered: true,
          observedActionNames: [...previous.observedActionNames, event.actionName],
        };
      } else if (!previous.encountered) {
        next = { ...previous, encountered: true };
      }
      break;
    }
  }

  if (next === previous) return { state, changed: false };
  return {
    state: { ...state, [event.enemyDefinitionId]: next },
    changed: true,
  };
}

export function isEnemyDetailUnlocked(entry: EnemyBestiaryEntry | undefined): boolean {
  return entry?.defeated === true;
}

export function describeObservedEnemyAction(actionName: string): string {
  switch (actionName) {
    case 'アタック':
      return '対象1体へ通常攻撃を行う。';
    default:
      return 'この行動の詳細データはまだ定義されていません。';
  }
}
