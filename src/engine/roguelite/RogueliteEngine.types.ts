import type { QuestionCommandKind } from '../battle/BattleEngine.types';
import type { StatKey } from '../../types/stats';
import { RARITIES, type Rarity } from '../../types/rarity';
import type { RandomState } from '../random/RandomService';

/**
 * Spec §9.4, five fixed tiers. Display-only in MVP-4 (see RogueliteEngine.ts
 * header comment) — it never gates which reward content is offered.
 * Re-exported from the shared `src/types/rarity.ts` (MVP-7: equipment
 * rarity reuses the same scale, and ProgressionSystem must not depend on
 * this roguelite-specific module) so every existing `import { RARITIES,
 * type Rarity } from './RogueliteEngine.types'` call site keeps working
 * unchanged.
 */
export { RARITIES, type Rarity };

export type RewardCategory = 'NEW_SPELL' | 'SPELL_UPGRADE' | 'COMMAND_BOOST' | 'TEMP_STAT_BOOST' | 'HEAL_SPECIAL';

/**
 * When a HEAL_SPECIAL reward's effect is applied. MVP-4's sample reward is
 * IMMEDIATE (spec: "回復・特殊効果...即時適用"), but the category is not
 * hard-coded to that — a future HEAL_SPECIAL variant could apply at the
 * next zone instead, without changing this union's shape.
 */
export type ApplicationTiming = 'IMMEDIATE' | 'NEXT_ZONE';

interface RewardDefinitionBase {
  /** Stable ID (CLAUDE.md §15) — never a display name. */
  id: string;
  name: string;
  description: string;
}

export interface NewSpellRewardDefinition extends RewardDefinitionBase {
  category: 'NEW_SPELL';
  /** Must be one of the target character's `additionalSpellPoolIds` (spec §4.3). */
  spellId: string;
}

export interface SpellUpgradeRewardDefinition extends RewardDefinitionBase {
  category: 'SPELL_UPGRADE';
  spellId: string;
}

export interface CommandBoostRewardDefinition extends RewardDefinitionBase {
  category: 'COMMAND_BOOST';
  command: QuestionCommandKind;
}

export interface TempStatBoostRewardDefinition extends RewardDefinitionBase {
  category: 'TEMP_STAT_BOOST';
  /** No MP entry — spec §7.4/§9.2 temp stat boosts are HP/学力/忍耐力/思考速度 only. */
  stat: Exclude<StatKey, 'mp'>;
}

export interface HealSpecialRewardDefinition extends RewardDefinitionBase {
  category: 'HEAL_SPECIAL';
  applicationTiming: ApplicationTiming;
  /** MVP-4's only HEAL_SPECIAL shape: heal for a percent of max HP. Future variants can add sibling fields without breaking this one. */
  healPercentOfMaxHp: number;
}

export type RewardDefinition =
  | NewSpellRewardDefinition
  | SpellUpgradeRewardDefinition
  | CommandBoostRewardDefinition
  | TempStatBoostRewardDefinition
  | HealSpecialRewardDefinition;

/**
 * One offered card: a fixed target character (spec §9.3 — never re-rolled
 * per candidate in MVP-4's per-character session model) + a specific
 * reward + its independently-rolled display rarity.
 */
export interface RewardCandidate {
  /** `${characterId}:${reward.id}` — stable identity used for in-offer dedupe and reroll non-repeat (best-effort). */
  candidateKey: string;
  characterId: string;
  rarity: Rarity;
  reward: RewardDefinition;
}

// ---------------------------------------------------------------------------
// Run-scoped state (spec §9.8 reset boundary, §18.9 RunSave/RunBuild split)
// ---------------------------------------------------------------------------

export interface RunBuildSpellState {
  spellId: string;
  level: number;
}

export interface RunBuildCharacterState {
  characterId: string;
  /** First entry is always the initial spell; length 1..3 (spec §4.5). */
  knownSpells: RunBuildSpellState[];
  /** Stack count per command, 0..commandBoostMaxLevel (rewardConfig). */
  commandBoosts: Partial<Record<QuestionCommandKind, number>>;
  /** Stack count per stat, 0..tempStatBoostMaxLevel (rewardConfig). Effective from next zone only (spec §9.6). */
  tempStatBoosts: Partial<Record<Exclude<StatKey, 'mp'>, number>>;
}

/**
 * Everything a roguelite run accumulates and that gets wiped at stage end
 * (spec §9.8: clear / self-return / defeat all reset this identically).
 * Deliberately holds no HP (see RunState) — HP is challenge-run progress,
 * not a roguelite build value.
 */
export interface RunBuild {
  characters: Record<string, RunBuildCharacterState>;
}

/**
 * Everything else about an in-progress stage challenge (spec §18.9's
 * RunSave, minus persistence — MVP-4 keeps this in memory only, no
 * SaveSystem yet). Separate from RunBuild per the user's explicit
 * instruction: RunBuild is "what the roguelite build is", RunState is "what
 * the current attempt's live numbers are".
 */
export interface RunState {
  build: RunBuild;
  /** Each party member's current HP, carried from the last battle's end into the next one's construction. */
  currentHpByCharacterId: Record<string, number>;
  rewardPhase: RewardPhaseSession | null;
}

// ---------------------------------------------------------------------------
// Per-zone reward flow (per-character sequential sessions)
// ---------------------------------------------------------------------------

export type RewardSessionStatus = 'CANDIDATES_READY' | 'LOCKED_IN' | 'APPLIED';

/** One character's reward selection within a RewardPhaseSession. */
export interface RewardSession {
  targetCharacterId: string;
  isRareRewardEvent: boolean;
  candidates: RewardCandidate[];
  rerollRemaining: number;
  status: RewardSessionStatus;
  /** Set once the player taps a card, before hitting 決定; cleared on cancel/reroll. */
  selectedCandidateKey: string | null;
}

/**
 * Manages the whole party's zone-clear reward progression (spec: each
 * deployed character — KO'd included — gets exactly one sequential reward
 * pick). `currentCharacterIndex` advances only after that character's
 * reward has been applied.
 */
export interface RewardPhaseSession {
  characterOrder: string[];
  currentCharacterIndex: number;
  currentRewardSession: RewardSession;
  isRareRewardEvent: boolean;
  complete: boolean;
}

/**
 * MVP-9: everything needed to resume an in-progress reward phase — the
 * `RewardPhaseSession` itself is already plain, fully-serializable data
 * (candidates/rarity/rerollRemaining/locked-or-applied status are all
 * already-decided values, never re-derived), but it alone is not enough:
 * a reroll after resume must produce the exact same candidates a
 * non-reloaded session would have (spec §18.16, user's explicit MVP-9
 * instruction — no reseeding), which requires the reward RNG's cursor too.
 * RogueliteEngine itself never exposes its injected RandomService, so this
 * is assembled by the caller (useRogueliteController) from the exact
 * instance it also handed to `createRogueliteEngine`.
 */
export interface RewardPhaseSnapshot {
  phase: RewardPhaseSession;
  randomState: RandomState;
}
