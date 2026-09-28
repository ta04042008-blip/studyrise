import type { StarLevel } from '../../types/stats';
import type { BattleConfig } from '../../config/battleConfig';
import type { RandomService } from '../random/RandomService';
import type { QuestionEngine } from '../question/QuestionEngine';
import type { MultipleChoiceAnswer } from '../question/QuestionEngine.types';
import { calculateAttackDamage } from './damage';
import { applyEffect } from './effects';
import { spellLevelData } from './spellLevel';
import {
  createTimelineRandomService,
  createTimelineState,
  previewUpcomingOrder,
  resolveNextActor,
  type CloneableRandomService,
  type TimelineActor,
  type TimelineState,
} from './actionTimeline';
import { decideQuestionCommandTargeting, decideSpellOrItemTargeting } from './targetSelection';
import type {
  BattleActor,
  BattleState,
  CharacterDefinition,
  EnemyDefinition,
  ItemBattleSlot,
  KnownSpell,
  PlannedEnemyAction,
  PlayerCommandModifiers,
  QuestionCommandKind,
  QuestionCommandOutcome,
  SpellDefinition,
} from './BattleEngine.types';

/** PLACEHOLDER: how many future actors the UI's turn-order strip shows (spec §5.2 requirement 5 gives no exact count). */
const UPCOMING_PREVIEW_COUNT = 4;

export interface CreateBattleEngineOptions {
  /** 1〜3 characters (spec §4.1). Order is fixed for this battle. */
  players: CharacterDefinition[];
  /** 1 or more enemies (spec §2.1: a zone = an enemy formation). */
  enemies: EnemyDefinition[];
  questionEngine: QuestionEngine;
  config: BattleConfig;
  random: RandomService;
  /** Lookup for each player's `initialSpellId` (CLAUDE.md §15: stable IDs, not embedded content). */
  spellsById: Record<string, SpellDefinition>;
  /** Party-shared battle-local item stock (spec §5.10; MVP-3 correction 5 — never per-player). */
  initialItems: ItemBattleSlot[];
  /**
   * Run-provided known-spells-and-levels for each player (spec §4.5: up to
   * 3 once roguelite NEW_SPELL rewards are applied between battles).
   * Defaults to `[{ spellId: initialSpellId, level: 1 }]` per player when
   * omitted, which is byte-identical to MVP-1〜3's single-spell behavior —
   * existing callers never need to pass this.
   */
  knownSpellsByPlayerId?: Record<string, { spellId: string; level: number }[]>;
  /**
   * Run-provided per-player command-boost bonuses (spec §9.2 category 3),
   * already resolved to a total magnitude by whoever built this battle
   * (RogueliteEngine's resolveBattleInputsForRun). Defaults to no bonuses.
   */
  playerCommandModifiers?: Record<string, PlayerCommandModifiers>;
  /**
   * Starting HP for each player, clamped to their maxHp (RogueliteEngine's
   * resolveBattleInputsForRun carries the previous battle's ending HP, plus
   * any HEAL_SPECIAL/max-HP roguelite rewards, into the next one). Defaults
   * to full maxHp per player when omitted — byte-identical to MVP-1〜3,
   * which always started a fresh battle at full HP.
   */
  initialHpByPlayerId?: Record<string, number>;
}

