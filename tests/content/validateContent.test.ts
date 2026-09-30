import { describe, expect, it } from 'vitest';
import { validateGameContent, type GameContentBundle } from '../../src/content/validateContent';
import { sampleParty } from '../../src/data/characters/sampleCharacters';
import { allEnemyDefinitions } from '../../src/data/enemies/enemyDefinitionsById';
import { spellsById } from '../../src/data/spells/spellsById';
import { sampleEquipmentDefinitions } from '../../src/data/equipment/sampleEquipment';
import { sampleEquipmentDropTables } from '../../src/data/equipment/sampleDropTables';
import { sampleItem } from '../../src/data/items/sampleItem';
import { sampleAreas, sampleStagesById } from '../../src/data/areas/sampleArea';
import { officialQuestions } from '../../src/data/questions/officialQuestions';
import { sampleRewardDefinitions } from '../../src/data/roguelite/sampleRewardDefinitions';
import { sampleStageUnlockRules, sampleCharacterUnlockRules } from '../../src/data/progression/unlockRules';

function realBundle(): GameContentBundle {
  return {
    characters: sampleParty,
    enemies: allEnemyDefinitions,
    spells: Object.values(spellsById),
    equipment: sampleEquipmentDefinitions,
    dropTables: sampleEquipmentDropTables,
    items: [sampleItem],
    areas: sampleAreas,
    stages: Object.values(sampleStagesById),
    questions: officialQuestions,
    rewards: sampleRewardDefinitions,
    stageUnlockRules: sampleStageUnlockRules,
    characterUnlockRules: sampleCharacterUnlockRules,
  };
}

describe('validateGameContent — MVP-10 official content bundle', () => {
  it('the real Area 1《ハルカ》content bundle has zero validation issues', () => {
    const result = validateGameContent(realBundle());
    expect(result.issues).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('13 enemy definitions (8 normal + 2 強敵 + 3 boss), matching spec §17.2', () => {
    expect(allEnemyDefinitions).toHaveLength(13);
    expect(allEnemyDefinitions.filter((e) => e.isBoss)).toHaveLength(3);
  });

  it('3 playable characters (葉山智也/南雲彩乃/岡村駆), matching spec §17.2', () => {
    expect(sampleParty).toHaveLength(3);
    expect(sampleParty.map((c) => c.name)).toEqual(['葉山智也', '南雲彩乃', '岡村駆']);
  });

  it('9,573 official questions from the revised 2026-09-30 banks', () => {
    expect(officialQuestions).toHaveLength(9573);
    expect(officialQuestions.filter((q) => q.subject === '数学')).toHaveLength(2823);
    expect(officialQuestions.filter((q) => q.subject === '英語')).toHaveLength(6750);

    const formatCounts = officialQuestions.reduce<Record<string, number>>((counts, q) => {
      counts[q.format] = (counts[q.format] ?? 0) + 1;
      return counts;
    }, {});
    expect(formatCounts).toEqual({
      multiple_choice: 8617,
      short_answer: 446,
      true_false: 335,
      ordering: 175,
    });
  });

  it('3 Stages, each with 10 Zones (30 total), matching the current formal spec', () => {
    const stages = Object.values(sampleStagesById);
    expect(stages).toHaveLength(3);
    expect(stages.reduce((sum, stage) => sum + stage.zones.length, 0)).toBe(30);
    for (const stage of stages) {
      expect(stage.zones).toHaveLength(10);
      expect(stage.zones.filter((z) => z.isFinalZone)).toHaveLength(1);
      expect(stage.zones[9].isFinalZone).toBe(true);
      expect(stage.zones[9].permanentRewardProfileId).toBe('BOSS_ZONE');
      expect(stage.zones.filter((z) => z.isRareRewardEvent).map((z) => z.id)).toEqual(['zone_3', 'zone_7']);
    }
  });
});

describe('validateGameContent — synthetic broken bundles', () => {
  it('flags a duplicate enemy id', () => {
    const bundle = realBundle();
    bundle.enemies = [...bundle.enemies, { ...bundle.enemies[0] }];
    const result = validateGameContent(bundle);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.code === 'DUPLICATE_ENEMY_ID')).toBe(true);
  });

  it('flags a dangling character initialSpellId', () => {
    const bundle = realBundle();
    bundle.characters = [{ ...bundle.characters[0], initialSpellId: 'spell_does_not_exist' }, ...bundle.characters.slice(1)];
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'DANGLING_CHARACTER_SPELL')).toBe(true);
  });

  it('flags a dangling equipment drop-table entry', () => {
    const bundle = realBundle();
    bundle.dropTables = [
      { id: 'broken_table', entries: [{ equipmentDefinitionId: 'equip_does_not_exist', weight: 1 }] },
    ];
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'DANGLING_EQUIPMENT')).toBe(true);
  });

  it('flags an Area referencing a missing stage', () => {
    const bundle = realBundle();
    bundle.areas = [{ id: 'area_1', name: 'Test', stageIds: ['stage_does_not_exist'] }];
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'INVALID_AREA_STAGE_ID')).toBe(true);
  });

  it('flags a StageUnlockRule targeting a missing stage (unlock dead-end / invalid target)', () => {
    const bundle = realBundle();
    bundle.stageUnlockRules = [
      { type: 'STAGE_FIRST_CLEAR', stageId: bundle.stages[0].id, unlocksStageIds: ['stage_does_not_exist'] },
    ];
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'INVALID_STAGE_UNLOCK_TARGET')).toBe(true);
  });

  it('flags an unreachable stage as an unlock dead-end', () => {
    const bundle = realBundle();
    // No rule at all points at the 3rd stage, and it is not any area's entry point.
    bundle.stageUnlockRules = [];
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'UNLOCK_DEAD_END')).toBe(true);
  });

  it('flags a reward-pool gap when a spell has no NEW_SPELL reward', () => {
    const bundle = realBundle();
    bundle.rewards = bundle.rewards.filter((r) => r.id !== 'reward_new_spell_firebolt');
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'REWARD_POOL_GAP')).toBe(true);
  });

  it('flags a missing COMMAND_BOOST command', () => {
    const bundle = realBundle();
    bundle.rewards = bundle.rewards.filter((r) => !(r.category === 'COMMAND_BOOST' && r.command === 'guard'));
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'REWARD_POOL_GAP' && i.message.includes('guard'))).toBe(true);
  });

  it('flags a duplicate question id', () => {
    const bundle = realBundle();
    bundle.questions = [...bundle.questions, { ...bundle.questions[0] }];
    const result = validateGameContent(bundle);
    expect(result.issues.some((i) => i.code === 'DUPLICATE_QUESTION_ID')).toBe(true);
  });
});
