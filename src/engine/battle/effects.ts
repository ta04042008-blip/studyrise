import type { BattleActor } from './BattleEngine.types';

/**
 * Reusable effect primitives (CLAUDE.md §8). Only the kinds MVP-2 actually
 * needs are implemented — DAMAGE/HEAL/MP_GAIN/GUARD. BUFF/DEBUFF/STATUS/
 * SPEED_MODIFY/ACTION_ADVANCE are not added until a later MVP needs them
 * (status effects are explicitly out of MVP-2 scope).
 */
export type Effect =
  | { type: 'DAMAGE'; amount: number }
  | { type: 'HEAL'; amount: number }
  | { type: 'MP_GAIN'; amount: number }
  | { type: 'GUARD'; mitigationPercent: number };

/** Mutates `actor` according to `effect`. The only place actor HP/MP/guard fields change. */
export function applyEffect(actor: BattleActor, effect: Effect): void {
  switch (effect.type) {
    case 'DAMAGE':
      actor.currentHp = Math.max(0, actor.currentHp - effect.amount);
      return;
    case 'HEAL':
      actor.currentHp = Math.min(actor.maxHp, actor.currentHp + effect.amount);
      return;
    case 'MP_GAIN':
      actor.currentMp = Math.min(actor.maxMp, actor.currentMp + effect.amount);
      return;
    case 'GUARD':
      actor.guard = { mitigationPercent: effect.mitigationPercent };
      return;
  }
}
