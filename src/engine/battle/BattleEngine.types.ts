import type { BaseStats, PlayerBaseStats, StarLevel } from '../../types/stats';
import type { QuestionDefinition } from '../question/QuestionEngine.types';
import type { TimelineState } from './actionTimeline';

/**
 * Battle phase state machine (CLAUDE.md §6). MVP-1 only wires the states it
 * actually needs to prove the 1v1 loop; ZONE_CLEAR/REWARD (roguelite,
 * multi-zone) are intentionally not part of this union yet — they belong
 * to later MVPs and are not exposed here (CLAUDE.md §21/§27).
 */
export type BattlePhase =
  | 'COMMAND_SELECT'
  | 'TARGET_SELECT'
  | 'SUBJECT_DIFFICULTY_SELECT'
  | 'QUESTION'
  | 'COMMAND_ANIMATION'
  | 'RESULT_APPLY'
  | 'EXPLANATION'
  | 'ENEMY_ACTION'
  | 'BATTLE_END';

export interface CharacterDefinition {
  id: string;
  name: string;
  baseStats: PlayerBaseStats;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  baseStats: BaseStats;
}

/** Flattened runtime actor (current/max HP+MP resolved from a definition). */
export interface BattleActor {
  id: string;
  name: string;
  kind: 'player' | 'enemy';
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
  currentHp: number;
  /** Always 0 for enemies — enemies do not use MP (spec §4.6). */
  maxMp: number;
  currentMp: number;
}

/** MVP-1 only ever implements the Attack command (spec order §27). */
export interface PendingAttackCommand {
  command: 'attack';
  targetId: string;
  subject?: string;
  star?: StarLevel;
  question?: QuestionDefinition;
}

export interface AttackOutcome {
  attackerId: string;
  targetId: string;
  correct: boolean;
  /** 0 when incorrect/dont_know (spec §5.5). */
  damage: number;
  isCritical: boolean;
  question: QuestionDefinition;
  selectedAnswerIndex: number | null;
}

export interface EnemyActionResult {
  attackerId: string;
  targetId: string;
  damage: number;
  isCritical: boolean;
}

export interface BattleState {
  phase: BattlePhase;
  player: BattleActor;
  enemy: BattleActor;
  timeline: TimelineState;
  pendingCommand: PendingAttackCommand | null;
  /** Set by submitAnswer (correctness/damage precomputed); consumed by RESULT_APPLY. Enemy HP is untouched while this is set. */
  pendingOutcome: AttackOutcome | null;
  /** The most recently resolved player outcome, shown on the EXPLANATION screen. */
  lastPlayerOutcome: AttackOutcome | null;
  /** Enemy attacks resolved during the most recent enemy-turn traversal. */
  enemyActionLog: EnemyActionResult[];
  outcome: 'win' | 'lose' | null;
}
