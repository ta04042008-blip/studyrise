import type { CharacterDefinition, PlayerCommandModifiers, SpellDefinition } from '../battle/BattleEngine.types';
import type { RandomService } from '../random/RandomService';
import type { RewardConfig } from '../../config/rewardConfig';
import {
  RARITIES,
  type Rarity,
  type RewardCandidate,
  type RewardCategory,
  type RewardDefinition,
  type RewardPhaseSession,
  type RewardSession,
  type RunBuild,
  type RunBuildCharacterState,
  type RunState,
} from './RogueliteEngine.types';

/**
 * RogueliteEngine (CLAUDE.md §18.5, spec §9): reward candidate generation,
 * rarity roll, per-offer weighting, exclusion, reroll, and application.
 *
 * Design notes (see MVP-4 planning discussion — flagged so a future spec
 * revision can revisit them deliberately, not accidentally):
 *  - Rarity is rolled fully independently of, and never gates, which reward
 *    content is offered (spec §9.4/§9.5/§11.5's "must not influence" rules
 *    generalize cleanly to "rarity is display-only in MVP-4" — no reward
 *    definition's magnitude currently varies by rolled rarity).
 *  - The per-character-bias-suppression + cross-character-offer model from
 *    the original MVP-4 draft was superseded: each deployed character gets
 *    its own fixed-target reward session (RewardPhaseSession), so there is
 *    no cross-character weighting to suppress at all.
 *
 * Every exported function here is pure (input state → new state); the
 * caller (useRogueliteController/useRunController) is what threads the
 * result through React state. No BattleEngine phase is added — the whole
 * module operates strictly between one BattleEngine instance's
 * BATTLE_END(win) and the next instance's construction.
 */
export interface RogueliteDeps {
  spellsById: Record<string, SpellDefinition>;
  rewardDefinitions: RewardDefinition[];
  config: RewardConfig;
  random: RandomService;
}

export interface RogueliteEngine {
  createDefaultRunBuild(characters: CharacterDefinition[]): RunBuild;
  createInitialRunState(characters: CharacterDefinition[]): RunState;
  resetRunBuild(runState: RunState, characters: CharacterDefinition[]): RunState;
  resolveBattleInputsForRun(
    characters: CharacterDefinition[],
    runState: RunState,
  ): {
    players: CharacterDefinition[];
    knownSpellsByPlayerId: Record<string, { spellId: string; level: number }[]>;
    playerCommandModifiers: Record<string, PlayerCommandModifiers>;
    initialHpByPlayerId: Record<string, number>;
  };
  startRewardPhase(
    characters: CharacterDefinition[],
    runBuild: RunBuild,
    isRareRewardEvent: boolean,
  ): RewardPhaseSession;
  selectCandidate(phase: RewardPhaseSession, candidateKey: string): RewardPhaseSession;
  rerollCurrent(
    phase: RewardPhaseSession,
    characters: CharacterDefinition[],
    runBuild: RunBuild,
  ): RewardPhaseSession;
  /** カード選択 → 決定: CANDIDATES_READY(+selected) → LOCKED_IN. No-op if nothing is selected, or a selection/reroll is no longer possible. */
  confirmSelection(phase: RewardPhaseSession): RewardPhaseSession;
  /** LOCKED_IN → apply → APPLIED (and advances to the next character, or completes the phase). No-op if not currently LOCKED_IN — this is what makes a duplicate apply attempt safe (CLAUDE.md §13). */
  applyLockedIn(
    phase: RewardPhaseSession,
    runState: RunState,
    characters: CharacterDefinition[],
  ): { phase: RewardPhaseSession; runState: RunState };
  /** Convenience: confirmSelection + applyLockedIn in one call, for a single "決定" tap (spec's reward flow has no separate user-facing step between them). No-op (returns the same references) if not currently selectable. */
  confirmAndApply(
    phase: RewardPhaseSession,
    runState: RunState,
    characters: CharacterDefinition[],
  ): { phase: RewardPhaseSession; runState: RunState };
}

