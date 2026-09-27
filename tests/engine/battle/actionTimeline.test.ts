import { describe, expect, it } from 'vitest';
import {
  createTimelineState,
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
});
