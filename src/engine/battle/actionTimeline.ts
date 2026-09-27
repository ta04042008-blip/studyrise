import type { RandomService } from '../random/RandomService';

/**
 * Speed-based action gauge/timeline (spec §5.2). A fast actor can act
 * multiple times before a slow actor acts once; the gauge itself is not
 * shown in the UI, only the resulting turn order. Same-gauge arrivals are
 * broken by higher 思考速度 (speed), and true ties are resolved randomly.
 */
export interface TimelineActor {
  id: string;
  speed: number;
}

export interface TimelineState {
  gauges: Record<string, number>;
}

const ACTION_THRESHOLD = 100;

export function createTimelineState(actors: readonly TimelineActor[]): TimelineState {
  const gauges: Record<string, number> = {};
  for (const actor of actors) {
    gauges[actor.id] = 0;
  }
  return { gauges };
}

export interface ResolveNextActorResult {
  actorId: string;
  state: TimelineState;
}

/**
 * Advances the gauge until an actor reaches the action threshold, and
 * returns that actor's id along with the updated (immutable-style) state.
 */
export function resolveNextActor(
  actors: readonly TimelineActor[],
  state: TimelineState,
  random: RandomService,
): ResolveNextActorResult {
  const gauges = { ...state.gauges };

  const alreadyReady = actors.filter((a) => gauges[a.id] >= ACTION_THRESHOLD);
  if (alreadyReady.length === 0) {
    let minTicks = Infinity;
    for (const actor of actors) {
      if (actor.speed <= 0) continue;
      const needed = Math.ceil((ACTION_THRESHOLD - gauges[actor.id]) / actor.speed);
      minTicks = Math.min(minTicks, needed);
    }
    if (!Number.isFinite(minTicks)) {
      minTicks = 1;
    }
    for (const actor of actors) {
      gauges[actor.id] += actor.speed * minTicks;
    }
  }

  const candidates = actors.filter((a) => gauges[a.id] >= ACTION_THRESHOLD);
  const winner = pickWinner(candidates, random);
  gauges[winner.id] -= ACTION_THRESHOLD;

  return { actorId: winner.id, state: { gauges } };
}

function pickWinner(candidates: readonly TimelineActor[], random: RandomService): TimelineActor {
  const maxSpeed = Math.max(...candidates.map((c) => c.speed));
  const fastest = candidates.filter((c) => c.speed === maxSpeed);
  if (fastest.length === 1) {
    return fastest[0];
  }
  return random.pick(fastest);
}
