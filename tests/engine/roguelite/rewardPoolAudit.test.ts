import { describe, expect, it } from 'vitest';
import { createRogueliteEngine } from '../../../src/engine/roguelite/RogueliteEngine';
import { createRandomService } from '../../../src/engine/random/RandomService';
import { rewardConfig } from '../../../src/config/rewardConfig';
import { spellsById } from '../../../src/data/spells/spellsById';
import { sampleRewardDefinitions } from '../../../src/data/roguelite/sampleRewardDefinitions';
import { sampleParty } from '../../../src/data/characters/sampleCharacters';
import type { CharacterDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { RunBuild } from '../../../src/engine/roguelite/RogueliteEngine.types';

/**
 * MVP-10 Phase5 reward-pool audit (user's explicit instruction — RogueliteEngine
 * itself is unchanged; this only exercises it against the REAL official
 * content). Each Stage is one independent RunBuild (spec §9.14 — reset on
 * Clear/Defeat/Self Return alike), so the real per-attempt depth is 4 zone
 * clears (one Stage). This simulates a full 12-zone/3-Stage Area run per
 * character anyway, as a stress test beyond the realistic worst case.
 */
function driveOneZoneClear(
  engine: ReturnType<typeof createRogueliteEngine>,
  character: CharacterDefinition,
  runBuild: RunBuild,
  isRareRewardEvent: boolean,
): { runBuild: RunBuild; candidateCount: number; categoriesOffered: string[] } {
  const phase = engine.startRewardPhase([character], runBuild, isRareRewardEvent);
  const candidateCount = phase.currentRewardSession.candidates.length;
  const categoriesOffered = phase.currentRewardSession.candidates.map((c) => c.reward.category);
  const key = phase.currentRewardSession.candidates[0].candidateKey;
  const selected = engine.selectCandidate(phase, key);
  const runState = { build: runBuild, currentHpByCharacterId: {}, rewardPhase: selected };
  const { runState: nextRunState } = engine.confirmAndApply(selected, runState, [character]);
  return { runBuild: nextRunState.build, candidateCount, categoriesOffered };
}

// Matches the official content's per-Stage Zone layout: Zone3 (index 2) is
// the rare-reward-event zone in all 3 Stages (Stage1/2/3), the rest are not.
const ZONE_RARE_FLAGS = [false, false, true, false];

describe('RogueliteEngine reward pool — MVP-10 official content (3 Stages × 4 Zones per character)', () => {
  for (const character of sampleParty) {
    it(`${character.name}: 12 sequential zone-clear reward picks across 3 Stage attempts never throw, never starve, and offer the expected candidate count`, () => {
      const engine = createRogueliteEngine({
        spellsById,
        rewardDefinitions: sampleRewardDefinitions,
        config: rewardConfig,
        random: createRandomService(42),
      });

      let runBuild = engine.createDefaultRunBuild([character]);
      const categoryCounts: Record<string, number> = {};

      for (let stage = 0; stage < 3; stage++) {
        for (let zone = 0; zone < 4; zone++) {
          const isRare = ZONE_RARE_FLAGS[zone];
          const result = driveOneZoneClear(engine, character, runBuild, isRare);
          runBuild = result.runBuild;

          expect(result.candidateCount).toBe(isRare ? rewardConfig.candidateCountRareEvent : rewardConfig.candidateCountNormal);
          for (const category of result.categoriesOffered) {
            categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
          }
        }
        // Spec §9.14: RunBuild resets at Stage end (Clear/Defeat/Self Return alike).
        runBuild = engine.createDefaultRunBuild([character]);
      }

      // Across 12 zone clears (3 independent Stage attempts), every reward
      // category should have appeared at least once — no category is
      // starved out entirely by the offer-weighting/exclusion rules.
      for (const category of ['NEW_SPELL', 'SPELL_UPGRADE', 'COMMAND_BOOST', 'TEMP_STAT_BOOST', 'HEAL_SPECIAL']) {
        expect(categoryCounts[category] ?? 0).toBeGreaterThan(0);
      }
    });

    it(`${character.name}: within a single Stage attempt (4 zone clears, no reset), candidates never collapse to fewer than the expected count even after spell slots fill up`, () => {
      const engine = createRogueliteEngine({
        spellsById,
        rewardDefinitions: sampleRewardDefinitions,
        config: rewardConfig,
        random: createRandomService(7),
      });

      let runBuild = engine.createDefaultRunBuild([character]);
      for (let zone = 0; zone < 4; zone++) {
        const isRare = ZONE_RARE_FLAGS[zone];
        const result = driveOneZoneClear(engine, character, runBuild, isRare);
        runBuild = result.runBuild;
        expect(result.candidateCount).toBe(isRare ? rewardConfig.candidateCountRareEvent : rewardConfig.candidateCountNormal);
      }

      // After 4 picks, this character should have accumulated multiple
      // known spells (up to the spec §4.5 cap of 3) without ever erroring.
      const finalKnownSpells = runBuild.characters[character.id].knownSpells;
      expect(finalKnownSpells.length).toBeGreaterThanOrEqual(1);
      expect(finalKnownSpells.length).toBeLessThanOrEqual(3);
    });
  }
});
