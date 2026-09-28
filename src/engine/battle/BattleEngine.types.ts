import type { BaseStats, PlayerBaseStats, StarLevel } from '../../types/stats';
import type { QuestionDefinition } from '../question/QuestionEngine.types';
import type { TimelineState } from './actionTimeline';
import type { Effect } from './effects';
import type { RandomState } from '../random/RandomService';
import type { QuestionEngineSnapshot } from '../question/QuestionEngine';

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
 * entirely, same as MVP-1/2's 1v1 behavior. ZONE_CLEAR/REWARD (roguelite)
 * are deliberately NOT part of this union, even as of MVP-4: multi-zone
 * progression itself is still out of scope (MVP-5), so the reward flow is
 * orchestrated one level above BattleEngine (RunController) between one
 * BattleEngine instance's BATTLE_END(win) and the next instance's
 * construction — see engine/roguelite/RogueliteEngine.ts. This keeps
 * BattleEngine's own state machine, and every MVP-1〜3 test, untouched.
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

/** Per-level payload of a spell (spec §4.5: "各スペルに最大Lvを持つ"). */
export interface SpellLevelData {
  /** 1〜5, spec §4.5 ("コスト軽減後も最低1MP" applies to future cost-reduction effects, not levels themselves). */
  mpCost: number;
  effects: Effect[];
}

export interface SpellDefinition {
  id: string;
  name: string;
  targetType: 'enemy' | 'self';
  /**
   * Highest level a SPELL_UPGRADE roguelite reward can raise this spell to
   * (spec §4.5). Set per spell, not globally.
   */
  maxLevel: number;
  /** Index 0 = level 1 ... index (maxLevel - 1) = max level. Length must equal maxLevel. */
  levels: SpellLevelData[];
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
  /**
   * Stable IDs (CLAUDE.md §15) of spells this character may acquire via a
   * NEW_SPELL roguelite reward (spec §4.3 "追加スペルプール"). A NEW_SPELL
   * candidate is only ever generated from this list, and never for a spell
   * the character already knows in the current run.
   */
  additionalSpellPoolIds: string[];
}

export interface EnemyDefinition {
  id: string;
  name: string;
  baseStats: BaseStats;
  /**
   * Marks this enemy as a Stage's boss (spec v0.5 §2.1/MVP-5 correction 2:
   * boss identity is explicit content data, never inferred from a zone's
   * position in a Stage's `zones[]`). Omitted/false for ordinary enemies —
   * existing sample content needs no update.
   */
  isBoss?: boolean;
}

/** Guard status currently held by an actor; mitigates exactly one incoming attack (spec §5.7). */
export interface GuardStatus {
  mitigationPercent: number;
}

/**
 * A single enemy placement within a Zone: a stable content definition id
 * (CLAUDE.md §15 — never mutated, never used as the battle actor id) plus a
 * battle-local instance id (MVP-5 correction 1). This is what lets the same
 * EnemyDefinition appear more than once in one Zone without actor-id
 * collisions inside BattleEngine.
 */
export interface EnemyBattleInstance {
  instanceId: string;
  definition: EnemyDefinition;
}

