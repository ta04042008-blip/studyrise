import type { BaseStats, PlayerBaseStats, StarLevel } from '../../types/stats';
import type { QuestionDefinition } from '../question/QuestionEngine.types';
import type { TimelineState } from './actionTimeline';
import type { Effect } from './effects';

/**
 * Battle phase state machine (CLAUDE.md §6). RESULT_APPLY is shared by two
 * shapes of use: for a question-based command (Attack/Guard/Charge/Search)
 * it is a transient internal step, immediately followed by EXPLANATION
 * within the same call — never externally observed at rest, even when it
 * KOs the last enemy (MVP-3 correction 6: RESULT_APPLY → 正誤表示 →
 * EXPLANATION → 次へ → BATTLE_END is preserved regardless of outcome). For
 * Spell/Item (spec §5.3's shorter コマンド→対象/選択→条件確認→即時処理 flow,
 * which has no コマンド演出/解説 steps) it IS the resting phase the player
 * sees the result on, since there is no question and therefore no 正誤 to
 * explain. TARGET_SELECT is only entered when a command's target must be
 * chosen among more than one alive candidate (see targetSelection.ts) —
 * with a single alive enemy it auto-resolves and this phase is skipped
 * entirely, same as MVP-1/2's 1v1 behavior. ZONE_CLEAR/REWARD (roguelite,
 * multi-zone) still aren't part of this union — out of scope through
 * MVP-4/5 (CLAUDE.md §21/§27).
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

export interface SpellDefinition {
  id: string;
  name: string;
  /** 1〜5, spec §4.5. */
  mpCost: number;
  targetType: 'enemy' | 'self';
  effects: Effect[];
}

export interface ItemDefinition {
  id: string;
  name: string;
  targetType: 'enemy' | 'self';
  effects: Effect[];
}

/**
 * One held stack of an item, tracked for this battle only (spec §17.3: no
 * base/inventory management in MVP-3). Per MVP-3 correction 5, this pool is
 * shared by the whole party (spec §5.10's 持ち込み3枠 is a party-level
 * loadout, not a per-character one) — never split into per-player stock.
 */
export interface ItemBattleSlot {
  item: ItemDefinition;
  remainingUses: number;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  baseStats: PlayerBaseStats;
  /**
   * Stable ID reference (CLAUDE.md §15 — never embed content or use a
   * display name as a persistence key) to the character's one starting
   * spell (spec §4.5: every character has exactly one initial spell).
   * Resolved against the `spellsById` map passed to createBattleEngine.
   */
  initialSpellId: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  baseStats: BaseStats;
}

/** Guard status currently held by an actor; mitigates exactly one incoming attack (spec §5.7). */
export interface GuardStatus {
  mitigationPercent: number;
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
  guard: GuardStatus | null;
}

export type QuestionCommandKind = 'attack' | 'guard' | 'charge' | 'search';

/**
 * Pending question-based command, mid-flow (Attack/Guard/Charge/Search
 * share this shape). `sourceActorId` is explicit (MVP-3 correction 3) so a
 * multi-player party never has to infer "who is acting" from anything but
 * this field — Guard/Charge always have targetId === sourceActorId (self);
 * Attack/Search target a chosen enemy.
 */
export interface PendingQuestionCommand {
  command: QuestionCommandKind;
  sourceActorId: string;
  targetId: string;
  subject?: string;
  star?: StarLevel;
  question?: QuestionDefinition;
}

/**
 * In-flight target choice for a command that needs one (MVP-3 requirement
 * 6/7/8/9 — Attack/Search freely choose among alive enemies; Spell/Item
 * follow their own targetType). Only exists while phase === 'TARGET_SELECT';
 * Guard/Charge and any self-targeted Spell/Item never produce one (they
 * auto-resolve, requirement 10).
 */
export type PendingTargetSelection =
  | { for: 'question'; command: QuestionCommandKind; sourceActorId: string; candidateIds: string[] }
  | { for: 'spell'; spellId: string; sourceActorId: string; candidateIds: string[] }
  | { for: 'item'; itemId: string; sourceActorId: string; candidateIds: string[] };

