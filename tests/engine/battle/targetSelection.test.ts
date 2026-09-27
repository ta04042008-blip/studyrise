import { describe, expect, it } from 'vitest';
import { decideQuestionCommandTargeting, decideSpellOrItemTargeting } from '../../../src/engine/battle/targetSelection';

describe('decideQuestionCommandTargeting', () => {
  it('Guard/Charge always auto-target the acting actor itself, never requiring selection', () => {
    for (const command of ['guard', 'charge'] as const) {
      const decision = decideQuestionCommandTargeting(command, 'p1', ['e1', 'e2', 'e3']);
      expect(decision.needsSelection).toBe(false);
      expect(decision.autoTargetId).toBe('p1');
      expect(decision.candidateIds).toEqual(['p1']);
    }
  });

  it('Attack/Search auto-resolve to the sole alive enemy when only one is alive', () => {
    for (const command of ['attack', 'search'] as const) {
      const decision = decideQuestionCommandTargeting(command, 'p1', ['e1']);
      expect(decision.needsSelection).toBe(false);
      expect(decision.autoTargetId).toBe('e1');
      expect(decision.candidateIds).toEqual(['e1']);
    }
  });

  it('Attack/Search require selection among more than one alive enemy', () => {
    for (const command of ['attack', 'search'] as const) {
      const decision = decideQuestionCommandTargeting(command, 'p1', ['e1', 'e2']);
      expect(decision.needsSelection).toBe(true);
      expect(decision.autoTargetId).toBeNull();
      expect(decision.candidateIds).toEqual(['e1', 'e2']);
    }
  });
});

describe('decideSpellOrItemTargeting', () => {
  it("'self' targetType never requires selection, regardless of enemy count", () => {
    const decision = decideSpellOrItemTargeting('self', 'p1', ['e1', 'e2']);
    expect(decision.needsSelection).toBe(false);
    expect(decision.autoTargetId).toBe('p1');
  });

  it("'enemy' targetType follows the same alive-enemy-count rule as Attack", () => {
    const single = decideSpellOrItemTargeting('enemy', 'p1', ['e1']);
    expect(single.needsSelection).toBe(false);
    expect(single.autoTargetId).toBe('e1');

    const multiple = decideSpellOrItemTargeting('enemy', 'p1', ['e1', 'e2']);
    expect(multiple.needsSelection).toBe(true);
    expect(multiple.autoTargetId).toBeNull();
    expect(multiple.candidateIds).toEqual(['e1', 'e2']);
  });
});
