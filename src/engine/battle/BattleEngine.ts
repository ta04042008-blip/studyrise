import type { StarLevel } from '../../types/stats';
import type { BattleConfig } from '../../config/battleConfig';
import type { RandomService } from '../random/RandomService';
import type { QuestionEngine } from '../question/QuestionEngine';
import type { MultipleChoiceAnswer } from '../question/QuestionEngine.types';
import { calculateAttackDamage } from './damage';
import { createTimelineState, resolveNextActor, type TimelineActor, type TimelineState } from './actionTimeline';
import type {
  BattleActor,
  BattleState,
  CharacterDefinition,
  EnemyDefinition,
} from './BattleEngine.types';

export interface BattleEngine {
  getState(): BattleState;
  /** COMMAND_SELECT → (TARGET_SELECT auto-resolves, MVP-1 has one enemy) → SUBJECT_DIFFICULTY_SELECT. */
  selectAttackCommand(): void;
  /** SUBJECT_DIFFICULTY_SELECT → QUESTION. */
  selectSubjectAndStar(subject: string, star: StarLevel): void;
  /**
   * QUESTION → COMMAND_ANIMATION. Correctness/planned damage are computed
   * here, but enemy HP is NOT mutated yet (that happens at RESULT_APPLY,
   * triggered by the next advance() call) — spec order in CLAUDE.md §6/
   * user requirement: QUESTION → 回答確定 → COMMAND_ANIMATION →
   * RESULT_APPLY → EXPLANATION, for both correct and incorrect/dont_know
   * answers.
   */
  submitAnswer(answer: MultipleChoiceAnswer): void;
  /**
   * Advances past the current resting phase:
   * - COMMAND_ANIMATION → applies the pending result (RESULT_APPLY) → EXPLANATION.
   * - EXPLANATION → if the enemy is already dead, finalizes BATTLE_END(win);
   *   otherwise resolves the enemy's turn(s) via the speed timeline
   *   (ENEMY_ACTION, possibly multiple consecutive attacks for a faster
   *   enemy) until either it's the player's turn again (COMMAND_SELECT) or
   *   the player is KO'd (BATTLE_END/lose).
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
    currentMp: def.baseStats.maxMp,
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
  };
}

export function createBattleEngine(
  playerDef: CharacterDefinition,
  enemyDef: EnemyDefinition,
  questionEngine: QuestionEngine,
  config: BattleConfig,
  random: RandomService,
): BattleEngine {
  const player = actorFromCharacter(playerDef);
  const enemy = actorFromEnemy(enemyDef);

  const timelineActors: TimelineActor[] = [
    { id: player.id, speed: player.speed },
    { id: enemy.id, speed: enemy.speed },
  ];
  let timeline: TimelineState = createTimelineState(timelineActors);

  const state: BattleState = {
    phase: 'COMMAND_SELECT',
    player,
    enemy,
    timeline,
    pendingCommand: null,
    pendingOutcome: null,
    lastPlayerOutcome: null,
    enemyActionLog: [],
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

  function selectAttackCommand() {
    if (state.phase !== 'COMMAND_SELECT') {
      warnRejected('selectAttackCommand');
      return;
    }
    // TARGET_SELECT auto-resolves: MVP-1 has exactly one enemy, so there is
    // no meaningful target choice for the player to make.
    state.pendingCommand = { command: 'attack', targetId: enemy.id };
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
    if (state.phase !== 'QUESTION' || !state.pendingCommand?.question || !state.pendingCommand.star) {
      warnRejected('submitAnswer');
      return;
    }

    const question = state.pendingCommand.question;
    const selectedIndex = answer.type === 'multiple_choice' ? answer.selectedIndex : null;
    const correct =
      answer.type === 'multiple_choice' &&
      question.format === 'multiple_choice' &&
      answer.selectedIndex === question.correctIndex;

    let damage = 0;
    let isCritical = false;
    if (correct) {
      const starModifier = config.attackStarModifier[state.pendingCommand.star];
      const result = calculateAttackDamage(
        { attackerAttack: player.attack, defenderDefense: enemy.defense, starModifier },
        config,
        random,
      );
      damage = result.damage;
      isCritical = result.isCritical;
    }

    // Correctness/damage are computed now, but HP is untouched until
    // RESULT_APPLY (see applyPendingResult) — enforced by leaving actor
    // objects unmodified here.
    state.pendingOutcome = {
      attackerId: player.id,
      targetId: enemy.id,
      correct,
      damage,
      isCritical,
      question,
      selectedAnswerIndex: selectedIndex,
    };
    state.phase = 'COMMAND_ANIMATION';
  }

  function applyPendingResult() {
    const outcome = state.pendingOutcome;
    if (!outcome) {
      warnRejected('applyPendingResult');
      return;
    }
    // RESULT_APPLY: this is the only place actor HP is mutated as a result
    // of a player command.
    state.phase = 'RESULT_APPLY';
    const target = actorById(outcome.targetId);
    target.currentHp = Math.max(0, target.currentHp - outcome.damage);

    state.lastPlayerOutcome = outcome;
    state.pendingOutcome = null;
    state.pendingCommand = null;
    state.phase = 'EXPLANATION';
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

      // Enemy AI for MVP-1 is fixed: always Attack, no question involved.
      const dmgResult = calculateAttackDamage(
        { attackerAttack: enemy.attack, defenderDefense: player.defense, starModifier: 1 },
        config,
        random,
      );
      player.currentHp = Math.max(0, player.currentHp - dmgResult.damage);
      state.enemyActionLog.push({
        attackerId: enemy.id,
        targetId: player.id,
        damage: dmgResult.damage,
        isCritical: dmgResult.isCritical,
      });

      if (player.currentHp <= 0) {
        state.phase = 'BATTLE_END';
        state.outcome = 'lose';
        return;
      }
    }
  }

  function advance() {
    if (state.phase === 'COMMAND_ANIMATION') {
      applyPendingResult();
      return;
    }

    if (state.phase === 'EXPLANATION') {
      if (enemy.currentHp <= 0) {
        state.phase = 'BATTLE_END';
        state.outcome = 'win';
        return;
      }
      resolveEnemyTurnsUntilPlayerOrEnd();
      return;
    }

    warnRejected('advance');
  }

  function snapshot(): BattleState {
    return JSON.parse(JSON.stringify(state)) as BattleState;
  }

  // Turn order is speed-driven from the very start of the battle (spec
  // §5.2): a faster enemy can act before the player ever gets a first
  // command, possibly more than once. Consult the timeline once up front
  // instead of assuming the player always acts first.
  resolveEnemyTurnsUntilPlayerOrEnd();

  return {
    getState: snapshot,
    selectAttackCommand,
    selectSubjectAndStar,
    submitAnswer,
    advance,
  };
}
