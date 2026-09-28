import type { StageDefinition } from '../../engine/stage/StageEngine.types';
import type { AreaDefinition } from '../../base/base.types';
import { sampleStage } from '../stages/sampleStage';
import { stageHaruka02 } from '../stages/stageHaruka02';
import { stageHaruka03 } from '../stages/stageHaruka03';

/**
 * MVP-10 official content — 第七管理圏《ハルカ》, Area 1 (ストーリー・世界観
 * 仕様書v0.2 §17/§22: 「エリア」＞「ステージ」＞「ゾーン」). ID kept as
 * `area_sample_placeholder` for Save V1 compatibility (user's explicit
 * MVP-10 instruction). stageIds lists all 3 Stages in their canonical
 * order; actual unlock progression is governed entirely by
 * `sampleStageUnlockRules` (data-driven StageUnlockRule), never inferred
 * from this array's order (spec §10.14 / user's explicit MVP-10 instruction).
 */
export const sampleArea: AreaDefinition = {
  id: 'area_sample_placeholder',
  name: '第七管理圏《ハルカ》',
  stageIds: [sampleStage.id, stageHaruka02.id, stageHaruka03.id],
};

export const sampleAreas: AreaDefinition[] = [sampleArea];

export const sampleStagesById: Record<string, StageDefinition> = {
  [sampleStage.id]: sampleStage,
  [stageHaruka02.id]: stageHaruka02,
  [stageHaruka03.id]: stageHaruka03,
};
