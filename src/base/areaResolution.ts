import type { StageDefinition } from '../engine/stage/StageEngine.types';
import type { AreaDefinition } from './base.types';

/**
 * Resolves an Area's `stageIds` into their StageDefinitions (spec v0.6
 * §2.1). Unknown ids are silently skipped rather than thrown (CLAUDE.md §19
 * — bad content must not crash the app); this is display-time resolution
 * only, never mutated back into content data.
 */
export function resolveAreaStages(area: AreaDefinition, stagesById: Record<string, StageDefinition>): StageDefinition[] {
  return area.stageIds.map((id) => stagesById[id]).filter((stage): stage is StageDefinition => stage !== undefined);
}