export interface BattleEngine {
  getState(): BattleState;
  /**
   * COMMAND_SELECT → TARGET_SELECT when the command needs a choice among
   * more than one alive enemy (Attack/Search), otherwise straight to
   * SUBJECT_DIFFICULTY_SELECT with the target auto-resolved (a single
   * enemy, or Guard/Charge's self-target — spec §5.6/§5.9, MVP-3
   * requirement 6/10).
   */
  selectCommand(command: QuestionCommandKind): void;
  /**
   * Resolves whatever is currently awaiting a target — a question command
   * (→ SUBJECT_DIFFICULTY_SELECT), a Spell, or an Item (→ resolves and
   * lands on RESULT_APPLY). Only valid while phase === 'TARGET_SELECT'.
   */
  selectTarget(targetId: string): void;
  /** SUBJECT_DIFFICULTY_SELECT → QUESTION. */
  selectSubjectAndStar(subject: string, star: StarLevel): void;
  /**
   * QUESTION → COMMAND_ANIMATION. Correctness/effect are computed here, but
   * actor state is NOT mutated yet (that happens at RESULT_APPLY, triggered
   * by the next advance() call) — required order: QUESTION → 回答確定 →
   * COMMAND_ANIMATION → RESULT_APPLY → 正誤表示 → EXPLANATION, for both
   * correct and incorrect/dont_know answers, for every question-based
   * command, even when it KOs the last enemy (MVP-3 correction 6).
   */
  submitAnswer(answer: MultipleChoiceAnswer): void;
  /**
   * Spell's short flow (spec §5.3): コマンド → 対象/選択 → 条件確認 →
   * 即時処理. `spellId` must be one the current actor currently knows
   * (spec §4.5 — 1〜3 known spells; the UI only ever needs to show a
   * spell-picker step when there is more than one, per §5.3's 対象選択
   * ルール precedent, but the engine always takes the id explicitly, the
   * same way useItem(itemId) already does). When the resolved spell's
   * targetType is 'enemy' and more than one enemy is alive, this instead
   * enters TARGET_SELECT; otherwise (self-target, or exactly one alive
   * enemy) it validates MP cost at the spell's current level, deducts it,
   * and applies that level's effects immediately, landing on the
   * RESULT_APPLY resting phase (no question → no 正誤 → no EXPLANATION).
   */
  useSpell(spellId: string): void;
  /** Same flow as useSpell(), consuming one use of the named item from the party-shared pool. */
  useItem(itemId: string): void;
  /**
   * Advances past the current resting phase:
   * - COMMAND_ANIMATION → applies the pending result (RESULT_APPLY) → EXPLANATION.
   * - EXPLANATION or RESULT_APPLY(spell/item) → if all enemies are already
   *   dead, finalizes BATTLE_END(win); otherwise resolves turns via the
   *   speed timeline (ENEMY_ACTION for each enemy in between, possibly
   *   several actors in a row) until either an alive player is up next
   *   (COMMAND_SELECT) or every player has been KO'd (BATTLE_END/lose).
   */
  advance(): void;
}

function actorFromCharacter(def: CharacterDefinition, initialHp?: number): BattleActor {
  const maxHp = def.baseStats.maxHp;
  return {
    id: def.id,
    name: def.name,
    kind: 'player',
    attack: def.baseStats.attack,
    defense: def.baseStats.defense,
    speed: def.baseStats.speed,
    maxHp,
    currentHp: initialHp === undefined ? maxHp : Math.min(maxHp, Math.max(0, initialHp)),
    maxMp: def.baseStats.maxMp,
    // Spec §8: MP resets to 0 at zone start.
    currentMp: 0,
    guard: null,
  };
}

function actorFromEnemy(def: EnemyDefinition): BattleActor {
  return {
    id: def.id,
    name: def.name,
    kind: 'enemy',
    attack: def.baseStats.attack,
    defense: def.baseStats.defense,
    speed: def.baseStats.speed,
    maxHp: def.baseStats.maxHp,
    currentHp: def.baseStats.maxHp,
    maxMp: 0,
    currentMp: 0,
    guard: null,
  };
}