interface QuestionCommandOutcomeBase {
  sourceActorId: string;
  targetId: string;
  correct: boolean;
  question: QuestionDefinition;
  selectedAnswerIndex: number | null;
}

export interface AttackOutcome extends QuestionCommandOutcomeBase {
  command: 'attack';
  /** 0 when incorrect/dont_know (spec §5.5). */
  damage: number;
  isCritical: boolean;
}

export interface GuardOutcome extends QuestionCommandOutcomeBase {
  command: 'guard';
  /** === correct; kept as its own field for readability at call sites. */
  applied: boolean;
  /** 0 when not applied. Already includes the great-success bonus, capped. */
  mitigationPercent: number;
  isGreatSuccess: boolean;
}

export interface ChargeOutcome extends QuestionCommandOutcomeBase {
  command: 'charge';
  /** 0 when incorrect/dont_know; not ★-modified (spec §5.8). */
  mpGained: number;
  isGreatSuccess: boolean;
}

export interface PlannedEnemyAction {
  /** Display name only — spec §5.9 forbids showing power/probability detail. */
  actionName: string;
  targetId: string;
}

export interface SearchOutcome extends QuestionCommandOutcomeBase {
  command: 'search';
  /** === correct. */
  success: boolean;
  /** Empty when not successful. */
  revealedActions: PlannedEnemyAction[];
}

export type QuestionCommandOutcome = AttackOutcome | GuardOutcome | ChargeOutcome | SearchOutcome;

export interface SpellOutcome {
  command: 'spell';
  sourceActorId: string;
  targetId: string;
  spellId: string;
  effects: Effect[];
}

export interface ItemOutcome {
  command: 'item';
  sourceActorId: string;
  targetId: string;
  itemId: string;
  effects: Effect[];
}

export interface EnemyActionResult {
  sourceActorId: string;
  targetId: string;
  damage: number;
  isCritical: boolean;
}

export interface BattleState {
  phase: BattlePhase;
  /** 1〜3 (spec §4.1). Order is fixed for the battle — no mid-battle swap in MVP-3. */
  players: BattleActor[];
  /** 1 or more (spec §2.1: a zone = an enemy formation). */
  enemies: BattleActor[];
  /** Whichever alive player is currently at COMMAND_SELECT/mid-command. */
  currentActorId: string;
  /**
   * Derived, side-effect-free preview of the next actors to act (spec §5.2
   * requirement 5 — UI shows current actor + upcoming order, never the raw
   * gauge). Recomputed fresh on every getState() call from the live
   * TimelineState and a *cloned* timeline RNG (MVP-3 correction 2) — it is
   * not itself persisted/mutated engine state, just a read-time projection.
   */
  upcomingActorIds: string[];
  timeline: TimelineState;
  pendingCommand: PendingQuestionCommand | null;
  pendingTargetSelection: PendingTargetSelection | null;
  /** Set by submitAnswer (correctness/effect precomputed); consumed by RESULT_APPLY. Actor state is untouched while this is set. */
  pendingOutcome: QuestionCommandOutcome | null;
  /** The most recently resolved question-command outcome, shown on the EXPLANATION screen. */
  lastPlayerOutcome: QuestionCommandOutcome | null;
  /** The most recently resolved Spell/Item outcome, shown on the RESULT_APPLY resting screen (no question → no EXPLANATION). */
  lastNonQuestionOutcome: SpellOutcome | ItemOutcome | null;
  /** Enemy attacks resolved during the most recent enemy-turn traversal. */
  enemyActionLog: EnemyActionResult[];
  /**
   * Derived, always-fresh view of each searched enemy's own upcoming
   * action queue (see BattleEngine's ensureEnemyQueueLength/decideNextEnemyAction):
   * Search never predicts separately — it only reveals a prefix of the
   * exact same queue the enemy will actually execute from (MVP-3
   * correction 4: re-planning on a KO'd target updates this same queue, so
   * Search's view and the enemy's real action can never diverge).
   */
  searchByEnemyId: Record<string, PlannedEnemyAction[]>;
  /** Party-shared item pool (spec §5.10's 3-slot loadout; MVP-3 correction 5 — never per-player). */
  battleItems: ItemBattleSlot[];
  outcome: 'win' | 'lose' | null;
}
