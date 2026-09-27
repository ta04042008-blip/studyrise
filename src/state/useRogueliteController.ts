import { useCallback, useRef, useState } from 'react';
import type { RogueliteEngine } from '../engine/roguelite/RogueliteEngine';
import type { RewardPhaseSession, RunState } from '../engine/roguelite/RogueliteEngine.types';
import type { CharacterDefinition } from '../engine/battle/BattleEngine.types';

export interface UseRogueliteControllerArgs {
  characters: CharacterDefinition[];
  runState: RunState;
  isRareRewardEvent: boolean;
  /** Owned/memoized by the caller (useRunScreen) — shared with resolveBattleInputsForRun so the whole zone uses one RandomService stream. */
  engine: RogueliteEngine;
  /** Fired exactly once, when the last deployed character's reward has been applied (spec: only then may the player proceed to the next battle). */
  onComplete: (nextRunState: RunState) => void;
}

export interface RogueliteController {
  phase: RewardPhaseSession;
  selectCandidate: (candidateKey: string) => void;
  reroll: () => void;
  confirm: () => void;
}

/**
 * Bridges React state to RogueliteEngine (CLAUDE.md §9), the same way
 * useBattleController bridges to BattleEngine: dispatches to the (pure)
 * engine functions and re-renders on the result. No reward calculation
 * happens in this hook or in RewardScreen/RewardCard.
 */
export function useRogueliteController({
  characters,
  runState,
  isRareRewardEvent,
  engine,
  onComplete,
}: UseRogueliteControllerArgs): RogueliteController {
  const [phase, setPhase] = useState<RewardPhaseSession>(() =>
    engine.startRewardPhase(characters, runState.build, isRareRewardEvent),
  );
  // RogueliteEngine's functions are pure, so each apply produces a new
  // RunState; this hook only needs to remember the latest one to feed the
  // next character's reroll/apply calls and to hand the final result to
  // onComplete — nothing here re-renders on RunState changes mid-phase.
  const runStateRef = useRef(runState);
  runStateRef.current = runState;
  // Mirrors `phase` for reads inside event handlers below. Using this
  // instead of a `setPhase(p => ...)` functional updater matters: React 18
  // StrictMode (dev only) deliberately invokes a setState updater function
  // TWICE to catch impurity, and engine calls here are NOT safe to run
  // twice — confirmAndApply mutates runStateRef.current and fires
  // onComplete as a side effect, so a double-invoke would silently apply
  // the same reward twice. Reading/writing plain refs and calling
  // setState with a value (never a function) sidesteps that entirely.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const selectCandidate = useCallback(
    (candidateKey: string) => {
      const next = engine.selectCandidate(phaseRef.current, candidateKey);
      phaseRef.current = next;
      setPhase(next);
    },
    [engine],
  );

  const reroll = useCallback(() => {
    const next = engine.rerollCurrent(phaseRef.current, characters, runStateRef.current.build);
    phaseRef.current = next;
    setPhase(next);
  }, [engine, characters]);

  const confirm = useCallback(() => {
    const result = engine.confirmAndApply(phaseRef.current, runStateRef.current, characters);
    phaseRef.current = result.phase;
    runStateRef.current = result.runState;
    setPhase(result.phase);
    if (result.phase.complete) {
      onComplete(result.runState);
    }
  }, [engine, characters, onComplete]);

  return { phase, selectCandidate, reroll, confirm };
}
