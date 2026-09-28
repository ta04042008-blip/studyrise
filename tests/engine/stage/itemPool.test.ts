import { describe, expect, it } from 'vitest';
import { createStageEngine, diffConsumedItemCounts } from '../../../src/engine/stage/StageEngine';
import type { StageDefinition } from '../../../src/engine/stage/StageEngine.types';
import { createRogueliteEngine, type RogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import type { ItemBattleSlot } from '../../../src/engine/battle/BattleEngine.types';
import { testConfig, testParty, testRewardDefinitions, testSpellsById } from '../roguelite/fixtures';

const stageEngine = createStageEngine({ config: { koReviveHpPercent: 0.3 } });

function makeRunResolver(seed = 0): RogueliteEngine {
  return createRogueliteEngine({ spellsById: testSpellsById, rewardDefinitions: testRewardDefinitions, config: testConfig, random: createRandomService(seed) });
}

const twoZoneStage: StageDefinition = {
  id: 'stage_item_pool',
  name: 'Item Pool Test Stage',
  zones: [
    { id: 'zone_1', enemies: [{ enemyDefinitionId: 'enemy_x', instanceId: 'e1' }], isRareRewardEvent: false, permanentRewardProfileId: 'NORMAL_ZONE', isFinalZone: false },
    { id: 'zone_2_final', enemies: [{ enemyDefinitionId: 'enemy_x', instanceId: 'e2' }], isRareRewardEvent: false, permanentRewardProfileId: 'BOSS_ZONE', isFinalZone: true },
  ],
};

const potionSlot: ItemBattleSlot = { item: { id: 'potion', name: 'ポーション', targetType: 'self', effects: [] }, remainingUses: 2 };

describe('diffConsumedItemCounts (MVP-7 decision doc §14)', () => {
  it('reports zero consumption when nothing changed', () => {
    expect(diffConsumedItemCounts([potionSlot], [{ ...potionSlot }])).toEqual({});
  });

  it('reports exactly how many uses were consumed', () => {
    const final: ItemBattleSlot[] = [{ ...potionSlot, remainingUses: 0 }];
    expect(diffConsumedItemCounts([potionSlot], final)).toEqual({ potion: 2 });
  });

  it('sums remainingUses across duplicate slots of the same item id before diffing', () => {
    const original: ItemBattleSlot[] = [potionSlot, { ...potionSlot, remainingUses: 1 }]; // total 3 across two slots
    const final: ItemBattleSlot[] = [{ ...potionSlot, remainingUses: 1 }, { ...potionSlot, remainingUses: 0 }]; // total 1 left
    expect(diffConsumedItemCounts(original, final)).toEqual({ potion: 2 });
  });

  it('never reports a negative consumption (defensive floor)', () => {
    const final: ItemBattleSlot[] = [{ ...potionSlot, remainingUses: 5 }]; // more than original — should not happen, but must not go negative
    expect(diffConsumedItemCounts([potionSlot], final)).toEqual({});
  });
});

describe('StageEngine — stage-wide item pool persists across zones (decision doc §14)', () => {
  it('createInitialState seeds battleItems from the launch-time loadout', () => {
    const runResolver = makeRunResolver();
    const state = stageEngine.createInitialState(twoZoneStage, testParty, 1, runResolver, [potionSlot]);
    expect(state.battleItems).toEqual([potionSlot]);
  });

  it('a zone win persists the battle-ending item stock into the next zone, not a fresh refill', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(twoZoneStage, testParty, 1, runResolver, [potionSlot]);
    const consumedItems: ItemBattleSlot[] = [{ ...potionSlot, remainingUses: 1 }]; // battle consumed 1 use
    state = stageEngine.recordZoneWin(twoZoneStage, state, {}, consumedItems);
    expect(state.battleItems).toEqual(consumedItems);
  });

  it('the item pool used-up in zone 1 stays used-up going into zone 2 (never refilled to full)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(twoZoneStage, testParty, 1, runResolver, [potionSlot]);
    const depletedItems: ItemBattleSlot[] = [{ ...potionSlot, remainingUses: 0 }];
    state = stageEngine.recordZoneWin(twoZoneStage, state, {}, depletedItems);
    expect(state.battleItems).toEqual(depletedItems);
    // Even after moving on, the pool StageEngine hands the next zone is still depleted, not the original 2.
    expect(state.battleItems[0].remainingUses).toBe(0);
  });

  it('a zone defeat also persists the ending item stock (spec §2.6: consumed items stay consumed even on defeat)', () => {
    const runResolver = makeRunResolver();
    let state = stageEngine.createInitialState(twoZoneStage, testParty, 1, runResolver, [potionSlot]);
    const consumedItems: ItemBattleSlot[] = [{ ...potionSlot, remainingUses: 0 }];
    state = stageEngine.recordZoneDefeat(state, testParty, runResolver, consumedItems);
    expect(state.battleItems).toEqual(consumedItems);
  });
});
