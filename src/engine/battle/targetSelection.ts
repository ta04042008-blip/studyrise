import type { QuestionCommandKind } from './BattleEngine.types';

/**
 * Pure target-selection rules shared by BattleEngine (CLAUDE.md §9 — this
 * decision belongs to an engine module, never the UI). MVP-3 requirements:
 *
 *  - Attack/Search: free choice among all alive enemies; TARGET_SELECT is
 *    only shown when more than one enemy is alive (requirement 6/7/8) —
 *    with exactly one alive enemy the target auto-resolves, same as
 *    MVP-1/2's 1v1 behavior (regression safety).
 *  - Guard/Charge: always target the acting actor itself; never enters
 *    TARGET_SELECT (requirement 10).
 *  - Spell/Item: follow the definition's targetType — 'self' never needs
 *    selection, 'enemy' follows the same alive-enemy-count rule as Attack.
 */
export interface TargetDecision {
  needsSelection: boolean;
  /** All valid target ids for this command right now. */
  candidateIds: string[];
  /** Set only when needsSelection is false (auto-resolved). */
  autoTargetId: string | null;
}

function enemyTargetDecision(aliveEnemyIds: readonly string[]): TargetDecision {
  const candidateIds = [...aliveEnemyIds];
  if (candidateIds.length <= 1) {
    return { needsSelection: false, candidateIds, autoTargetId: candidateIds[0] ?? null };
  }
  return { needsSelection: true, candidateIds, autoTargetId: null };
}

function selfTargetDecision(sourceActorId: string): TargetDecision {
  return { needsSelection: false, candidateIds: [sourceActorId], autoTargetId: sourceActorId };
}

export function decideQuestionCommandTargeting(
  command: QuestionCommandKind,
  sourceActorId: string,
  aliveEnemyIds: readonly string[],
): TargetDecision {
  if (command === 'guard' || command === 'charge') {
    return selfTargetDecision(sourceActorId);
  }
  // attack / search
  return enemyTargetDecision(aliveEnemyIds);
}

export function decideSpellOrItemTargeting(
  targetType: 'enemy' | 'self',
  sourceActorId: string,
  aliveEnemyIds: readonly string[],
): TargetDecision {
  if (targetType === 'self') {
    return selfTargetDecision(sourceActorId);
  }
  return enemyTargetDecision(aliveEnemyIds);
}
