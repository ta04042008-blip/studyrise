import type { CharacterDefinition, SpellDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { RewardDefinition, RewardPhaseSession } from '../../../src/engine/roguelite/RogueliteEngine.types';
import type { RewardConfig } from '../../../src/config/rewardConfig';
import { createRandomService, type RandomService } from '../../../src/engine/random/RandomService';

/** Small maxLevel (2) so max-level exclusion tests need only one upgrade. */
export const testInitialSpell: SpellDefinition = {
  id: 'spell_initial_test',
  name: '初期スペル',
  targetType: 'enemy',
  maxLevel: 2,
  levels: [
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 10 }] },
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 15 }] },
  ],
};

export const testPoolSpellA: SpellDefinition = {
  id: 'spell_pool_a',
  name: 'プールスペルA',
  targetType: 'enemy',
  maxLevel: 2,
  levels: [
    { mpCost: 1, effects: [{ type: 'DAMAGE', amount: 5 }] },
    { mpCost: 1, effects: [{ type: 'DAMAGE', amount: 8 }] },
  ],
};

export const testPoolSpellB: SpellDefinition = {
  id: 'spell_pool_b',
  name: 'プールスペルB',
  targetType: 'self',
  maxLevel: 2,
  levels: [
    { mpCost: 1, effects: [{ type: 'HEAL', amount: 5 }] },
    { mpCost: 1, effects: [{ type: 'HEAL', amount: 8 }] },
  ],
};

export const testSpellsById: Record<string, SpellDefinition> = {
  [testInitialSpell.id]: testInitialSpell,
  [testPoolSpellA.id]: testPoolSpellA,
  [testPoolSpellB.id]: testPoolSpellB,
};

export function character(overrides: Partial<CharacterDefinition> & { id: string }): CharacterDefinition {
  return {
    name: overrides.id,
    baseStats: { attack: 20, defense: 5, speed: 10, maxHp: 100, maxMp: 5 },
    initialSpellId: testInitialSpell.id,
    additionalSpellPoolIds: [testPoolSpellA.id, testPoolSpellB.id],
    ...overrides,
  };
}

export const testCharacterA = character({ id: 'charA', name: 'キャラA' });
export const testCharacterB = character({ id: 'charB', name: 'キャラB' });
export const testParty: CharacterDefinition[] = [testCharacterA, testCharacterB];

/** One reward definition per category, plus enough breadth (2 NEW_SPELL, 3 SPELL_UPGRADE, 4 COMMAND_BOOST, 4 TEMP_STAT_BOOST) to exercise category/reward weighting without pool exhaustion in ordinary tests. */
export const testRewardDefinitions: RewardDefinition[] = [
  { id: 'r_new_a', category: 'NEW_SPELL', spellId: testPoolSpellA.id, name: 'A習得', description: 'A' },
  { id: 'r_new_b', category: 'NEW_SPELL', spellId: testPoolSpellB.id, name: 'B習得', description: 'B' },
  { id: 'r_upgrade_initial', category: 'SPELL_UPGRADE', spellId: testInitialSpell.id, name: '初期強化', description: '' },
  { id: 'r_upgrade_a', category: 'SPELL_UPGRADE', spellId: testPoolSpellA.id, name: 'A強化', description: '' },
  { id: 'r_upgrade_b', category: 'SPELL_UPGRADE', spellId: testPoolSpellB.id, name: 'B強化', description: '' },
  { id: 'r_boost_attack', category: 'COMMAND_BOOST', command: 'attack', name: '攻撃強化', description: '' },
  { id: 'r_boost_guard', category: 'COMMAND_BOOST', command: 'guard', name: '防御強化', description: '' },
  { id: 'r_boost_charge', category: 'COMMAND_BOOST', command: 'charge', name: 'チャージ強化', description: '' },
  { id: 'r_boost_search', category: 'COMMAND_BOOST', command: 'search', name: 'サーチ強化', description: '' },
  { id: 'r_stat_hp', category: 'TEMP_STAT_BOOST', stat: 'hp', name: 'HP強化', description: '' },
  { id: 'r_stat_attack', category: 'TEMP_STAT_BOOST', stat: 'attack', name: '学力強化', description: '' },
  { id: 'r_stat_defense', category: 'TEMP_STAT_BOOST', stat: 'defense', name: '忍耐力強化', description: '' },
  { id: 'r_stat_speed', category: 'TEMP_STAT_BOOST', stat: 'speed', name: '思考速度強化', description: '' },
  { id: 'r_heal', category: 'HEAL_SPECIAL', applicationTiming: 'IMMEDIATE', healPercentOfMaxHp: 0.3, name: '回復', description: '' },
];

