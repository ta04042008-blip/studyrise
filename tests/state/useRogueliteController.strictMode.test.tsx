import { StrictMode, useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRogueliteController } from '../../src/state/useRogueliteController';
import { createRogueliteEngine, type RogueliteEngine } from '../../src/engine/roguelite/RogueliteEngine';
import type { RunState } from '../../src/engine/roguelite/RogueliteEngine.types';
import { createRandomService } from '../../src/engine/random/RandomService';
import { testCharacterA, testConfig, testRewardDefinitions, testSpellsById } from '../engine/roguelite/fixtures';

afterEach(cleanup);

/**
 * Regression test for a real bug caught via manual browser verification of
 * the MVP-4 Battle→Reward→Battle flow: confirm()'s original implementation
 * called engine.confirmAndApply() and mutated a ref *inside* a
 * `setPhase(prev => ...)` functional updater. React 18 StrictMode
 * (main.tsx wraps the app in it) deliberately invokes such updaters twice
 * to catch impurity — since the mutation was a side effect, the second
 * invocation re-applied the same reward on top of the first, silently
 * double-granting it (observed in the browser as a "+10" temp stat reward
 * becoming "+20"). The fix reads/writes plain refs and calls setState with
 * a value, never a function, so engine.confirmAndApply() itself must be
 * invoked exactly once per 決定 tap — checked here directly via a counting
 * wrapper, independent of which reward category the random offer happens
 * to include (so this test isn't sensitive to candidate generation).
 */
function makeCountingEngine() {
  const real = createRogueliteEngine({
    spellsById: testSpellsById,
    rewardDefinitions: testRewardDefinitions,
    config: testConfig,
    random: createRandomService(1),
  });
  let confirmAndApplyCalls = 0;
  let rerollCalls = 0;
  const engine: RogueliteEngine = {
    ...real,
    confirmAndApply: (phase, runState, characters) => {
      confirmAndApplyCalls++;
      return real.confirmAndApply(phase, runState, characters);
    },
    rerollCurrent: (phase, characters, runBuild) => {
      rerollCalls++;
      return real.rerollCurrent(phase, characters, runBuild);
    },
  };
  return { engine, callCounts: () => ({ confirmAndApplyCalls, rerollCalls }) };
}

function Harness({
  engine,
  onRunState,
}: {
  engine: RogueliteEngine;
  onRunState: (s: RunState) => void;
}) {
  const [runState, setRunState] = useState<RunState>(() => engine.createInitialRunState([testCharacterA]));

  const controller = useRogueliteController({
    characters: [testCharacterA],
    runState,
    isRareRewardEvent: false,
    engine,
    onComplete: (next) => {
      setRunState(next);
      onRunState(next);
    },
  });

  const candidate = controller.phase.currentRewardSession.candidates[0];
  return (
    <div>
      <button onClick={() => controller.selectCandidate(candidate.candidateKey)}>select</button>
      <button onClick={controller.confirm}>決定</button>
      <button onClick={controller.reroll}>reroll</button>
    </div>
  );
}

describe('useRogueliteController under React.StrictMode', () => {
  it('confirm() calls engine.confirmAndApply exactly once per tap, never twice', () => {
    const { engine, callCounts } = makeCountingEngine();
    let finalRunState: RunState | null = null;
    render(
      <StrictMode>
        <Harness engine={engine} onRunState={(s) => (finalRunState = s)} />
      </StrictMode>,
    );

    fireEvent.click(screen.getByText('select'));
    fireEvent.click(screen.getByText('決定'));

    expect(callCounts().confirmAndApplyCalls).toBe(1);
    expect(finalRunState).not.toBeNull();
  });

  it('reroll() calls engine.rerollCurrent exactly once per tap, never twice', () => {
    const { engine, callCounts } = makeCountingEngine();
    render(
      <StrictMode>
        <Harness engine={engine} onRunState={() => {}} />
      </StrictMode>,
    );

    fireEvent.click(screen.getByText('reroll'));

    expect(callCounts().rerollCalls).toBe(1);
  });
});
