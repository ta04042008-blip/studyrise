import type { BattleEngineSnapshot, CharacterDefinition } from '../battle/BattleEngine.types';
import type { RewardPhaseSnapshot } from '../roguelite/RogueliteEngine.types';
import type { StagePhase, StageRunState } from '../stage/StageEngine.types';
import type { BattleItemSlotSelection, QuestionScopeSelection } from '../../base/base.types';
import type { SaveEnvelope } from './SaveEnvelope';
import { looksLikeEnvelope } from './SaveEnvelope';

export const RUN_SAVE_SCHEMA_VERSION = 1;

/**
 * Everything needed to resume one in-progress Stage attempt (MVP-9 spec
 * §15.2, user's explicit RunSave design). Deliberately does NOT store the
 * full Question catalog or a bare `partyCharacterIds` list:
 *
 *  - `questionScope`/`itemSlotSelection` are the departure-time SELECTIONS
 *    (unit refs / catalog ids) — the actual QuestionDefinition/ItemDefinition
 *    content is re-resolved from the canonical content registries on
 *    resume, never duplicated here (CLAUDE.md §15/user's explicit "don't
 *    duplicate derivable content" instruction, mirroring how
 *    LearningHistoryRecord only ever stores a `questionId`).
 *  - `resolvedParty` IS the fully resolved (growth + equipment baked in)
 *    CharacterDefinition[] as of Stage departure — stored directly, not
 *    re-derived from PermanentState on resume (user's explicit MVP-9
 *    instruction §12: a Stage attempt's battle stats are confirmed at
 *    departure and must never drift even if re-deriving would coincidentally
 *    match today; this is the one deliberate exception to "don't duplicate
 *    derivable data", justified by that correctness requirement).
 */
export interface RunSavePayload {
  areaId: string;
  stageId: string;
  resolvedParty: CharacterDefinition[];
  questionScope: QuestionScopeSelection;
  itemSlotSelection: BattleItemSlotSelection;
  stageRunState: StageRunState;
  /** Only present while `stageRunState.phase === 'ZONE_BATTLE'`. */
  liveBattleSnapshot: BattleEngineSnapshot | null;
  /** Only present while `stageRunState.phase === 'ZONE_REWARD'`. */
  liveRewardSnapshot: RewardPhaseSnapshot | null;
}

export type RunSaveEnvelope = SaveEnvelope<RunSavePayload>;

const STAGE_PHASES: readonly StagePhase[] = ['ZONE_BATTLE', 'ZONE_REWARD', 'INTER_ZONE_CHOICE', 'STAGE_RESULT'];

/**
 * Structural validation, deliberately not exhaustive down to every
 * BattleActor/RewardCandidate field (CLAUDE.md §19/§26 applied to save data:
 * catch obviously-corrupt data without becoming a second copy of every
 * engine's own type). Anything that slips past this but is still malformed
 * enough to break `restoreBattleEngine`/`useRogueliteController` is caught
 * by the try/catch around the whole boot-load flow (see SaveSystem.ts).
 */
export function validateRunSavePayload(payload: unknown): payload is RunSavePayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Partial<RunSavePayload>;
  if (typeof p.areaId !== 'string' || typeof p.stageId !== 'string') return false;
  if (!Array.isArray(p.resolvedParty) || p.resolvedParty.length === 0) return false;
  if (!Array.isArray(p.questionScope)) return false;
  if (!Array.isArray(p.itemSlotSelection) || p.itemSlotSelection.length !== 3) return false;
  if (typeof p.stageRunState !== 'object' || p.stageRunState === null) return false;
  const run = p.stageRunState;
  if (typeof run.stageId !== 'string') return false;
  if (typeof run.runSeed !== 'number') return false;
  if (typeof run.currentZoneIndex !== 'number') return false;
  if (run.completedLaps !== undefined && (!Number.isInteger(run.completedLaps) || run.completedLaps < 0)) return false;
  if (!run.phase || !STAGE_PHASES.includes(run.phase)) return false;
  if (typeof run.runState !== 'object' || run.runState === null) return false;
  if (!Array.isArray(run.clearedZoneIds)) return false;
  if (!Array.isArray(run.battleItems)) return false;
  if (p.liveBattleSnapshot !== null && typeof p.liveBattleSnapshot !== 'object') return false;
  if (p.liveRewardSnapshot !== null && typeof p.liveRewardSnapshot !== 'object') return false;
  return true;
}

export function migrateRunSave(raw: unknown): RunSaveEnvelope | null {
  if (!looksLikeEnvelope(raw)) return null;
  if (raw.schemaVersion !== RUN_SAVE_SCHEMA_VERSION) return null;
  if (!validateRunSavePayload(raw.payload)) return null;
  return { schemaVersion: RUN_SAVE_SCHEMA_VERSION, savedAt: raw.savedAt, payload: raw.payload };
}