export function createBattleEngine(options: CreateBattleEngineOptions): BattleEngine {
  const { players: playerDefs, enemies: enemyDefs, questionEngine, config, random, spellsById, initialItems } =
    options;

  const players: BattleActor[] = playerDefs.map((d) => actorFromCharacter(d, options.initialHpByPlayerId?.[d.id]));
  const enemies: BattleActor[] = enemyDefs.map(actorFromEnemy);

  // Defaults preserve MVP-1〜3 behavior exactly: one known spell (the
  // character's initialSpellId) at level 1, no command-boost bonuses.
  const knownSpellLevelsByPlayerId: Record<string, { spellId: string; level: number }[]> =
    options.knownSpellsByPlayerId ??
    Object.fromEntries(playerDefs.map((d) => [d.id, [{ spellId: d.initialSpellId, level: 1 }]]));
  const commandModifiers: Record<string, PlayerCommandModifiers> = options.playerCommandModifiers ?? {};

  const knownSpellsByPlayerId: Record<string, KnownSpell[]> = Object.fromEntries(
    Object.entries(knownSpellLevelsByPlayerId).map(([playerId, entries]) => [
      playerId,
      entries.map(({ spellId, level }) => {
        const spell = spellsById[spellId];
        const levelData = spellLevelData(spell, level);
        return { spellId, level, name: spell.name, mpCost: levelData.mpCost };
      }),
    ]),
  );

  function actorById(id: string): BattleActor {
    const found = players.find((p) => p.id === id) ?? enemies.find((e) => e.id === id);
    if (!found) {
      throw new Error(`BattleEngine: unknown actor id "${id}"`);
    }
    return found;
  }

  function alivePlayers(): BattleActor[] {
    return players.filter((p) => p.currentHp > 0);
  }

  function aliveEnemies(): BattleActor[] {
    return enemies.filter((e) => e.currentHp > 0);
  }

  function aliveTimelineActors(): TimelineActor[] {
    return [...alivePlayers(), ...aliveEnemies()].map((a) => ({ id: a.id, speed: a.speed }));
  }

  // Timeline gauge persists for the whole battle (MVP-3 correction 1): a
  // KO'd actor is simply left out of aliveTimelineActors() from then on —
  // its leftover gauge value is never read again, and every surviving
  // actor's own gauge is untouched.
  let timeline: TimelineState = createTimelineState(aliveTimelineActors());

  // Dedicated, clonable random stream for timeline tie-breaks only (MVP-3
  // correction 2) — never the same object as `random` (used for
  // damage/crit/enemy-AI-target rolls), so previewing the future order can
  // never perturb what the battle actually rolls. Seeded once,
  // deterministically, from the main battle RandomService.
  const timelineRandom: CloneableRandomService = createTimelineRandomService(random.int(0x7fffffff));

  // Enemy AI's actual upcoming-action queue, one per enemy. Search never
  // predicts separately — it only reveals a prefix of this exact same
  // queue, and the enemy's real turn shifts its action from the queue's
  // front, so the two can never diverge (MVP-3 correction 4).
  const enemyPlannedActions: Record<string, PlannedEnemyAction[]> = {};
  // How many of the front entries of a given enemy's queue are currently
  // "revealed" by a successful Search. Decremented whenever that enemy's
  // queue front is actually consumed.
  const revealedCountByEnemyId: Record<string, number> = {};

  const state: BattleState = {
    phase: 'COMMAND_SELECT',
    players,
    enemies,
    currentActorId: players[0].id,
    upcomingActorIds: [],
    timeline,
    pendingCommand: null,
    pendingTargetSelection: null,
    pendingOutcome: null,
    lastPlayerOutcome: null,
    lastNonQuestionOutcome: null,
    enemyActionLog: [],
    searchByEnemyId: {},
    battleItems: initialItems,
    knownSpellsByPlayerId,
    outcome: null,
  };

  function warnRejected(action: string) {
    if (typeof console !== 'undefined') {
      console.warn(`[BattleEngine] ignoring ${action}: invalid in phase ${state.phase}`);
    }
  }

  // MVP-3 target strategy for the sample enemy AI (requirement 4): the
  // action kind itself stays fixed (Attack), but the target is chosen
  // uniformly at random among currently-alive players, via the central
  // RandomService (never the timeline-only stream, and never a separate
  // "prediction" roll from what Search shows).
  function decideNextEnemyAction(): PlannedEnemyAction {
    const alive = alivePlayers();
    const target = random.pick(alive);
    return { actionName: 'アタック', targetId: target.id };
  }

  function ensureEnemyQueueLength(enemyId: string, minLength: number) {
    const queue = enemyPlannedActions[enemyId] ?? (enemyPlannedActions[enemyId] = []);
    while (queue.length < minLength) {
      queue.push(decideNextEnemyAction());
    }
  }

  /**
   * Re-plans any queued enemy action whose target just KO'd (MVP-3
   * correction 4), so Search's already-revealed view updates to the same
   * new plan the enemy will actually execute — never a stale, now-invalid
   * target.
   */
  function invalidatePlannedActionsTargeting(deadPlayerId: string) {
    const alive = alivePlayers();
    if (alive.length === 0) return; // battle is over; nothing left to replan against
    for (const queue of Object.values(enemyPlannedActions)) {
      for (let i = 0; i < queue.length; i++) {
        if (queue[i].targetId === deadPlayerId) {
          queue[i] = { actionName: 'アタック', targetId: random.pick(alive).id };
        }
      }
    }
  }

  /**
   * Applies an effect and, if it just KO'd a player, eagerly re-plans any
   * enemy queue entry that was targeting them (MVP-3 correction 4 — this
   * must catch every way a player can reach 0 HP, not only enemy attacks,
   * so Search's display never shows a target that already can't happen).
   */
  function applyEffectToActor(actor: BattleActor, effect: Parameters<typeof applyEffect>[1]) {
    applyEffect(actor, effect);
    if (actor.kind === 'player' && actor.currentHp <= 0) {
      invalidatePlannedActionsTargeting(actor.id);
    }
  }

  function buildSearchSnapshot(): Record<string, PlannedEnemyAction[]> {
    const snapshot: Record<string, PlannedEnemyAction[]> = {};
    for (const [enemyId, count] of Object.entries(revealedCountByEnemyId)) {
      if (count > 0) {
        snapshot[enemyId] = (enemyPlannedActions[enemyId] ?? []).slice(0, count);
      }
    }
    return snapshot;
  }

  function selectCommand(command: QuestionCommandKind) {
    if (state.phase !== 'COMMAND_SELECT') {
      warnRejected('selectCommand');
      return;
    }
    const sourceActorId = state.currentActorId;
    const decision = decideQuestionCommandTargeting(
      command,
      sourceActorId,
      aliveEnemies().map((e) => e.id),
    );

    if (decision.needsSelection) {
      state.pendingTargetSelection = { for: 'question', command, sourceActorId, candidateIds: decision.candidateIds };
      state.phase = 'TARGET_SELECT';
      return;
    }

    state.pendingCommand = { command, sourceActorId, targetId: decision.autoTargetId! };
    state.phase = 'SUBJECT_DIFFICULTY_SELECT';
  }

  function selectTarget(targetId: string) {
    const pending = state.pendingTargetSelection;
    if (state.phase !== 'TARGET_SELECT' || !pending) {
      warnRejected('selectTarget');
      return;
    }
    if (!pending.candidateIds.includes(targetId)) {
      warnRejected('selectTarget (target not a valid candidate)');
      return;
    }

    if (pending.for === 'question') {
      state.pendingCommand = { command: pending.command, sourceActorId: pending.sourceActorId, targetId };
      state.pendingTargetSelection = null;
      state.phase = 'SUBJECT_DIFFICULTY_SELECT';
      return;
    }

    state.pendingTargetSelection = null;
    if (pending.for === 'spell') {
      resolveSpell(pending.sourceActorId, pending.spellId, targetId);
    } else {
      resolveItem(pending.sourceActorId, pending.itemId, targetId);
    }
  }

  function selectSubjectAndStar(subject: string, star: StarLevel) {
    if (state.phase !== 'SUBJECT_DIFFICULTY_SELECT' || !state.pendingCommand) {
      warnRejected('selectSubjectAndStar');
      return;
    }
    const question = questionEngine.pickQuestion(subject, star);
    state.pendingCommand = { ...state.pendingCommand, subject, star, question };
    state.phase = 'QUESTION';
  }

  function submitAnswer(answer: MultipleChoiceAnswer) {
    const pending = state.pendingCommand;
    if (state.phase !== 'QUESTION' || !pending?.question || !pending.star) {
      warnRejected('submitAnswer');
      return;
    }

    const question = pending.question;
    const star = pending.star;
    const sourceActor = actorById(pending.sourceActorId);
    const targetActor = actorById(pending.targetId);
    const selectedIndex = answer.type === 'multiple_choice' ? answer.selectedIndex : null;
    const correct =
      answer.type === 'multiple_choice' &&
      question.format === 'multiple_choice' &&
      answer.selectedIndex === question.correctIndex;

    const base = {
      sourceActorId: pending.sourceActorId,
      targetId: pending.targetId,
      correct,
      question,
      selectedAnswerIndex: selectedIndex,
    };

    let outcome: QuestionCommandOutcome;

    switch (pending.command) {
      case 'attack': {
        let damage = 0;
        let isCritical = false;
        if (correct) {
          const starModifier = config.attackStarModifier[star];
          const result = calculateAttackDamage(
            { attackerAttack: sourceActor.attack, defenderDefense: targetActor.defense, starModifier },
            config,
            random,
          );
          // COMMAND_BOOST (spec §9.2 category 3): a run-provided percent
          // bonus on top of the base formula's result, re-floored the same
          // way calculateAttackDamage itself floors (spec §5.6). Absent
          // modifier => bonusPercent 0 => byte-identical to MVP-1〜3.
          const bonusPercent = commandModifiers[pending.sourceActorId]?.attackDamageBonusPercent ?? 0;
          damage = Math.max(config.minimumDamage, Math.round(result.damage * (1 + bonusPercent / 100)));
          isCritical = result.isCritical;
        }
        outcome = { ...base, command: 'attack', damage, isCritical };
        break;
      }
      case 'guard': {
        let applied = false;
        let mitigationPercent = 0;
        let isGreatSuccess = false;
        if (correct) {
          applied = true;
          isGreatSuccess = random.chance(config.guardGreatSuccessChance);
          const baseMitigation = config.guardMitigationByStar[star];
          const bonus = commandModifiers[pending.sourceActorId]?.guardMitigationBonus ?? 0;
          const raw = isGreatSuccess
            ? baseMitigation + config.guardGreatSuccessBonusMitigation + bonus
            : baseMitigation + bonus;
          mitigationPercent = Math.min(config.guardMaxMitigation, raw);
        }
        outcome = { ...base, command: 'guard', applied, mitigationPercent, isGreatSuccess };
        break;
      }
      case 'charge': {
        let mpGained = 0;
        let isGreatSuccess = false;
        if (correct) {
          // ★ does NOT modify MP gain (spec §5.8) — deliberately not
          // consulting config.attackStarModifier or `star` here.
          const bonus = commandModifiers[pending.sourceActorId]?.chargeGreatSuccessBonus ?? 0;
          isGreatSuccess = random.chance(config.chargeGreatSuccessChance + bonus);
          mpGained = isGreatSuccess ? config.chargeMpGainGreatSuccess : config.chargeMpGainNormal;
        }
        outcome = { ...base, command: 'charge', mpGained, isGreatSuccess };
        break;
      }
      case 'search': {
        let revealedActions: PlannedEnemyAction[] = [];
        if (correct) {
          const bonus = commandModifiers[pending.sourceActorId]?.searchRevealBonusCount ?? 0;
          const count = config.searchRevealCountByStar[star] + bonus;
          ensureEnemyQueueLength(pending.targetId, count);
          revealedActions = enemyPlannedActions[pending.targetId].slice(0, count);
        }
        outcome = { ...base, command: 'search', success: correct, revealedActions };
        break;
      }
    }

    // Correctness/effect are computed now, but actor state is untouched
    // until RESULT_APPLY (see applyPendingResult).
    state.pendingOutcome = outcome;
    state.phase = 'COMMAND_ANIMATION';
  }

  function applyPendingResult() {
    const outcome = state.pendingOutcome;
    if (!outcome) {
      warnRejected('applyPendingResult');
      return;
    }
    // RESULT_APPLY: this is the only place actor HP/MP/guard/search state
    // is mutated as a result of a question-based player command. Win/lose
    // is deliberately NOT checked here (MVP-3 correction 6) — even if this
    // Attack just KO'd the last enemy, the flow must still pass through
    // 正誤表示/EXPLANATION before BATTLE_END; that check happens later, in
    // proceedToNextAction(), only once the player clicks 次へ.
    state.phase = 'RESULT_APPLY';

    switch (outcome.command) {
      case 'attack':
        applyEffect(actorById(outcome.targetId), { type: 'DAMAGE', amount: outcome.damage });
        break;
      case 'guard':
        if (outcome.applied) {
          applyEffect(actorById(outcome.targetId), { type: 'GUARD', mitigationPercent: outcome.mitigationPercent });
        }
        break;
      case 'charge':
        applyEffect(actorById(outcome.targetId), { type: 'MP_GAIN', amount: outcome.mpGained });
        break;
      case 'search':
        if (outcome.success) {
          revealedCountByEnemyId[outcome.targetId] = outcome.revealedActions.length;
        }
        break;
    }

    state.lastPlayerOutcome = outcome;
    state.pendingOutcome = null;
    state.pendingCommand = null;
    state.phase = 'EXPLANATION';
  }

  function useSpell(spellId: string) {
    if (state.phase !== 'COMMAND_SELECT') {
      warnRejected('useSpell');
      return;
    }
    const sourceActorId = state.currentActorId;
    const known = knownSpellsByPlayerId[sourceActorId]?.find((k) => k.spellId === spellId);
    const spell = spellsById[spellId];
    if (!known || !spell) {
      warnRejected('useSpell (spell not known by this actor)');
      return;
    }
    const levelData = spellLevelData(spell, known.level);
    const sourceActor = actorById(sourceActorId);
    if (sourceActor.currentMp < levelData.mpCost) {
      warnRejected('useSpell (insufficient MP)');
      return;
    }

    const decision = decideSpellOrItemTargeting(
      spell.targetType,
      sourceActorId,
      aliveEnemies().map((e) => e.id),
    );
    if (decision.needsSelection) {
      state.pendingTargetSelection = { for: 'spell', spellId: spell.id, sourceActorId, candidateIds: decision.candidateIds };
      state.phase = 'TARGET_SELECT';
      return;
    }
    resolveSpell(sourceActorId, spell.id, decision.autoTargetId!);
  }

  function resolveSpell(sourceActorId: string, spellId: string, targetId: string) {
    const spell = spellsById[spellId];
    const known = knownSpellsByPlayerId[sourceActorId].find((k) => k.spellId === spellId)!;
    const levelData = spellLevelData(spell, known.level);
    const sourceActor = actorById(sourceActorId);
    sourceActor.currentMp -= levelData.mpCost;
    for (const effect of levelData.effects) {
      applyEffectToActor(actorById(targetId), effect);
    }

    state.lastNonQuestionOutcome = {
      command: 'spell',
      sourceActorId,
      targetId,
      spellId: spell.id,
      effects: levelData.effects,
    };
    // No question was involved, so there is no 正誤/EXPLANATION step (spec
    // §5.3's short flow) — RESULT_APPLY is the resting phase here.
    state.phase = 'RESULT_APPLY';
  }

  function useItem(itemId: string) {
    if (state.phase !== 'COMMAND_SELECT') {
      warnRejected('useItem');
      return;
    }
    const slot = state.battleItems.find((s) => s.item.id === itemId);
    if (!slot || slot.remainingUses <= 0) {
      warnRejected('useItem (unavailable)');
      return;
    }
    const sourceActorId = state.currentActorId;

    const decision = decideSpellOrItemTargeting(
      slot.item.targetType,
      sourceActorId,
      aliveEnemies().map((e) => e.id),
    );
    if (decision.needsSelection) {
      state.pendingTargetSelection = { for: 'item', itemId, sourceActorId, candidateIds: decision.candidateIds };
      state.phase = 'TARGET_SELECT';
      return;
    }
    resolveItem(sourceActorId, itemId, decision.autoTargetId!);
  }

  function resolveItem(sourceActorId: string, itemId: string, targetId: string) {
    const slot = state.battleItems.find((s) => s.item.id === itemId);
    if (!slot || slot.remainingUses <= 0) {
      warnRejected('resolveItem (unavailable)');
      return;
    }
    slot.remainingUses -= 1;
    for (const effect of slot.item.effects) {
      applyEffectToActor(actorById(targetId), effect);
    }

    state.lastNonQuestionOutcome = {
      command: 'item',
      sourceActorId,
      targetId,
      itemId: slot.item.id,
      effects: slot.item.effects,
    };
    state.phase = 'RESULT_APPLY';
  }

  /**
   * Resolves the timeline, one actor at a time, until either an alive
   * player comes up (→ COMMAND_SELECT for them) or every player has been
   * KO'd (→ BATTLE_END/lose). Each enemy in between acts immediately and
   * automatically (MVP-3: fixed Attack). Generalizes MVP-2's
   * player-vs-single-enemy loop to any mix of alive players/enemies —
   * with exactly one of each, behavior is identical to MVP-1/2.
   */
  function resolveTurnsUntilNextPlayerOrEnd() {
    state.phase = 'ENEMY_ACTION';
    state.enemyActionLog = [];

    for (;;) {
      const aliveActors = aliveTimelineActors();
      const result = resolveNextActor(aliveActors, timeline, timelineRandom);
      timeline = result.state;
      state.timeline = timeline;

      const actor = actorById(result.actorId);
      if (actor.kind === 'player') {
        state.currentActorId = actor.id;
        state.phase = 'COMMAND_SELECT';
        return;
      }

      const enemy = actor;
      ensureEnemyQueueLength(enemy.id, 1);
      const plannedAction = enemyPlannedActions[enemy.id].shift()!;
      if ((revealedCountByEnemyId[enemy.id] ?? 0) > 0) {
        revealedCountByEnemyId[enemy.id] -= 1;
      }

      // Defensive re-check: invalidatePlannedActionsTargeting keeps the
      // queue valid eagerly on every KO, so this should already be a live
      // player; this guards the same-tick edge case where this enemy's own
      // queue entry hadn't been reached by that pass yet.
      let targetId = plannedAction.targetId;
      if (actorById(targetId).currentHp <= 0) {
        const alive = alivePlayers();
        targetId = alive.length > 0 ? random.pick(alive).id : targetId;
      }
      const target = actorById(targetId);

      const dmgResult = calculateAttackDamage(
        { attackerAttack: enemy.attack, defenderDefense: target.defense, starModifier: 1 },
        config,
        random,
      );
      let damage = dmgResult.damage;
      if (target.guard) {
        // Mitigates exactly one incoming attack, then is consumed (spec §5.7).
        damage = Math.round(damage * (1 - target.guard.mitigationPercent));
        target.guard = null;
      }
      applyEffectToActor(target, { type: 'DAMAGE', amount: damage });
      state.enemyActionLog.push({
        sourceActorId: enemy.id,
        targetId,
        damage,
        isCritical: dmgResult.isCritical,
      });

      if (target.currentHp <= 0 && alivePlayers().length === 0) {
        state.phase = 'BATTLE_END';
        state.outcome = 'lose';
        return;
      }
    }
  }

  function proceedToNextAction() {
    if (aliveEnemies().length === 0) {
      state.phase = 'BATTLE_END';
      state.outcome = 'win';
      return;
    }
    // Symmetric with the win check above: normally a full-party KO is
    // caught inside resolveTurnsUntilNextPlayerOrEnd() right after an enemy
    // attack, but a player can also reach 0 HP via a self-targeted Spell/
    // Item — that path has no enemy turn to catch it, so it must be
    // checked here too (otherwise the timeline loop below would have no
    // alive player left to ever resolve to, and no one for an enemy to
    // target).
    if (alivePlayers().length === 0) {
      state.phase = 'BATTLE_END';
      state.outcome = 'lose';
      return;
    }
    resolveTurnsUntilNextPlayerOrEnd();
  }

  function advance() {
    if (state.phase === 'COMMAND_ANIMATION') {
      applyPendingResult();
      return;
    }

    if (state.phase === 'EXPLANATION') {
      proceedToNextAction();
      return;
    }

    if (state.phase === 'RESULT_APPLY') {
      // Only reachable at rest via useSpell()/useItem() — the question-flow
      // RESULT_APPLY is transient and never observed here (see applyPendingResult).
      proceedToNextAction();
      return;
    }

    warnRejected('advance');
  }

  function snapshot(): BattleState {
    const upcomingActorIds = previewUpcomingOrder(aliveTimelineActors(), timeline, timelineRandom, UPCOMING_PREVIEW_COUNT);
    const publicState: BattleState = { ...state, searchByEnemyId: buildSearchSnapshot(), upcomingActorIds };
    return JSON.parse(JSON.stringify(publicState)) as BattleState;
  }

  // Turn order is speed-driven from the very start of the battle (spec
  // §5.2): a faster enemy can act before any player ever gets a first
  // command, possibly more than once. Consult the timeline once up front
  // instead of assuming a player always acts first.
  resolveTurnsUntilNextPlayerOrEnd();

  return {
    getState: snapshot,
    selectCommand,
    selectTarget,
    selectSubjectAndStar,
    submitAnswer,
    useSpell,
    useItem,
    advance,
  };
}
