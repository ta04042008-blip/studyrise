import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import type { AreaDefinition } from '../../base/base.types';
import { sampleStage } from '../stages/sampleStage';

/**
 * PLACEHOLDER content — MVP-6's one Area, containing the one existing
 * sample Stage (spec v0.6 §2.1 hierarchy エリア＞ステージ＞ゾーン). Branching
 * areas, unlock conditions and clear-state are explicitly out of MVP-6
 * scope. Not final game content (CLAUDE.md §24).
 */
export const sampleArea: AreaDefinition = {
  id: 'area_sample_placeholder',
  name: 'サンプルエリア', // PLACEHOLDER
  stageIds: [sampleStage.id],
};

export const sampleAreas: AreaDefinition[] = [sampleArea];

export const sampleStagesById: Record<string, StageDefinition> = {
  [sampleStage.id]: sampleStage,
};
