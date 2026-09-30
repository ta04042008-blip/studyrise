import type { RunSavePayload } from '../engine/save/RunSave';
import type { StageDefinition } from '../engine/stage/StageEngine.types';
import type { EnemyDefinition } from '../engine/battle/BattleEngine.types';
import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';

/**
 * Bug fix (MVP-10 acceptance audit item 1): `RunSavePayload.stageRunState.
 * currentZoneIndex` is a plain array index into `stage.zones` (see
 * StageEngine.ts's `stage.zones[state.currentZoneIndex]` and
 * useStageController.tsx's identical resume-time lookup) — it was never a
 * content id, so a RunSave saved against an OLDER shape of the same
 * `stageId`'s `zones` array (e.g. MVP-9's 3-Zone Stage1, before MVP-10 grew
 * it to 4 Zones) can silently resolve to a DIFFERENT zone under a newer
 * content deploy: same index, unrelated enemies/isFinalZone. Structural
 * validation (`validateRunSavePayload`) cannot catch this — every field is
 * still a plausible `number`/`string`. This closes that gap by checking the
 * saved data against the CURRENT content registries before a checkpoint is
 * accepted for resume; RunSave/SaveSystem themselves stay content-agnostic
 * (this lives in the Base layer, alongside `buildResumedStageLaunchConfig`,
 * which already reconciles saved data against current content the same way).
 *
 * Never throws. A `false` result means "do not resume from this checkpoint"
 * — the caller falls back to the next checkpoint tier (live → zoneStart →
 * stageStart), and ultimately to Base if none qualify (spec §15.21's
 * existing corruption-fallback chain — this function only adds one more
 * reason a tier can be rejected, it does not change the chain itself).
 */
export function isRunSaveCompatibleWithCurrentContent(
  payload: RunSavePayload,
  stagesById: Record<string, StageDefinition>,
  enemyDefinitionsById: Record<string, EnemyDefinition>,
  questionPool?: readonly QuestionDefinition[],
): boolean {
  const stage = stagesById[payload.stageId];
  if (!stage) return false;

  // Post-MVP question-catalog migrations may intentionally remove old
  // field/unit combinations. A saved Run must never silently resume with a
  // partially different question range. When the current canonical pool is
  // supplied, every saved scope entry must still exist exactly.
  if (questionPool) {
    const currentUnits = new Set(
      questionPool.map((q) => `${q.subject}\u0000${q.field}\u0000${q.unit}`),
    );
    if (
      payload.questionScope.length === 0 ||
      payload.questionScope.some(
        (ref) => !currentUnits.has(`${ref.subject}\u0000${ref.field}\u0000${ref.unit}`),
      )
    ) {
      return false;
    }
  }

  const { currentZoneIndex, clearedZoneIds } = payload.stageRunState;
  if (currentZoneIndex < 0 || currentZoneIndex >= stage.zones.length) return false;

  const currentZone = stage.zones[currentZoneIndex];
  const zoneIds = new Set(stage.zones.map((z) => z.id));
  for (const clearedId of clearedZoneIds) {
    if (!zoneIds.has(clearedId)) return false;
  }

  const liveBattleSnapshot = payload.liveBattleSnapshot;
  if (liveBattleSnapshot) {
    const expectedEnemyDefinitionIds = new Set(currentZone.enemies.map((e) => e.enemyDefinitionId));
    const snapshotEnemyDefinitionIds = liveBattleSnapshot.state.enemies
      .map((actor) => actor.definitionId)
      .filter((id): id is string => typeof id === 'string');
    // Every definitionId the snapshot actually saved must still exist as
    // content AND belong to the zone currentZoneIndex now points at — one
    // unrecognized/foreign id is enough to prove the index no longer means
    // what it meant when this checkpoint was written.
    for (const definitionId of snapshotEnemyDefinitionIds) {
      if (!enemyDefinitionsById[definitionId]) return false;
      if (!expectedEnemyDefinitionIds.has(definitionId)) return false;
    }
  }

  return true;
}
