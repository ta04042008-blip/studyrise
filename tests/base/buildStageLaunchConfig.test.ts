import { describe, expect, it } from 'vitest';
import { buildStageLaunchConfig } from '../../src/base/buildStageLaunchConfig';
import { createEmptyDepartureDraft, type BattleItemSlotSelection } from '../../src/base/base.types';
import { sampleParty } from '../../src/data/characters/sampleCharacters';
import { sampleQuestions } from '../../src/data/questions/sampleQuestions';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { sampleDepartureItemCatalogById } from '../../src/data/items/sampleDepartureItemCatalog';
import { sampleItem } from '../../src/data/items/sampleItem';

describe('buildStageLaunchConfig', () => {
  it('carries the selected party, filtered questions, and runSeed through unchanged', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0], sampleParty[1]],
      questionScope: [{ subject: '数学', field: '計算', unit: '四則演算' }],
      itemSlots: [null, null, null] as BattleItemSlotSelection,
    };

    const config = buildStageLaunchConfig(draft, sampleStage, sampleQuestions, sampleDepartureItemCatalogById, 42);

    expect(config.party).toEqual([sampleParty[0], sampleParty[1]]);
    expect(config.stage).toBe(sampleStage);
    expect(config.runSeed).toBe(42);
    expect(config.questions.length).toBeGreaterThan(0);
    expect(config.questions.every((q) => q.subject === '数学' && q.field === '計算' && q.unit === '四則演算')).toBe(true);
  });

  it('resolves 3 item slots into battleItems, one per non-empty slot', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0]],
      itemSlots: [sampleItem.id, sampleItem.id, sampleItem.id] as BattleItemSlotSelection,
    };

    const config = buildStageLaunchConfig(draft, sampleStage, sampleQuestions, sampleDepartureItemCatalogById, 1);

    expect(config.battleItems).toHaveLength(3);
    expect(config.battleItems.every((slot) => slot.item.id === sampleItem.id)).toBe(true);
  });

  it('allows empty slots — battleItems omits them entirely', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0]],
      itemSlots: [sampleItem.id, null, null] as BattleItemSlotSelection,
    };

    const config = buildStageLaunchConfig(draft, sampleStage, sampleQuestions, sampleDepartureItemCatalogById, 1);

    expect(config.battleItems).toHaveLength(1);
    expect(config.battleItems[0].item.id).toBe(sampleItem.id);
  });

  it('produces an empty battleItems array when all 3 slots are empty', () => {
    const draft = {
      ...createEmptyDepartureDraft(),
      stageId: sampleStage.id,
      party: [sampleParty[0]],
      itemSlots: [null, null, null] as BattleItemSlotSelection,
    };

    const config = buildStageLaunchConfig(draft, sampleStage, sampleQuestions, sampleDepartureItemCatalogById, 1);

    expect(config.battleItems).toHaveLength(0);
  });
});