/** Exported for direct unit testing of the weighted-random primitive itself. */
export function weightedPick<T>(items: readonly T[], weights: readonly number[], random: RandomService): T {
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return random.pick(items);
  let roll = random.uniform(0, total);
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Exported for direct unit testing: rolls a rarity from `config.rarityWeights`
 * alone (spec §9.4). Deliberately takes no ★/character/build/synergy input
 * of any kind — there is nothing in this function's signature that COULD
 * let any of those influence the roll (spec §9.5/§11.5's "must not
 * influence rarity" rules).
 */
export function rollRarity(config: RewardConfig, random: RandomService): Rarity {
  return weightedPick(
    RARITIES,
    RARITIES.map((r) => config.rarityWeights[r]),
    random,
  );
}

export function createRogueliteEngine(deps: RogueliteDeps): RogueliteEngine {
  function createDefaultRunBuild(characters: CharacterDefinition[]): RunBuild {
    const build: RunBuild = { characters: {} };
    for (const c of characters) {
      build.characters[c.id] = {
        characterId: c.id,
        knownSpells: [{ spellId: c.initialSpellId, level: 1 }],
        commandBoosts: {},
        tempStatBoosts: {},
      };
    }
    return build;
  }

  function createInitialRunState(characters: CharacterDefinition[]): RunState {
    return {
      build: createDefaultRunBuild(characters),
      currentHpByCharacterId: Object.fromEntries(characters.map((c) => [c.id, c.baseStats.maxHp])),
      rewardPhase: null,
    };
  }

  function resetRunBuild(runState: RunState, characters: CharacterDefinition[]): RunState {
    // Spec §9.8: clear / self-return / defeat all wipe identically — there
    // is deliberately no reason-based branching here.
    return { ...runState, build: createDefaultRunBuild(characters), rewardPhase: null };
  }

  function effectiveMaxHp(character: CharacterDefinition, buildState: RunBuildCharacterState): number {
    const hpLevel = buildState.tempStatBoosts.hp ?? 0;
    return character.baseStats.maxHp + hpLevel * deps.config.tempStatBoostPerLevel.hp;
  }

  function resolveBattleInputsForRun(characters: CharacterDefinition[], runState: RunState) {
    const players: CharacterDefinition[] = [];
    const knownSpellsByPlayerId: Record<string, { spellId: string; level: number }[]> = {};
    const playerCommandModifiers: Record<string, PlayerCommandModifiers> = {};
    const initialHpByPlayerId: Record<string, number> = {};

    for (const character of characters) {
      const buildState = runState.build.characters[character.id];
      const perLevel = deps.config.tempStatBoostPerLevel;
      const effectiveBaseStats = {
        ...character.baseStats,
        maxHp: character.baseStats.maxHp + (buildState.tempStatBoosts.hp ?? 0) * perLevel.hp,
        attack: character.baseStats.attack + (buildState.tempStatBoosts.attack ?? 0) * perLevel.attack,
        defense: character.baseStats.defense + (buildState.tempStatBoosts.defense ?? 0) * perLevel.defense,
        speed: character.baseStats.speed + (buildState.tempStatBoosts.speed ?? 0) * perLevel.speed,
      };
      players.push({ ...character, baseStats: effectiveBaseStats });

      knownSpellsByPlayerId[character.id] = buildState.knownSpells.map((s) => ({ ...s }));

      const commandPerLevel = deps.config.commandBoostPerLevel;
      const modifiers: PlayerCommandModifiers = {};
      const attackBoost = buildState.commandBoosts.attack ?? 0;
      if (attackBoost > 0) modifiers.attackDamageBonusPercent = attackBoost * commandPerLevel.attack;
      const guardBoost = buildState.commandBoosts.guard ?? 0;
      if (guardBoost > 0) modifiers.guardMitigationBonus = guardBoost * commandPerLevel.guard;
      const chargeBoost = buildState.commandBoosts.charge ?? 0;
      if (chargeBoost > 0) modifiers.chargeGreatSuccessBonus = chargeBoost * commandPerLevel.charge;
      const searchBoost = buildState.commandBoosts.search ?? 0;
      if (searchBoost > 0) modifiers.searchRevealBonusCount = searchBoost * commandPerLevel.search;
      playerCommandModifiers[character.id] = modifiers;

      const maxHp = effectiveBaseStats.maxHp;
      const carriedHp = runState.currentHpByCharacterId[character.id] ?? maxHp;
      initialHpByPlayerId[character.id] = Math.min(maxHp, Math.max(0, carriedHp));
    }

    return { players, knownSpellsByPlayerId, playerCommandModifiers, initialHpByPlayerId };
  }

  function isEligible(reward: RewardDefinition, character: CharacterDefinition, buildState: RunBuildCharacterState): boolean {
    switch (reward.category) {
      case 'NEW_SPELL': {
        if (buildState.knownSpells.length >= 3) return false;
        if (!character.additionalSpellPoolIds.includes(reward.spellId)) return false;
        return !buildState.knownSpells.some((k) => k.spellId === reward.spellId);
      }
      case 'SPELL_UPGRADE': {
        const known = buildState.knownSpells.find((k) => k.spellId === reward.spellId);
        if (!known) return false;
        const spell = deps.spellsById[reward.spellId];
        return !!spell && known.level < spell.maxLevel;
      }
      case 'COMMAND_BOOST':
        return (buildState.commandBoosts[reward.command] ?? 0) < deps.config.commandBoostMaxLevel;
      case 'TEMP_STAT_BOOST':
        return (buildState.tempStatBoosts[reward.stat] ?? 0) < deps.config.tempStatBoostMaxLevel;
      case 'HEAL_SPECIAL':
        return true;
    }
  }

  /**
   * Spec §9.5: "現在ビルドに合う候補を少しだけ出しやすくしてよい...強い誘導
   * は禁止". Only one binary condition is ever checked per reward (never
   * combined), so the result is always either 1 or exactly the configured
   * cap — never a stacked multiplier.
   */
  function synergyMultiplier(reward: RewardDefinition, buildState: RunBuildCharacterState): number {
    let matches = false;
    if (reward.category === 'SPELL_UPGRADE') {
      matches = true; // eligibility already requires the spell to be known
    } else if (reward.category === 'COMMAND_BOOST') {
      matches = (buildState.commandBoosts[reward.command] ?? 0) > 0;
    } else if (reward.category === 'TEMP_STAT_BOOST') {
      matches = (buildState.tempStatBoosts[reward.stat] ?? 0) > 0;
    }
    return matches ? deps.config.synergyMultiplierCap : 1;
  }

  function generateOneCandidate(
    character: CharacterDefinition,
    buildState: RunBuildCharacterState,
    excludeRewardIds: ReadonlySet<string>,
  ): RewardCandidate | null {
    const eligible = deps.rewardDefinitions.filter(
      (r) => isEligible(r, character, buildState) && !excludeRewardIds.has(r.id),
    );
    if (eligible.length === 0) return null;

    // Step 4 (candidate-generation order per spec discussion): rarity,
    // rolled independently of everything below.
    const rarity = rollRarity(deps.config, deps.random);

    // Step 5: category, weighted by what's actually eligible right now,
    // with the spell-3-slots-full SPELL_UPGRADE bonus (spec §9.6).
    const byCategory = new Map<RewardCategory, RewardDefinition[]>();
    for (const r of eligible) {
      const list = byCategory.get(r.category);
      if (list) list.push(r);
      else byCategory.set(r.category, [r]);
    }
    const spellSlotsFull = buildState.knownSpells.length >= 3;
    const categories = [...byCategory.keys()];
    const categoryWeights = categories.map((cat) => {
      let weight = deps.config.categoryBaseWeight;
      if (cat === 'SPELL_UPGRADE' && spellSlotsFull) weight *= deps.config.spellSlotsFullUpgradeWeightMultiplier;
      return weight;
    });
    const category = weightedPick(categories, categoryWeights, deps.random);

    // Step 6/7: synergy-weighted pick of one specific reward within it.
    const defsInCategory = byCategory.get(category)!;
    const weights = defsInCategory.map((d) => synergyMultiplier(d, buildState));
    const reward = weightedPick(defsInCategory, weights, deps.random);

    return { candidateKey: `${character.id}:${reward.id}`, characterId: character.id, rarity, reward };
  }

  function generateCandidateList(
    character: CharacterDefinition,
    buildState: RunBuildCharacterState,
    count: number,
    preExcludeRewardIds: ReadonlySet<string>,
  ): RewardCandidate[] {
    const result: RewardCandidate[] = [];
    const usedRewardIds = new Set(preExcludeRewardIds);

    for (let i = 0; i < count; i++) {
      let candidate = generateOneCandidate(character, buildState, usedRewardIds);
      if (!candidate) {
        // Pool exhausted even after relaxing the pre-seeded (in-offer/old-
        // offer) exclusions — final fallback: allow a duplicate reward
        // rather than shipping fewer than `count` candidates (spec §9.1:
        // no skip, ever).
        candidate = generateOneCandidate(character, buildState, new Set());
        if (candidate && import.meta.env.DEV) {
          console.warn(
            `[RogueliteEngine] reward pool exhausted for character "${character.id}" — allowing a duplicate candidate.`,
          );
        }
      }
      if (!candidate) break; // no eligible reward exists at all; never throw mid-flow
      result.push(candidate);
      usedRewardIds.add(candidate.reward.id);
    }
    return result;
  }

  function buildSessionForCharacter(
    characterId: string,
    characters: CharacterDefinition[],
    runBuild: RunBuild,
    isRareRewardEvent: boolean,
  ): RewardSession {
    const character = characters.find((c) => c.id === characterId)!;
    const buildState = runBuild.characters[characterId];
    const count = isRareRewardEvent ? deps.config.candidateCountRareEvent : deps.config.candidateCountNormal;
    const candidates = generateCandidateList(character, buildState, count, new Set());
    return {
      targetCharacterId: characterId,
      isRareRewardEvent,
      candidates,
      rerollRemaining: deps.config.freeRerollCount,
      status: 'CANDIDATES_READY',
      selectedCandidateKey: null,
    };
  }

  function startRewardPhase(
    characters: CharacterDefinition[],
    runBuild: RunBuild,
    isRareRewardEvent: boolean,
  ): RewardPhaseSession {
    // Every deployed character gets exactly one sequential reward pick, in
    // party order, KO'd characters included (spec §9.3/reward-phase spec).
    const characterOrder = characters.map((c) => c.id);
    const currentRewardSession = buildSessionForCharacter(characterOrder[0], characters, runBuild, isRareRewardEvent);
    return { characterOrder, currentCharacterIndex: 0, currentRewardSession, isRareRewardEvent, complete: false };
  }

  function selectCandidate(phase: RewardPhaseSession, candidateKey: string): RewardPhaseSession {
    const session = phase.currentRewardSession;
    if (session.status !== 'CANDIDATES_READY') return phase; // no-op (CLAUDE.md §13)
    if (!session.candidates.some((c) => c.candidateKey === candidateKey)) return phase; // no-op, invalid key
    return { ...phase, currentRewardSession: { ...session, selectedCandidateKey: candidateKey } };
  }

  function rerollCurrent(phase: RewardPhaseSession, characters: CharacterDefinition[], runBuild: RunBuild): RewardPhaseSession {
    const session = phase.currentRewardSession;
    if (session.status !== 'CANDIDATES_READY' || session.rerollRemaining <= 0) return phase; // no-op
    const character = characters.find((c) => c.id === session.targetCharacterId)!;
    const buildState = runBuild.characters[session.targetCharacterId];
    // Best-effort: never bring back a candidate that existed before this
    // reroll (spec: "リロール前に存在したcandidate keyを新しい候補へ再登場
    // させない"). Since the character is fixed for the whole session, this
    // reduces to "don't reuse the same reward id", handled by
    // generateCandidateList's fallback-with-DEV-warning if the pool is too
    // small to honor it.
    const oldRewardIds = new Set(session.candidates.map((c) => c.reward.id));
    const candidates = generateCandidateList(character, buildState, session.candidates.length, oldRewardIds);
    return {
      ...phase,
      currentRewardSession: { ...session, candidates, rerollRemaining: session.rerollRemaining - 1, selectedCandidateKey: null },
    };
  }

  function applyRewardToBuild(build: RunBuild, character: CharacterDefinition, reward: RewardDefinition): RunBuild {
    const state = build.characters[character.id];
    let nextState: RunBuildCharacterState = state;

    switch (reward.category) {
      case 'NEW_SPELL': {
        if (state.knownSpells.length < 3 && !state.knownSpells.some((k) => k.spellId === reward.spellId)) {
          nextState = { ...state, knownSpells: [...state.knownSpells, { spellId: reward.spellId, level: 1 }] };
        }
        break;
      }
      case 'SPELL_UPGRADE': {
        const spell = deps.spellsById[reward.spellId];
        nextState = {
          ...state,
          knownSpells: state.knownSpells.map((k) =>
            k.spellId === reward.spellId ? { ...k, level: Math.min(spell.maxLevel, k.level + 1) } : k,
          ),
        };
        break;
      }
      case 'COMMAND_BOOST': {
        const current = state.commandBoosts[reward.command] ?? 0;
        nextState = {
          ...state,
          commandBoosts: {
            ...state.commandBoosts,
            [reward.command]: Math.min(deps.config.commandBoostMaxLevel, current + 1),
          },
        };
        break;
      }
      case 'TEMP_STAT_BOOST': {
        const current = state.tempStatBoosts[reward.stat] ?? 0;
        nextState = {
          ...state,
          tempStatBoosts: {
            ...state.tempStatBoosts,
            [reward.stat]: Math.min(deps.config.tempStatBoostMaxLevel, current + 1),
          },
        };
        break;
      }
      case 'HEAL_SPECIAL':
        break; // no RunBuild change — see applyRewardToCurrentHp
    }

    return { ...build, characters: { ...build.characters, [character.id]: nextState } };
  }

  function applyRewardToCurrentHp(
    currentHpByCharacterId: Record<string, number>,
    character: CharacterDefinition,
    reward: RewardDefinition,
    nextBuild: RunBuild,
  ): Record<string, number> {
    const nextState = nextBuild.characters[character.id];
    const maxHp = effectiveMaxHp(character, nextState);
    const current = currentHpByCharacterId[character.id] ?? maxHp;

    if (reward.category === 'TEMP_STAT_BOOST' && reward.stat === 'hp') {
      // Spec §9.7: current HP bumps by the same absolute amount immediately,
      // even though the rest of the stat boost only takes effect next zone.
      return { ...currentHpByCharacterId, [character.id]: Math.min(maxHp, current + deps.config.tempStatBoostPerLevel.hp) };
    }
    if (reward.category === 'HEAL_SPECIAL' && reward.applicationTiming === 'IMMEDIATE') {
      const healed = current + Math.round(maxHp * reward.healPercentOfMaxHp);
      return { ...currentHpByCharacterId, [character.id]: Math.min(maxHp, healed) };
    }
    return currentHpByCharacterId;
  }

  function confirmSelection(phase: RewardPhaseSession): RewardPhaseSession {
    const session = phase.currentRewardSession;
    if (session.status !== 'CANDIDATES_READY' || !session.selectedCandidateKey) {
      return phase; // no-op (CLAUDE.md §13)
    }
    return { ...phase, currentRewardSession: { ...session, status: 'LOCKED_IN' } };
  }

  function applyLockedIn(
    phase: RewardPhaseSession,
    runState: RunState,
    characters: CharacterDefinition[],
  ): { phase: RewardPhaseSession; runState: RunState } {
    const session = phase.currentRewardSession;
    if (session.status !== 'LOCKED_IN' || !session.selectedCandidateKey) {
      return { phase, runState }; // no-op: already applied, or never confirmed (double-tap guard)
    }
    const candidate = session.candidates.find((c) => c.candidateKey === session.selectedCandidateKey);
    if (!candidate) return { phase, runState };
    const character = characters.find((c) => c.id === session.targetCharacterId)!;

    const nextBuild = applyRewardToBuild(runState.build, character, candidate.reward);
    const nextCurrentHp = applyRewardToCurrentHp(runState.currentHpByCharacterId, character, candidate.reward, nextBuild);

    const nextIndex = phase.currentCharacterIndex + 1;
    let nextPhase: RewardPhaseSession;
    if (nextIndex < phase.characterOrder.length) {
      const nextSession = buildSessionForCharacter(phase.characterOrder[nextIndex], characters, nextBuild, phase.isRareRewardEvent);
      nextPhase = { ...phase, currentCharacterIndex: nextIndex, currentRewardSession: nextSession, complete: false };
    } else {
      nextPhase = { ...phase, currentRewardSession: { ...session, status: 'APPLIED' }, complete: true };
    }

    const nextRunState: RunState = { build: nextBuild, currentHpByCharacterId: nextCurrentHp, rewardPhase: nextPhase };
    return { phase: nextPhase, runState: nextRunState };
  }

  function confirmAndApply(
    phase: RewardPhaseSession,
    runState: RunState,
    characters: CharacterDefinition[],
  ): { phase: RewardPhaseSession; runState: RunState } {
    const lockedInPhase = confirmSelection(phase);
    return applyLockedIn(lockedInPhase, runState, characters);
  }

  return {
    createDefaultRunBuild,
    createInitialRunState,
    resetRunBuild,
    resolveBattleInputsForRun,
    startRewardPhase,
    selectCandidate,
    rerollCurrent,
    confirmSelection,
    applyLockedIn,
    confirmAndApply,
  };
}
