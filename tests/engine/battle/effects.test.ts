import { describe, expect, it } from 'vitest';
import { applyEffect } from '../../../src/engine/battle/effects';
import type { BattleActor } from '../../../src/engine/battle/BattleEngine.types';

function actor(overrides: Partial<BattleActor> = {}): BattleActor {
  return {
    id: 'a',
    name: 'A',
    kind: 'player',
    attack: 10,
    defense: 5,
    speed: 10,
    maxHp: 50,
    currentHp: 30,
    maxMp: 5,
    currentMp: 2,
    guard: null,
    ...overrides,
  };
}

describe('applyEffect', () => {
  it('DAMAGE reduces HP, floored at 0', () => {
    const a = actor({ currentHp: 10 });
    applyEffect(a, { type: 'DAMAGE', amount: 6 });
    expect(a.currentHp).toBe(4);

    applyEffect(a, { type: 'DAMAGE', amount: 100 });
    expect(a.currentHp).toBe(0);
  });

  it('HEAL increases HP, capped at maxHp', () => {
    const a = actor({ currentHp: 45, maxHp: 50 });
    applyEffect(a, { type: 'HEAL', amount: 3 });
    expect(a.currentHp).toBe(48);

    applyEffect(a, { type: 'HEAL', amount: 100 });
    expect(a.currentHp).toBe(50);
  });

  it('MP_GAIN increases MP, capped at maxMp', () => {
    const a = actor({ currentMp: 3, maxMp: 5 });
    applyEffect(a, { type: 'MP_GAIN', amount: 1 });
    expect(a.currentMp).toBe(4);

    applyEffect(a, { type: 'MP_GAIN', amount: 100 });
    expect(a.currentMp).toBe(5);
  });

  it('GUARD sets the actor guard status', () => {
    const a = actor({ guard: null });
    applyEffect(a, { type: 'GUARD', mitigationPercent: 0.4 });
    expect(a.guard).toEqual({ mitigationPercent: 0.4 });
  });

  it('GUARD overwrites an existing guard status', () => {
    const a = actor({ guard: { mitigationPercent: 0.2 } });
    applyEffect(a, { type: 'GUARD', mitigationPercent: 0.6 });
    expect(a.guard).toEqual({ mitigationPercent: 0.6 });
  });
});
