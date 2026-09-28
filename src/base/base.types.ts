import type { CharacterDefinition, ItemBattleSlot, ItemDefinition } from '../engine/battle/BattleEngine.types';
import type { StageDefinition } from '../engine/stage/StageEngine.types';
import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';

/**
 * MVP-6: formal Area layer (spec v0.6 §2.1 エリア＞ステージ＞ゾーン). Branching,
 * unlock conditions and clear-state tracking are explicitly out of MVP-6
 * scope (user instruction) — this is deliberately just an id→Stage list.
 */
export interface AreaDefinition {
  id: string;
  name: string;
  stageIds: string[];
}

/**
 * Root screen state (CLAUDE.md §6: explicit state machine, not booleans).
 * `IN_STAGE` is rendered by a dedicated component (`StageSessionScreen`)
 * that calls `useStageController` unconditionally on its own mount — never
 * behind an `if (phase === 'IN_STAGE')` inside the hook that owns this
 * union, so Rules of Hooks is never at risk (user's explicit requirement).
 */
export type AppPhase =
  | 'BASE_HOME'
  | 'AREA_SELECT'
  | 'STAGE_SELECT'
  | 'DEPARTURE_PREP'
  | 'DEPARTURE_CONFIRM'
  | 'PARTY_EDIT'
  | 'CHARACTER_LIST'
  | 'CHARACTER_DETAIL'
  | 'EQUIPMENT_LIST'
  | 'INVENTORY_LIST'
  | 'RECORD_LIST'
  | 'IN_STAGE';

/** One 教科＋分野＋単元 combination (spec §12.2/§12.3). */
export interface QuestionUnitRef {
  subject: string;
  field: string;
  unit: string;
}

/** The full set of units currently switched on for this deployment (spec §12.2 出題範囲). No max-unit limit (spec explicit). */
export type QuestionScopeSelection = QuestionUnitRef[];

/** Exactly 3 departure loadout slots (spec §5.10 持ち込み3枠); each holds a temporary-catalog item id, or is empty. */
export type BattleItemSlotSelection = [string | null, string | null, string | null];

export const EMPTY_BATTLE_ITEM_SLOTS: BattleItemSlotSelection = [null, null, null];

/**
 * One entry in the MVP-6 *temporary* departure item catalog. This is not a
 * permanent inventory (CLAUDE.md §21 — persistent stock/purchase/sale is
 * MVP-7): `defaultUses` is simply how many uses this Stage attempt grants if
 * the item is picked into a slot, mirroring MVP-2〜5's hardcoded
 * `remainingUses: 2` harness value.
 */
export interface DepartureItemCatalogEntry {
  item: ItemDefinition;
  defaultUses: number;
}

/**
 * In-progress 出撃準備 selections — base/UI-only state (CLAUDE.md §21: no
 * permanent growth, Inventory or Save data lives here; it is lost on
 * reload, same as every other MVP-6 base screen state).
 */
export interface DepartureDraft {
  areaId: string | null;
  stageId: string | null;
  /** Selection order === battle participation order (spec §4.1). */
  party: CharacterDefinition[];
  questionScope: QuestionScopeSelection;
  itemSlots: BattleItemSlotSelection;
}

export function createEmptyDepartureDraft(): DepartureDraft {
  return {
    areaId: null,
    stageId: null,
    party: [],
    questionScope: [],
    itemSlots: [...EMPTY_BATTLE_ITEM_SLOTS],
  };
}

/**
 * Everything a Stage attempt needs to start — required, not optional
 * (user's explicit MVP-6 correction: no implicit fallback to sample data in
 * production code paths). `useStageController` accepts exactly this shape;
 * `buildStageLaunchConfig` (src/base/buildStageLaunchConfig.ts) is the only
 * place that assembles one from a confirmed `DepartureDraft`.
 */
export interface StageLaunchConfig {
  party: CharacterDefinition[];
  stage: StageDefinition;
  questions: QuestionDefinition[];
  battleItems: ItemBattleSlot[];
  runSeed: number;
}