export const testConfig: RewardConfig = {
  candidateCountNormal: 3,
  candidateCountRareEvent: 4,
  freeRerollCount: 1,
  rarityWeights: { NORMAL: 0.5, UNCOMMON: 0.28, RARE: 0.14, EPIC: 0.06, LEGENDARY: 0.02 },
  categoryBaseWeight: 1.0,
  spellSlotsFullUpgradeWeightMultiplier: 1.2,
  synergyMultiplierCap: 1.15,
  commandBoostMaxLevel: 3,
  commandBoostPerLevel: { attack: 10, guard: 0.05, charge: 0.02, search: 1 },
  tempStatBoostMaxLevel: 3,
  tempStatBoostPerLevel: { hp: 10, attack: 5, defense: 5, speed: 5 },
  healSpecialSamplePercentOfMaxHp: 0.3,
};

/** A RandomService whose uniform() always returns a fixed value (any range); chance/int/pick delegate to a real seeded RNG. Used for deterministic rarity-boundary tests. */
export function fixedUniformRandom(value: number, seed = 1): RandomService {
  const real = createRandomService(seed);
  return {
    uniform: () => value,
    chance: real.chance,
    int: real.int,
    pick: real.pick,
  };
}

/**
 * A RandomService whose uniform(min, max) always returns
 * `min + fraction * (max - min)` — i.e. a fixed *position* within whatever
 * range is requested, regardless of that range's size. Since
 * RogueliteEngine's weightedPick always calls `random.uniform(0, totalWeight)`,
 * this lets a test aim precisely at a specific cumulative-weight boundary
 * (fraction = targetWeight / totalWeight) without needing to know the
 * absolute totals in advance — used to deterministically prove exact
 * weight multipliers (spell-slots-full ×1.20, synergy cap ×1.15) rather
 * than just "which one wins at the extremes".
 */
export function fractionalUniformRandom(fraction: number, seed = 1): RandomService {
  const real = createRandomService(seed);
  return {
    uniform: (min, max) => min + fraction * (max - min),
    chance: real.chance,
    int: real.int,
    pick: real.pick,
  };
}

/**
 * Hand-builds a RewardPhaseSession offering exactly one caller-chosen
 * RewardDefinition, bypassing RogueliteEngine's random candidate generation
 * entirely. Used by application-logic tests (does apply do the right thing
 * to RunBuild/RunState?) so they never depend on a specific reward id
 * happening to be rolled — that would make them flaky. Candidate generation
 * itself is covered separately (candidateGeneration.test.ts / reroll.test.ts).
 */
export function phaseWithSingleCandidate(
  targetCharacterId: string,
  reward: RewardDefinition,
  options?: { characterOrder?: string[]; currentCharacterIndex?: number; isRareRewardEvent?: boolean; rerollRemaining?: number },
): RewardPhaseSession {
  const characterOrder = options?.characterOrder ?? [targetCharacterId];
  const currentCharacterIndex = options?.currentCharacterIndex ?? 0;
  const isRareRewardEvent = options?.isRareRewardEvent ?? false;
  return {
    characterOrder,
    currentCharacterIndex,
    isRareRewardEvent,
    complete: false,
    currentRewardSession: {
      targetCharacterId,
      isRareRewardEvent,
      candidates: [{ candidateKey: `${targetCharacterId}:${reward.id}`, characterId: targetCharacterId, rarity: 'NORMAL', reward }],
      rerollRemaining: options?.rerollRemaining ?? 1,
      status: 'CANDIDATES_READY',
      selectedCandidateKey: null,
    },
  };
}

/** A RandomService whose chance() always returns a fixed result; everything else delegates to a real seeded RNG. */
export function withForcedChance(result: boolean, seed = 1): RandomService {
  const real = createRandomService(seed);
  return {
    uniform: real.uniform,
    chance: () => result,
    int: real.int,
    pick: real.pick,
  };
}
