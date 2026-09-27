import type { StarLevel } from '../../types/stats';
import type { BattleConfig } from '../../config/battleConfig';
import type { RandomService } from '../random/RandomService';
import type { QuestionEngine } from '../question/QuestionEngine';
import type { MultipleChoiceAnswer } from '../question/QuestionEngine.types';
import { calculateAttackDamage } from './damage';
import { applyEffect } from './effects';
import { createTimelineState, resolveNextActor, type TimelineActor, type TimelineState } from './actionTimeline';
import type {
  BattleActor,
  BattleState,
  CharacterDefinition,
  EnemyDefinition,
  ItemBattleSlot,
  PlannedEnemyAction,
  QuestionCommandKind,
  QuestionCommandOutcome,
  SpellDefinition,
} from './BattleEngine.types';

export interface CreateBattleEngineOptions {
  player: CharacterDefinition;
  enemy: EnemyDefinition;
  questionEngine: QuestionEngine;
  config: BattleConfig;
  random: RandomService;
  /** Lookup for the player's `initialSpellId` (CLAUDE.md §15: stable IDs, not embedded content). */
  spellsById: Record<string, SpellDefinition>;
  /** Battle-local item stock (spec §17.3: no 3-slot inventory/base management in MVP-2). */
  initialItems: ItemBattleSlot[];
}

export interface BattleEngine {
  getState(): BattleState;
  /** COMMAND_SELECT → (TARGET_SELECT auto-resolves, MVP-1/2 has one enemy) → SUBJECT_DIFFICULTY_SELECT. */
  selectCommand(command: QuestionCommandKind): void;
  /** SUBJECT_DIFFICULTY_SELECT → QUESTION. */
  selectSubjectAndStar(subject: string, star: StarLevel): void;
  /**
   * QUESTION → COMMAND_ANIMATION. Correctness/effect are computed here, but
   * actor state is NOT mutated yet (that happens at RESULT_APPLY, triggered
   * by the next advance() call) — required order: QUESTION → 回答確定 →
   * COMMAND_ANIMATION → RESULT_APPLY → 正誤表示 → EXPLANATION, for both
   * correct and incorrect/dont_know answers, for every question-based command.
   */
  submitAnswer(answer: MultipleChoiceAnswer): void;
  /**
   * Spell's short flow (spec §5.3): コマンド → 対象/選択 → 条件確認 →
   * 即時処理. MVP-2 has exactly one known spell and an unambiguous target,
   * so selection/targeting need no separate screen — this call validates
   * MP cost, deducts it, and applies the spell's effects immediately,
   * landing on the RESULT_APPLY resting phase (no question → no 正誤 → no
   * EXPLANATION).
   */
  useSpell(): void;
  /** Same short flow as useSpell(), consuming one use of the named item. */
  useItem(itemId: string): void;
  /**
   * Advances past the current resting phase:
   * - COMMAND_ANIMATION → applies the pending result (RESULT_APPLY) → EXPLANATION.
   * - EXPLANATION or RESULT_APPLY(spell/item) → if the enemy is already
   *   dead, finalizes BATTLE_END(win); otherwise resolves the enemy's
   *   turn(s) via the speed timeline (ENEMY_ACTION, possibly multiple
   *   consecutive attacks for a faster enemy) until either it's the
   *   player's turn again (COMMAND_SELECT) or the player is KO'd
   *   (BATTLE_END/lose).
   */
  advance(): void;
}

