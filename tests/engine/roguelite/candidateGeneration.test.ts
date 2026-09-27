import { describe, expect, it } from 'vitest';
import { createRogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import {
  fractionalUniformRandom,
  testCharacterA,
  testConfig,
  testParty,
  testPoolSpellA,
  testPoolSpellB,
  testRewardDefinitions,
  testSpellsById,
} from './fixtures';

function makeEngine(random = createRandomService(1)) {
  return createRogueliteEngine({
    spellsById: testSpellsById,
    rewardDefinitions: testRewardDefinitions,
    config: testConfig,
    random,
  });
}

describe('RogueliteEngine — candidate count', () => {
  it('offers 3 candidates for a normal reward and 4 for a rare-reward event', () => {
    const engine = makeEngine();
    const build = engine.createDefaultRunBuild(testParty);

    const normal = engine.startRewardPhase(testParty, build, false);
    expect(normal.currentRewardSession.candidates).toHaveLength(3);

    const rare = engine.startRewardPhase(testParty, build, true);
    expect(rare.currentRewardSession.candidates).toHaveLength(4);
  });
});

describe('RogueliteEngine — NEW_SPELL is scoped to additionalSpellPoolIds', () => {
  it('never offers a NEW_SPELL reward whose spellId is outside the target character\'s pool', () => {
    const engine = makeEngine(createRandomService(3));
    const build = engine.createDefaultRunBuild(testParty);
    const poolIds = new Set(testCharacterA.additionalSpellPoolIds);

    for (let trial = 0; trial < 100; trial++) {
      const phase = engine.startRewardPhase(testParty, build, false);
      for (const candidate of phase.currentRewardSession.candidates) {
        if (candidate.reward.category === 'NEW_SPELL') {
          expect(poolIds.has(candidate.reward.spellId)).toBe(true);
        }
      }
    }
  });

  it('excludes a pool spell from NEW_SPELL once the character already knows it', () => {
    const engine = makeEngine(createRandomService(5));
    const build = engine.createDefaultRunBuild(testParty);
    // Grant testCharacterA the pool spell A directly (bypassing the normal apply flow, for isolation).
    build.characters[testCharacterA.id].knownSpells.push({ spellId: testPoolSpellA.id, level: 1 });

    for (let trial = 0; trial < 100; trial++) {
      const phase = engine.startRewardPhase([testCharacterA], build, false);
      for (const candidate of phase.currentRewardSession.candidates) {
        if (candidate.reward.category === 'NEW_SPELL') {
          expect(candidate.reward.spellId).not.toBe(testPoolSpellA.id);
        }
      }
    }
  });
});

describe('RogueliteEngine — spell 3-slot exclusion and SPELL_UPGRADE weight boost', () => {
  it('excludes NEW_SPELL entirely once knownSpells.length === 3', () => {
    const engine = makeEngine(createRandomService(9));
    const build = engine.createDefaultRunBuild(testParty);
    build.characters[testCharacterA.id].knownSpells.push(
      { spellId: testPoolSpellA.id, level: 1 },
      { spellId: testPoolSpellB.id, level: 1 },
    );
    expect(build.characters[testCharacterA.id].knownSpells).toHaveLength(3);

    for (let trial = 0; trial < 100; trial++) {
      const phase = engine.startRewardPhase([testCharacterA], build, false);
      for (const candidate of phase.currentRewardSession.candidates) {
        expect(candidate.reward.category).not.toBe('NEW_SPELL');
      }
    }
  });

  it('SPELL_UPGRADE category weight is exactly ×1.20 when spell slots are full (deterministic boundary)', () => {
    const build = { characters: { [testCharacterA.id]: {
      characterId: testCharacterA.id,
      knownSpells: [
        { spellId: testCharacterA.initialSpellId, level: 1 },
        { spellId: testPoolSpellA.id, level: 1 },
        { spellId: testPoolSpellB.id, level: 1 },
      ],
      commandBoosts: {},
      tempStatBoosts: {},
    } } };
    // With all 3 spells known and at level 1 (< maxLevel 2), eligible
    // categories are SPELL_UPGRADE(weight 1.2), COMMAND_BOOST(1),
    // TEMP_STAT_BOOST(1), HEAL_SPECIAL(1) — total 4.2. SPELL_UPGRADE is the
    // first eligible category encountered (NEW_SPELL's entries are filtered
    // out first, by array order), so its cumulative upper bound is 1.2/4.2.
    const boundary = 1.2 / 4.2;

    const justBelow = makeEngine(fractionalUniformRandom(boundary - 0.001));
    const justAbove = makeEngine(fractionalUniformRandom(boundary + 0.001));

    const belowCandidate = justBelow.startRewardPhase([testCharacterA], build, false).currentRewardSession.candidates[0];
    const aboveCandidate = justAbove.startRewardPhase([testCharacterA], build, false).currentRewardSession.candidates[0];

    expect(belowCandidate.reward.category).toBe('SPELL_UPGRADE');
    expect(aboveCandidate.reward.category).not.toBe('SPELL_UPGRADE');
  });
});

describe('RogueliteEngine — synergy is capped at exactly the configured multiplier (1.15) and never stacks', () => {
  it('a COMMAND_BOOST reward for an already-boosted command gets exactly ×1.15 weight within its category, never more', () => {
    const build = {
      characters: {
        [testCharacterA.id]: {
          characterId: testCharacterA.id,
          knownSpells: [{ spellId: testCharacterA.initialSpellId, level: 1 }],
          commandBoosts: { attack: 1 }, // already invested in Attack -> synergy should favor reward_boost_attack
          tempStatBoosts: {},
        },
      },
    };
    // Eligible COMMAND_BOOST rewards: attack(synergy ×1.15), guard(1), charge(1), search(1) — total 4.15.
    // attack is first in array order, so its cumulative upper bound is 1.15/4.15.
    // We need to land inside the COMMAND_BOOST category first; force category
    // selection deterministically isn't needed here because at this exact
    // buildState, NEW_SPELL/SPELL_UPGRADE eligibility is unaffected — instead
    // we isolate by giving a single-category reward pool.
    const singleCategoryRewards = testRewardDefinitions.filter((r) => r.category === 'COMMAND_BOOST');
    const engineFactory = (random: ReturnType<typeof fractionalUniformRandom>) =>
      createRogueliteEngine({ spellsById: testSpellsById, rewardDefinitions: singleCategoryRewards, config: testConfig, random });

    const boundary = 1.15 / 4.15;
    const justBelow = engineFactory(fractionalUniformRandom(boundary - 0.001));
    const justAbove = engineFactory(fractionalUniformRandom(boundary + 0.001));

    const below = justBelow.startRewardPhase([testCharacterA], build, false).currentRewardSession.candidates[0];
    const above = justAbove.startRewardPhase([testCharacterA], build, false).currentRewardSession.candidates[0];

    expect(below.reward.id).toBe('r_boost_attack');
    expect(above.reward.id).not.toBe('r_boost_attack');
  });
});

describe('RogueliteEngine — maxLevel exclusions', () => {
  it('excludes a SPELL_UPGRADE reward once the spell is at its own maxLevel', () => {
    const engine = makeEngine(createRandomService(11));
    const build = engine.createDefaultRunBuild(testParty);
    build.characters[testCharacterA.id].knownSpells[0].level = 2; // testInitialSpell.maxLevel === 2

    for (let trial = 0; trial < 100; trial++) {
      const phase = engine.startRewardPhase([testCharacterA], build, false);
      for (const candidate of phase.currentRewardSession.candidates) {
        if (candidate.reward.category === 'SPELL_UPGRADE') {
          expect(candidate.reward.spellId).not.toBe(testCharacterA.initialSpellId);
        }
      }
    }
  });

  it('excludes a COMMAND_BOOST reward once that command is at commandBoostMaxLevel (3)', () => {
    const engine = makeEngine(createRandomService(13));
    const build = engine.createDefaultRunBuild(testParty);
    build.characters[testCharacterA.id].commandBoosts.attack = testConfig.commandBoostMaxLevel;

    for (let trial = 0; trial < 100; trial++) {
      const phase = engine.startRewardPhase([testCharacterA], build, false);
      for (const candidate of phase.currentRewardSession.candidates) {
        if (candidate.reward.category === 'COMMAND_BOOST') {
          expect(candidate.reward.command).not.toBe('attack');
        }
      }
    }
  });

  it('excludes a TEMP_STAT_BOOST reward once that stat is at tempStatBoostMaxLevel (3)', () => {
    const engine = makeEngine(createRandomService(15));
    const build = engine.createDefaultRunBuild(testParty);
    build.characters[testCharacterA.id].tempStatBoosts.hp = testConfig.tempStatBoostMaxLevel;

    for (let trial = 0; trial < 100; trial++) {
      const phase = engine.startRewardPhase([testCharacterA], build, false);
      for (const candidate of phase.currentRewardSession.candidates) {
        if (candidate.reward.category === 'TEMP_STAT_BOOST') {
          expect(candidate.reward.stat).not.toBe('hp');
        }
      }
    }
  });
});

describe('RogueliteEngine — in-offer candidate uniqueness', () => {
  it('never offers the exact same reward twice within one normal (non-exhausted) offer', () => {
    const engine = makeEngine(createRandomService(21));
    const build = engine.createDefaultRunBuild(testParty);

    for (let trial = 0; trial < 200; trial++) {
      const phase = engine.startRewardPhase([testCharacterA], build, false);
      const rewardIds = phase.currentRewardSession.candidates.map((c) => c.reward.id);
      expect(new Set(rewardIds).size).toBe(rewardIds.length);
    }
  });

  it('does not forbid the same character appearing in every candidate (all candidates in one session are always the same fixed target character)', () => {
    const engine = makeEngine(createRandomService(23));
    const build = engine.createDefaultRunBuild(testParty);
    const phase = engine.startRewardPhase([testCharacterA], build, false);
    expect(phase.currentRewardSession.candidates.every((c) => c.characterId === testCharacterA.id)).toBe(true);
  });
});

describe('RogueliteEngine — KO characters are still eligible reward targets', () => {
  it('includes a character with 0 current HP in the reward phase\'s character order', () => {
    const engine = makeEngine();
    const build = engine.createDefaultRunBuild(testParty);
    // KO status lives in RunState.currentHpByCharacterId, not RunBuild — the
    // reward phase itself never filters characterOrder by HP at all.
    const phase = engine.startRewardPhase(testParty, build, false);
    expect(phase.characterOrder).toEqual(testParty.map((c) => c.id));
  });
});
