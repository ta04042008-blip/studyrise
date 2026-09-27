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
 *
 * `actors` must be the currently-alive roster only (MVP-3 requirement 12:
 * a KO'd actor is excluded from the action queue). A KO'd actor's gauge
 * entry is simply never read again once it stops appearing here — its
 * accumulated value is left untouched in `state.gauges`, and every
 * surviving actor's own gauge is preserved exactly as-is (requirement 1:
 * no full-timeline reset on KO, only removal of the KO'd actor).
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

/**
 * A RandomService that can be snapshotted (spec §5.2 UI requirement 5 +
 * MVP-3 correction 2): cloning captures the exact current internal state,
 * so a clone can be consumed freely (e.g. to preview several future
 * turns) without advancing the original stream at all.
 */
export interface CloneableRandomService extends RandomService {
  clone(): CloneableRandomService;
}

/** mulberry32 — same small deterministic PRNG as RandomService, but exposed as clonable state. */
function timelineRandomFromState(seedState: number): CloneableRandomService {
  let a = seedState | 0;

  function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    uniform(min, max) {
      return min + next() * (max - min);
    },
    chance(chance) {
      return next() < chance;
    },
    int(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      if (items.length === 0) {
        throw new Error('CloneableRandomService.pick: items must not be empty');
      }
      return items[Math.floor(next() * items.length)];
    },
    clone() {
      // Snapshots whatever `a` is *right now* — every prior next() call on
      // this instance is reflected, but nothing this instance does *after*
      // cloning leaks back into the clone (and vice versa).
      return timelineRandomFromState(a);
    },
  };
}

/**
 * A dedicated random stream for timeline tie-breaks only (never shared with
 * the main battle RandomService used for damage/crit/AI target rolls —
 * MVP-3 correction 2). Keeping it separate is what makes previewing safe:
 * previewUpcomingOrder always works on a *clone*, so no number of preview
 * calls ever changes what the live battle actually rolls next.
 */
export function createTimelineRandomService(seed: number): CloneableRandomService {
  return timelineRandomFromState(seed >>> 0);
}

/**
 * Side-effect-free projection of the next `count` actors to act, given the
 * *current* live TimelineState. Never mutates `state` (resolveNextActor
 * already returns fresh state objects) and never consumes `random` (a
 * clone is taken up front and discarded after). Because the clone starts
 * from the exact same internal state the live `random` is currently in,
 * the first predicted id is guaranteed to match whatever the next *real*
 * resolveNextActor(actors, state, random) call produces, as long as no
 * other alive/dead-roster change happens in between (requirement:
 * "previewと実際の行動順一致").
 */
export function previewUpcomingOrder(
  actors: readonly TimelineActor[],
  state: TimelineState,
  random: CloneableRandomService,
  count: number,
): string[] {
  if (actors.length === 0 || count <= 0) return [];

  const rng = random.clone();
  let current = state;
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const result = resolveNextActor(actors, current, rng);
    ids.push(result.actorId);
    current = result.state;
  }
  return ids;
}