function actorFromCharacter(def: CharacterDefinition): BattleActor {
  return {
    id: def.id,
    name: def.name,
    kind: 'player',
    attack: def.baseStats.attack,
    defense: def.baseStats.defense,
    speed: def.baseStats.speed,
    maxHp: def.baseStats.maxHp,
    currentHp: def.baseStats.maxHp,
    maxMp: def.baseStats.maxMp,
    // Spec §8: MP resets to 0 at zone start. MVP-1 incorrectly started at
    // maxMp; harmless there (no Spell/Charge existed), but Charge/Spell in
    // MVP-2 depend on this being correct.
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
  const { player: playerDef, enemy: enemyDef, questionEngine, config, random, spellsById, initialItems } = options;

  const player = actorFromCharacter(playerDef);
  const enemy = actorFromEnemy(enemyDef);

  const timelineActors: TimelineActor[] = [
    { id: player.id, speed: player.speed },
    { id: enemy.id, speed: enemy.speed },
  ];
  let timeline: TimelineState = createTimelineState(timelineActors);

  // Enemy AI's actual upcoming-action queue. Search never predicts
  // separately — it only reveals a prefix of this exact same queue, and
  // the enemy's real turn shifts its action from the queue's front, so the
  // two can never diverge (user requirement 3).
  const enemyPlannedActions: Record<string, PlannedEnemyAction[]> = {};
  // How many of the front entries of a given enemy's queue are currently
  // "revealed" by a successful Search. Decremented whenever that enemy's
  // queue front is actually consumed.
  const revealedCountByEnemyId: Record<string, number> = {};

  const state: BattleState = {
    phase: 'COMMAND_SELECT',
    player,
    enemy,
    timeline,
    pendingCommand: null,
    pendingOutcome: null,
    lastPlayerOutcome: null,
    lastNonQuestionOutcome: null,
    enemyActionLog: [],
    searchByEnemyId: {},
    availableItems: initialItems,
    outcome: null,
  };

  function warnRejected(action: string) {
    if (typeof console !== 'undefined') {
      console.warn(`[BattleEngine] ignoring ${action}: invalid in phase ${state.phase}`);
    }
  }

  function actorById(id: string): BattleActor {
    return id === player.id ? player : enemy;
  }

  // MVP-2: enemy AI is fixed to always Attack. A later MVP can replace this
  // with real decision logic without touching the queue/Search plumbing.
  function decideNextEnemyAction(): PlannedEnemyAction {
    return { actionName: 'アタック', targetId: player.id };
  }

  function ensureEnemyQueueLength(enemyId: string, minLength: number) {
    const queue = enemyPlannedActions[enemyId] ?? (enemyPlannedActions[enemyId] = []);
    while (queue.length < minLength) {
      queue.push(decideNextEnemyAction());
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
    // TARGET_SELECT auto-resolves: MVP-1/2 has exactly one enemy. Attack
    // and Search target the enemy; Guard and Charge target the self.
    const targetId = command === 'attack' || command === 'search' ? enemy.id : player.id;
    state.pendingCommand = { command, targetId };
    state.phase = 'SUBJECT_DIFFICULTY_SELECT';
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
    const selectedIndex = answer.type === 'multiple_choice' ? answer.selectedIndex : null;
    const correct =
      answer.type === 'multiple_choice' &&
      question.format === 'multiple_choice' &&
      answer.selectedIndex === question.correctIndex;

    const base = {
      actorId: player.id,
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
            { attackerAttack: player.attack, defenderDefense: enemy.defense, starModifier },
            config,
            random,
          );
          damage = result.damage;
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
          mitigationPercent = isGreatSuccess
            ? Math.min(config.guardMaxMitigation, baseMitigation + config.guardGreatSuccessBonusMitigation)
            : baseMitigation;
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
          isGreatSuccess = random.chance(config.chargeGreatSuccessChance);
          mpGained = isGreatSuccess ? config.chargeMpGainGreatSuccess : config.chargeMpGainNormal;
        }
        outcome = { ...base, command: 'charge', mpGained, isGreatSuccess };
        break;
      }
      case 'search': {
        let revealedActions: PlannedEnemyAction[] = [];
        if (correct) {
          const count = config.searchRevealCountByStar[star];
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
    // is mutated as a result of a question-based player command.
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

  function useSpell() {
    if (state.phase !== 'COMMAND_SELECT') {
      warnRejected('useSpell');
      return;
    }
    const spell = spellsById[playerDef.initialSpellId];
    if (!spell) {
      warnRejected('useSpell (no spell found for initialSpellId)');
      return;
    }
    if (player.currentMp < spell.mpCost) {
      warnRejected('useSpell (insufficient MP)');
      return;
    }

    const targetId = spell.targetType === 'self' ? player.id : enemy.id;
    player.currentMp -= spell.mpCost;
    for (const effect of spell.effects) {
      applyEffect(actorById(targetId), effect);
    }

    state.lastNonQuestionOutcome = {
      command: 'spell',
      casterId: player.id,
      targetId,
      spellId: spell.id,
      effects: spell.effects,
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
    const slot = state.availableItems.find((s) => s.item.id === itemId);
    if (!slot || slot.remainingUses <= 0) {
      warnRejected('useItem (unavailable)');
      return;
    }

    slot.remainingUses -= 1;
    const targetId = slot.item.targetType === 'self' ? player.id : enemy.id;
    for (const effect of slot.item.effects) {
      applyEffect(actorById(targetId), effect);
    }

    state.lastNonQuestionOutcome = {
      command: 'item',
      userId: player.id,
      targetId,
      itemId: slot.item.id,
      effects: slot.item.effects,
    };
    state.phase = 'RESULT_APPLY';
  }

  function resolveEnemyTurnsUntilPlayerOrEnd() {
    state.phase = 'ENEMY_ACTION';
    state.enemyActionLog = [];

    for (;;) {
      const result = resolveNextActor(timelineActors, timeline, random);
      timeline = result.state;
      state.timeline = timeline;

      if (result.actorId === player.id) {
        state.phase = 'COMMAND_SELECT';
        return;
      }

      // The enemy's actual action is shifted from the same queue Search
      // reveals from — never a separately rolled prediction.
      ensureEnemyQueueLength(enemy.id, 1);
      enemyPlannedActions[enemy.id].shift();
      if ((revealedCountByEnemyId[enemy.id] ?? 0) > 0) {
        revealedCountByEnemyId[enemy.id] -= 1;
      }

      // MVP-2: the only enemy action kind is Attack.
      const dmgResult = calculateAttackDamage(
        { attackerAttack: enemy.attack, defenderDefense: player.defense, starModifier: 1 },
        config,
        random,
      );
      let damage = dmgResult.damage;
      if (player.guard) {
        // Mitigates exactly one incoming attack, then is consumed (spec §5.7).
        damage = Math.round(damage * (1 - player.guard.mitigationPercent));
        player.guard = null;
      }
      applyEffect(player, { type: 'DAMAGE', amount: damage });
      state.enemyActionLog.push({
        attackerId: enemy.id,
        targetId: player.id,
        damage,
        isCritical: dmgResult.isCritical,
      });

      if (player.currentHp <= 0) {
        state.phase = 'BATTLE_END';
        state.outcome = 'lose';
        return;
      }
    }
  }

  function proceedToNextAction() {
    if (enemy.currentHp <= 0) {
      state.phase = 'BATTLE_END';
      state.outcome = 'win';
      return;
    }
    resolveEnemyTurnsUntilPlayerOrEnd();
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
    const publicState: BattleState = { ...state, searchByEnemyId: buildSearchSnapshot() };
    return JSON.parse(JSON.stringify(publicState)) as BattleState;
  }

  // Turn order is speed-driven from the very start of the battle (spec
  // §5.2): a faster enemy can act before the player ever gets a first
  // command, possibly more than once. Consult the timeline once up front
  // instead of assuming the player always acts first.
  resolveEnemyTurnsUntilPlayerOrEnd();

  return {
    getState: snapshot,
    selectCommand,
    selectSubjectAndStar,
    submitAnswer,
    useSpell,
    useItem,
    advance,
  };
}
