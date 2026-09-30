import { describe, expect, it } from 'vitest';
import { applyEnemyObservation, describeObservedEnemyAction } from '../../../src/engine/bestiary/BestiarySystem';
import { createSampleInitialPermanentState } from '../../../src/data/progression/createInitialPermanentState';
import { validatePermanentPayload } from '../../../src/engine/save/PermanentSave';

describe('BestiarySystem', () => {
  it('records encounter, observed actions and defeat idempotently', () => {
    let state = {};

    let result = applyEnemyObservation(state, { type: 'ENCOUNTERED', enemyDefinitionId: 'enemy_a' });
    expect(result.changed).toBe(true);
    state = result.state;
    expect(state.enemy_a).toEqual({ encountered: true, defeated: false, observedActionNames: [] });

    result = applyEnemyObservation(state, { type: 'ACTION_OBSERVED', enemyDefinitionId: 'enemy_a', actionName: 'アタック' });
    expect(result.changed).toBe(true);
    state = result.state;
    expect(state.enemy_a.observedActionNames).toEqual(['アタック']);

    result = applyEnemyObservation(state, { type: 'ACTION_OBSERVED', enemyDefinitionId: 'enemy_a', actionName: 'アタック' });
    expect(result.changed).toBe(false);

    result = applyEnemyObservation(state, { type: 'DEFEATED', enemyDefinitionId: 'enemy_a' });
    expect(result.changed).toBe(true);
    state = result.state;
    expect(state.enemy_a.defeated).toBe(true);

    result = applyEnemyObservation(state, { type: 'DEFEATED', enemyDefinitionId: 'enemy_a' });
    expect(result.changed).toBe(false);
  });

  it('describes the currently implemented enemy action', () => {
    expect(describeObservedEnemyAction('アタック')).toContain('通常攻撃');
  });

  it('keeps PermanentSave v1 compatible while validating optional Bestiary data', () => {
    const state = createSampleInitialPermanentState();
    expect(validatePermanentPayload(state)).toBe(true);

    const legacy = { ...state };
    delete legacy.enemyBestiary;
    expect(validatePermanentPayload(legacy)).toBe(true);

    expect(validatePermanentPayload({
      ...state,
      enemyBestiary: {
        bad: { encountered: true, defeated: false, observedActionNames: [123] },
      },
    })).toBe(false);
  });
});