/** Flattened runtime actor (current/max HP+MP resolved from a definition). */
export interface BattleActor {
  /** Battle-local instance id — unique within this battle, NOT necessarily the content definition id (see EnemyBattleInstance). */
  id: string;
  /**
   * Stable content definition id this actor was instantiated from
   * (CharacterDefinition.id or EnemyDefinition.id). Optional only so
   * hand-built test fixtures that don't care about the distinction don't
   * need updating; every actor BattleEngine itself constructs always sets it.
   */
  definitionId?: string;
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
 * One spell a player actor currently knows in this run (initial spell, or a
 * NEW_SPELL roguelite reward), resolved to its current level's display data.
 * Provided to BattleEngine via `knownSpellsByPlayerId` and echoed back on
 * `BattleState` unchanged for the whole battle (spells are only gained/
 * leveled between battles, via RogueliteEngine — never mid-battle).
 */
export interface KnownSpell {
  spellId: string;
  level: number;
  name: string;
  /** Resolved for `level` (SpellLevelData.mpCost at that level). */
  mpCost: number;
}

/**
 * Optional, run-provided per-player bonuses from COMMAND_BOOST roguelite
 * rewards (spec §9.2 category 3). All additive on top of the global
 * `BattleConfig` baseline; omitted/absent means "no boost", so existing
 * MVP-1〜3 callers that never pass this see byte-identical behavior.
 * Magnitudes per boost level are a RogueliteEngine/rewardConfig concern —
 * BattleEngine only ever consumes the already-resolved total.
 */
export interface PlayerCommandModifiers {
  /** Percent bonus to final Attack damage, e.g. 20 = "+20%". */
  attackDamageBonusPercent?: number;
  /** Percentage-point bonus to Guard mitigation, 0..1 scale (e.g. 0.05 = "+5pp"). */
  guardMitigationBonus?: number;
  /** Percentage-point bonus to Charge's great-success roll chance, 0..1 scale. */
  chargeGreatSuccessBonus?: number;
  /** Flat bonus to Search's revealed-action count. */
  searchRevealBonusCount?: number;
}

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
  /**
   * Each player's currently known spells for this battle (spec §4.5: 1
   * initial spell, up to 3 total once roguelite NEW_SPELL rewards are
   * applied between battles). Fixed for the whole battle — never mutated
   * mid-battle. UI only shows a spell-picker step when an entry has more
   * than one item; with exactly one (MVP-1〜3's only case) it auto-selects.
   */
  knownSpellsByPlayerId: Record<string, KnownSpell[]>;
  outcome: 'win' | 'lose' | null;
}

/**
 * Everything needed to resume a BattleEngine bit-for-bit (MVP-9 spec §15.2,
 * user's explicit instruction) — not just the public `BattleState`, but the
 * mutable state BattleEngine keeps in private closures and never exposes
 * through `getState()`:
 *
 *  - `enemyPlannedActions` is each enemy's FULL upcoming action queue.
 *    `BattleState.searchByEnemyId` is only the player-visible prefix of it
 *    (see BattleEngine.ts's buildSearchSnapshot) — restoring from that alone
 *    would lose any queued-but-unrevealed entries and any entries beyond
 *    what Search happened to reveal, so it is never reconstructed from
 *    `searchByEnemyId` (user's explicit instruction).
 *  - `revealedCountByEnemyId` is how many of each queue's front entries are
 *    currently Search-revealed; kept explicit rather than re-derived from
 *    `searchByEnemyId`'s array lengths so a future divergence between the
 *    two can never silently corrupt a restore.
 *  - `randomState`/`timelineRandomState` let the resumed engine continue
 *    the exact same future random sequence a non-reloaded session would
 *    have produced (spec §18.16, user's explicit MVP-9 instruction — no
 *    reseeding on resume). They are two independent streams (MVP-3
 *    correction 2: timeline tie-breaks never share a cursor with
 *    damage/crit/AI/question-selection rolls).
 *
 * Only `BattleEngine.exportSnapshot()` produces one of these;
 * `restoreBattleEngine()` is the only consumer.
 */
export interface BattleEngineSnapshot {
  state: BattleState;
  /** Main battle RandomService's cursor — shared with QuestionEngine.pickQuestion (see useBattleController), so restoring it must feed the SAME restored instance into both. */
  randomState: RandomState;
  /** Timeline tie-break stream's cursor — independent of `randomState`. */
  timelineRandomState: RandomState;
  enemyPlannedActions: Record<string, PlannedEnemyAction[]>;
  revealedCountByEnemyId: Record<string, number>;
  /**
   * MVP-9: QuestionEngine's dispersion-affecting `lastPicked` state (see
   * QuestionEngineSnapshot's own doc comment). QuestionEngine is a sibling
   * of BattleEngine, sharing the same RandomService — bundling its
   * snapshot here (rather than a separate top-level channel) keeps "one
   * saved value = one resumable Battle" true, matching how the shared
   * `randomState` is already handled.
   */
  questionEngineSnapshot: QuestionEngineSnapshot;
}
