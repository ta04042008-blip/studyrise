import { useCallback, useEffect, useRef, useState } from 'react';
import type { RogueliteEngine } from '../engine/roguelite/RogueliteEngine';
import type { RewardPhaseSession, RewardPhaseSnapshot, RunState } from '../engine/roguelite/RogueliteEngine.types';
import type { CharacterDefinition } from '../engine/battle/BattleEngine.types';
import { exportRandomState, type RandomService } from '../engine/random/RandomService';

export interface UseRogueliteControllerArgs {
  characters: CharacterDefinition[];
  runState: RunState;
  isRareRewardEvent: boolean;
  /** Owned/memoized by the caller (useRunScreen) — shared with resolveBattleInputsForRun so the whole zone uses one RandomService stream. */
  engine: RogueliteEngine;
  /**
   * MVP-9: the exact RandomService instance `engine` was constructed with.
   * RogueliteEngine never exposes its injected `random`, so this hook needs
   * its own reference to snapshot the reward RNG's cursor after each
   * mutating call.
   */
  random: RandomService;
  /** Fired exactly once, when the last deployed character's reward has been applied (spec: only then may the player proceed to the next battle). */
  onComplete: (nextRunState: RunState) => void;
  /**
   * MVP-9: resume an in-progress reward phase from a previously exported
   * snapshot instead of generating fresh initial candidates. Read only at
   * this hook's initial construction (mirrors useBattleController's
   * restoreSnapshot contract).
   */
  restoreSnapshot?: RewardPhaseSnapshot;
  /**
   * MVP-9: fired after initial candidate generation, reroll, and
   * confirm/apply — every one of these is a confirmed, RNG-consuming event
   * that must never be re-rolled on reload. Deliberately NOT fired after a
   * bare card selection (`selectCandidate`) — CLAUDE.md §13/user's explicit
   * instruction: an unconfirmed UI selection is not a save boundary.
   */
  onSnapshotChange?: (snapshot: RewardPhaseSnapshot) => void;
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
  random,
  onComplete,
  restoreSnapshot,
  onSnapshotChange,
}: UseRogueliteControllerArgs): RogueliteController {
  const [phase, setPhase] = useState<RewardPhaseSession>(() =>
    restoreSnapshot ? restoreSnapshot.phase : engine.startRewardPhase(characters, runState.build, isRareRewardEvent),
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

  useEffect(() => {
    // MVP-9: fires exactly once per newly (re)constructed engine — either a
    // fresh reward phase's initial candidate generation, or a resumed
    // phase's restored snapshot — mirroring useBattleController's identical
    // "sync once per engine construction" contract, never a generic
    // state-change watcher (CLAUDE.md §18/§28).
    onSnapshotChange?.({ phase: phaseRef.current, randomState: exportRandomState(random) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  const selectCandidate = useCallback(
    (candidateKey: string) => {
      const next = engine.selectCandidate(phaseRef.current, candidateKey);
      phaseRef.current = next;
      setPhase(next);
      // Deliberately no onSnapshotChange here — a bare card selection is not
      // yet a confirmed event (user's explicit MVP-9 instruction).
    },
    [engine],
  );

  const reroll = useCallback(() => {
    const next = engine.rerollCurrent(phaseRef.current, characters, runStateRef.current.build);
    phaseRef.current = next;
    setPhase(next);
    // MVP-9: reroll consumes RNG and a reroll credit — both must be saved
    // immediately so reload can never grant a free extra reroll.
    onSnapshotChange?.({ phase: next, randomState: exportRandomState(random) });
  }, [engine, characters, random, onSnapshotChange]);

  const confirm = useCallback(() => {
    const result = engine.confirmAndApply(phaseRef.current, runStateRef.current, characters);
    phaseRef.current = result.phase;
    runStateRef.current = result.runState;
    setPhase(result.phase);
    // MVP-9: confirming locks in + applies the reward (ゲーム上確定済み状態) —
    // and, when not yet complete, generates the NEXT character's candidates,
    // which is itself a fresh RNG-consuming event that must be saved too.
    onSnapshotChange?.({ phase: result.phase, randomState: exportRandomState(random) });
    if (result.phase.complete) {
      onComplete(result.runState);
    }
  }, [engine, characters, onComplete, random, onSnapshotChange]);

  return { phase, selectCandidate, reroll, confirm };
}
