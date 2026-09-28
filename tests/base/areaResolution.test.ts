import { describe, expect, it } from 'vitest';
import { resolveAreaStages } from '../../src/base/areaResolution';
import { sampleArea, sampleStagesById } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { stageHaruka02 } from '../../src/data/stages/stageHaruka02';
import { stageHaruka03 } from '../../src/data/stages/stageHaruka03';

describe('resolveAreaStages (AreaDefinition → StageDefinition解決, spec v0.6 §2.1)', () => {
  it('resolves the Area’s stageIds into their StageDefinitions', () => {
    const stages = resolveAreaStages(sampleArea, sampleStagesById);
    expect(stages).toHaveLength(3);
    expect(stages.map((s) => s.id)).toEqual([sampleStage.id, stageHaruka02.id, stageHaruka03.id]);
  });

  it('silently skips an unknown stage id rather than throwing (CLAUDE.md §19)', () => {
    const brokenArea = { id: 'broken', name: 'Broken', stageIds: [sampleStage.id, 'nonexistent_stage'] };
    const stages = resolveAreaStages(brokenArea, sampleStagesById);
    expect(stages).toHaveLength(1);
    expect(stages[0].id).toBe(sampleStage.id);
  });
});
