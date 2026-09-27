import { describe, expect, it } from 'vitest';
import {
  createTimelineRandomService,
  createTimelineState,
  previewUpcomingOrder,
  resolveNextActor,
  type TimelineActor,
  type TimelineState,
} from '../../../src/engine/battle/actionTimeline';
import { createRandomService, type RandomService } from '../../../src/engine/random/RandomService';

describe('actionTimeline', () => {
  it('lets a faster actor act multiple times before a slower one acts once', () => {
    const actors: TimelineActor[] = [
      { id: 'fast', speed: 20 },
      { id: 'slow', speed: 5 },
    ];
    const random = createRandomService(1);
    let state: TimelineState = createTimelineState(actors);

    const winners: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = resolveNextActor(actors, state, random);
      winners.push(result.actorId);
      state = result.state;
    }

    // speed ratio 20:5 = 4:1 -> fast acts 4 times before slow's first action
    expect(winners).toEqual(['fast', 'fast', 'fast', 'fast', 'slow']);
  });

  it('breaks simultaneous arrival ties by higher speed', () => {
    const actors: TimelineActor[] = [
      { id: 'a', speed: 10 },
      { id: 'b', speed: 30 },
    ];
    const random = createRandomService(1);
    const state = createTimelineState(actors);

    const result = resolveNextActor(actors, state, random);

    expect(result.actorId).toBe('b');
  });

  it('breaks true speed ties randomly via the random service', () => {
    const actors: TimelineActor[] = [
      { id: 'a', speed: 10 },
      { id: 'b', speed: 10 },
    ];
    const state = createTimelineState(actors);

    const stubRandom: RandomService = {
      uniform: () => 0,
      chance: () => false,
      int: () => 0,
      pick: (items) => items[1], // always pick the second candidate
    };

    const result = resolveNextActor(actors, state, stubRandom);

    expect(result.actorId).toBe('b');
  });

  it('carries over leftover gauge (does not reset unfairly) across resolutions', () => {
    const actors: TimelineActor[] = [
      { id: 'fast', speed: 20 },
      { id: 'slow', speed: 5 },
    ];
    const random = createRandomService(1);
    let state = createTimelineState(actors);

    for (let i = 0; i < 4; i++) {
      state = resolveNextActor(actors, state, random).state;
    }

    // After 4 fast actions, slow should already be sitting at exactly the
    // threshold (gauge carried over tick by tick), ready to act next.
    expect(state.gauges.slow).toBe(100);
  });

  it('a KO-removed actor is simply excluded from the roster passed in — surviving gauges are untouched (MVP-3 requirement 1)', () => {
    const actors: TimelineActor[] = [
      { id: 'a', speed: 10 },
      { id: 'koTarget', speed: 10 },
    ];
    const random = createRandomService(1);
    let state = createTimelineState(actors);

    // First resolution: both reach the threshold together (tie); whoever
    // wins leaves the other sitting at exactly 100.
    const first = resolveNextActor(actors, state, random);
    state = first.state;
    const survivorId = first.actorId === 'a' ? 'koTarget' : 'a';
    const survivorGaugeBeforeRemoval = state.gauges[survivorId];
    expect(survivorGaugeBeforeRemoval).toBe(100);

    // Simulate "koTarget" getting KO'd right now: from this point on it is
    // simply left out of the actors array passed to resolveNextActor — no
    // full-timeline reset happens, so the survivor's gauge is exactly what
    // it was a moment ago (not reset to 0), and it wins immediately since
    // it's already at the threshold.
    const rosterWithoutKO: TimelineActor[] = [{ id: survivorId, speed: 10 }];
    const next = resolveNextActor(rosterWithoutKO, state, random);
    expect(next.actorId).toBe(survivorId);
    expect(state.gauges[survivorId]).toBe(survivorGaugeBeforeRemoval); // untouched by the removal itself
  });
});

describe('CloneableRandomService (timeline-only random stream)', () => {
  it('clone() produces the exact same future sequence as the source at the moment of cloning', () => {
    const source = createTimelineRandomService(42);
    source.pick(['x', 'y']); // advance the source a bit before cloning
    source.uniform(0, 1);

    const clone = source.clone();
    const fromSource = Array.from({ length: 5 }, () => source.uniform(0, 1));
    const fromClone = Array.from({ length: 5 }, () => clone.uniform(0, 1));

    expect(fromClone).toEqual(fromSource);
  });

  it("consuming a clone never affects the source's own future values", () => {
    const source = createTimelineRandomService(7);
    const clone = source.clone();

    // Drain the clone hard.
    for (let i = 0; i < 50; i++) clone.uniform(0, 1);

    // The source must produce exactly what an untouched stream from seed 7 would.
    const reference = createTimelineRandomService(7);
    const sourceNext = Array.from({ length: 5 }, () => source.uniform(0, 1));
    const referenceNext = Array.from({ length: 5 }, () => reference.uniform(0, 1));
    expect(sourceNext).toEqual(referenceNext);
  });
});

describe('previewUpcomingOrder', () => {
  it('never mutates the live TimelineState or consumes the live random stream (MVP-3 correction 2)', () => {
    const actors: TimelineActor[] = [
      { id: 'a', speed: 10 },
      { id: 'b', speed: 10 },
      { id: 'c', speed: 10 },
    ];
    const random = createTimelineRandomService(99);
    const state = createTimelineState(actors);
    const gaugesBefore = { ...state.gauges };

    const preview1 = previewUpcomingOrder(actors, state, random, 6);
    const preview2 = previewUpcomingOrder(actors, state, random, 6);

    // Calling it twice must be idempotent — no drift from a "consumed" stream.
    expect(preview2).toEqual(preview1);
    // The state object handed in is untouched.
    expect(state.gauges).toEqual(gaugesBefore);

    // And the live `random` must still produce its very first real value
    // fresh, as if preview had never been called.
    const untouchedReference = createTimelineRandomService(99);
    expect(random.pick(['only'])).toBe(untouchedReference.pick(['only']));
  });

  it('predicts exactly what resolveNextActor actually produces next, in order', () => {
    const actors: TimelineActor[] = [
      { id: 'a', speed: 7 },
      { id: 'b', speed: 7 },
      { id: 'c', speed: 13 },
    ];
    const random = createTimelineRandomService(2024);
    let state = createTimelineState(actors);

    const preview = previewUpcomingOrder(actors, state, random, 5);

    const actual: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = resolveNextActor(actors, state, random);
      actual.push(result.actorId);
      state = result.state;
    }

    expect(actual).toEqual(preview);
  });
});
