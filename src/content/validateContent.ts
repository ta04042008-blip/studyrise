import type { CharacterDefinition, EnemyDefinition, ItemDefinition, SpellDefinition } from '../engine/battle/BattleEngine.types';
import type { AreaDefinition } from '../base/base.types';
import type { StageDefinition } from '../engine/stage/StageEngine.types';
import type { QuestionDefinition } from '../engine/question/QuestionEngine.types';
import type { RewardDefinition } from '../engine/roguelite/RogueliteEngine.types';
import type {
  CharacterUnlockRule,
  EquipmentDefinition,
  EquipmentDropTable,
  StageUnlockRule,
} from '../engine/progression/ProgressionSystem.types';
import type { QuestionCommandKind } from '../engine/battle/BattleEngine.types';
import { validateStagePool } from '../engine/stage/stageValidation';
import { validateQuestionPool } from '../engine/question/questionValidation';

/**
 * MVP-10 content-only validation layer (user's explicit MVP-10 instruction
 * §24 — never mixed into BattleEngine). Checks cross-reference integrity
 * across the whole content bundle: duplicate ids, dangling references,
 * unlock dead-ends, and reward-pool completeness. Per-item shape checks
 * (question fields, Stage/Zone/Boss placement rules) are delegated to the
 * existing `questionValidation`/`stageValidation` modules rather than
 * re-implemented here.
 */
export interface GameContentBundle {
  characters: CharacterDefinition[];
  enemies: EnemyDefinition[];
  spells: SpellDefinition[];
  equipment: EquipmentDefinition[];
  dropTables: EquipmentDropTable[];
  items: ItemDefinition[];
  areas: AreaDefinition[];
  stages: StageDefinition[];
  questions: QuestionDefinition[];
  rewards: RewardDefinition[];
  stageUnlockRules: StageUnlockRule[];
  characterUnlockRules: CharacterUnlockRule[];
}

export interface ContentValidationIssue {
  code: string;
  message: string;
}

export interface ContentValidationResult {
  valid: boolean;
  issues: ContentValidationIssue[];
}

function findDuplicateIds<T extends { id: string }>(items: T[], code: string, label: string): ContentValidationIssue[] {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  const issues: ContentValidationIssue[] = [];
  for (const [id, count] of counts) {
    if (count > 1) issues.push({ code, message: `Duplicate ${label} id "${id}" appears ${count} times.` });
  }
  return issues;
}

const ALL_COMMANDS: QuestionCommandKind[] = ['attack', 'guard', 'charge', 'search'];
const ALL_TEMP_STATS = ['hp', 'attack', 'defense', 'speed'] as const;

export function validateGameContent(bundle: GameContentBundle): ContentValidationResult {
  const issues: ContentValidationIssue[] = [];

  // --- Duplicate definition IDs, per content category. ---
  issues.push(...findDuplicateIds(bundle.characters, 'DUPLICATE_CHARACTER_ID', 'character'));
  issues.push(...findDuplicateIds(bundle.enemies, 'DUPLICATE_ENEMY_ID', 'enemy'));
  issues.push(...findDuplicateIds(bundle.spells, 'DUPLICATE_SPELL_ID', 'spell'));
  issues.push(...findDuplicateIds(bundle.equipment, 'DUPLICATE_EQUIPMENT_ID', 'equipment'));
  issues.push(...findDuplicateIds(bundle.dropTables, 'DUPLICATE_DROP_TABLE_ID', 'drop table'));
  issues.push(...findDuplicateIds(bundle.items, 'DUPLICATE_ITEM_ID', 'item'));
  issues.push(...findDuplicateIds(bundle.areas, 'DUPLICATE_AREA_ID', 'area'));
  issues.push(...findDuplicateIds(bundle.stages, 'DUPLICATE_STAGE_ID', 'stage'));
  issues.push(...findDuplicateIds(bundle.questions, 'DUPLICATE_QUESTION_ID', 'question'));
  issues.push(...findDuplicateIds(bundle.rewards, 'DUPLICATE_REWARD_ID', 'reward'));

  const spellIds = new Set(bundle.spells.map((s) => s.id));
  const equipmentIds = new Set(bundle.equipment.map((e) => e.id));
  const stageIds = new Set(bundle.stages.map((s) => s.id));
  const characterIds = new Set(bundle.characters.map((c) => c.id));

  // --- Dangling character spell references. ---
  for (const character of bundle.characters) {
    if (!spellIds.has(character.initialSpellId)) {
      issues.push({
        code: 'DANGLING_CHARACTER_SPELL',
        message: `Character "${character.id}" initialSpellId "${character.initialSpellId}" does not exist.`,
      });
    }
    for (const spellId of character.additionalSpellPoolIds) {
      if (!spellIds.has(spellId)) {
        issues.push({
          code: 'DANGLING_CHARACTER_SPELL',
          message: `Character "${character.id}" additionalSpellPoolIds references missing spell "${spellId}".`,
        });
      }
    }
  }

  // --- Dangling reward spell references. ---
  for (const reward of bundle.rewards) {
    if ((reward.category === 'NEW_SPELL' || reward.category === 'SPELL_UPGRADE') && !spellIds.has(reward.spellId)) {
      issues.push({
        code: 'DANGLING_REWARD_SPELL',
        message: `Reward "${reward.id}" references missing spell "${reward.spellId}".`,
      });
    }
  }

  // --- Dangling equipment drop-table references. ---
  for (const table of bundle.dropTables) {
    for (const entry of table.entries) {
      if (!equipmentIds.has(entry.equipmentDefinitionId)) {
        issues.push({
          code: 'DANGLING_EQUIPMENT',
          message: `Drop table "${table.id}" references missing equipment "${entry.equipmentDefinitionId}".`,
        });
      }
    }
  }

  // --- Invalid Area → Stage references. ---
  for (const area of bundle.areas) {
    for (const stageId of area.stageIds) {
      if (!stageIds.has(stageId)) {
        issues.push({ code: 'INVALID_AREA_STAGE_ID', message: `Area "${area.id}" references missing stage "${stageId}".` });
      }
    }
  }

  // --- Invalid Stage/Character unlock rule targets. ---
  for (const rule of bundle.stageUnlockRules) {
    if (!stageIds.has(rule.stageId)) {
      issues.push({ code: 'INVALID_STAGE_UNLOCK_TARGET', message: `StageUnlockRule source stage "${rule.stageId}" does not exist.` });
    }
    for (const target of rule.unlocksStageIds) {
      if (!stageIds.has(target)) {
        issues.push({
          code: 'INVALID_STAGE_UNLOCK_TARGET',
          message: `StageUnlockRule for "${rule.stageId}" unlocks missing stage "${target}".`,
        });
      }
    }
  }
  for (const rule of bundle.characterUnlockRules) {
    if (!characterIds.has(rule.characterId)) {
      issues.push({
        code: 'INVALID_CHARACTER_UNLOCK_TARGET',
        message: `CharacterUnlockRule references missing character "${rule.characterId}".`,
      });
    }
    if (rule.type === 'STAGE_FIRST_CLEAR' && !stageIds.has(rule.stageId)) {
      issues.push({
        code: 'INVALID_CHARACTER_UNLOCK_TARGET',
        message: `CharacterUnlockRule references missing stage "${rule.stageId}".`,
      });
    }
  }

  // --- Unlock dead-end: every Area-listed stage must be reachable, either
  // as an Area's own entry point (its stageIds[0] — a validation-only
  // heuristic; actual runtime unlock state is never inferred from this
  // array order, per spec §10.14) or transitively via a StageUnlockRule
  // chain starting from one. ---
  const reachable = new Set<string>();
  for (const area of bundle.areas) {
    if (area.stageIds.length > 0) reachable.add(area.stageIds[0]);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of bundle.stageUnlockRules) {
      if (!reachable.has(rule.stageId)) continue;
      for (const target of rule.unlocksStageIds) {
        if (!reachable.has(target)) {
          reachable.add(target);
          changed = true;
        }
      }
    }
  }
  for (const area of bundle.areas) {
    for (const stageId of area.stageIds) {
      if (!reachable.has(stageId)) {
        issues.push({
          code: 'UNLOCK_DEAD_END',
          message: `Stage "${stageId}" in area "${area.id}" is unreachable via any StageUnlockRule chain.`,
        });
      }
    }
  }

  // --- Stage/Zone structural validation (delegates to stageValidation). ---
  const enemiesById = Object.fromEntries(bundle.enemies.map((e) => [e.id, e]));
  const stagePoolResult = validateStagePool(bundle.stages, enemiesById);
  for (const { stage, errors } of stagePoolResult.invalid) {
    for (const error of errors) {
      issues.push({ code: 'STAGE_STRUCTURE_INVALID', message: `Stage "${stage.id}": ${error}` });
    }
  }

  // --- Question pool validation (per-question shape) + duplicate check
  // above already covers cross-pool id uniqueness. ---
  const questionPoolResult = validateQuestionPool(bundle.questions);
  for (const { question, errors } of questionPoolResult.invalid) {
    for (const error of errors) {
      issues.push({ code: 'QUESTION_INVALID', message: `Question "${question.id}": ${error}` });
    }
  }

  // --- Empty departure question pool guard: every (subject, ★) combination
  // that appears at all in the pool should have at least one question —
  // this is always true by construction, but a subject with 0 questions
  // for any of ★1〜5 is flagged as informational since spec §12.2 requires
  // "選択した各教科で最低1単元" and MVP-10's target bank is 5-per-★. ---
  const subjects = new Set(bundle.questions.map((q) => q.subject));
  for (const subject of subjects) {
    for (const star of [1, 2, 3, 4, 5] as const) {
      const count = bundle.questions.filter((q) => q.subject === subject && q.star === star).length;
      if (count === 0) {
        issues.push({ code: 'QUESTION_STAR_GAP', message: `Subject "${subject}" has zero ★${star} questions.` });
      }
    }
  }

  // --- Reward pool completeness: every spell a character can ever know
  // must have a NEW_SPELL reward (for pool spells) and a SPELL_UPGRADE
  // reward (for its initial spell), and every command/stat must have a
  // COMMAND_BOOST/TEMP_STAT_BOOST reward — otherwise RogueliteEngine could
  // exhaust that character's candidate pool prematurely (Phase5 audit). ---
  const newSpellRewardSpellIds = new Set(
    bundle.rewards.filter((r) => r.category === 'NEW_SPELL').map((r) => r.spellId),
  );
  const upgradeRewardSpellIds = new Set(
    bundle.rewards.filter((r) => r.category === 'SPELL_UPGRADE').map((r) => r.spellId),
  );
  for (const character of bundle.characters) {
    if (!upgradeRewardSpellIds.has(character.initialSpellId)) {
      issues.push({
        code: 'REWARD_POOL_GAP',
        message: `No SPELL_UPGRADE reward exists for character "${character.id}"'s initial spell "${character.initialSpellId}".`,
      });
    }
    for (const spellId of character.additionalSpellPoolIds) {
      if (!newSpellRewardSpellIds.has(spellId)) {
        issues.push({
          code: 'REWARD_POOL_GAP',
          message: `No NEW_SPELL reward exists for spell "${spellId}" in character "${character.id}"'s additionalSpellPoolIds.`,
        });
      }
      if (!upgradeRewardSpellIds.has(spellId)) {
        issues.push({
          code: 'REWARD_POOL_GAP',
          message: `No SPELL_UPGRADE reward exists for spell "${spellId}" in character "${character.id}"'s additionalSpellPoolIds.`,
        });
      }
    }
  }
  const commandBoostCommands = new Set(
    bundle.rewards.filter((r) => r.category === 'COMMAND_BOOST').map((r) => r.command),
  );
  for (const command of ALL_COMMANDS) {
    if (!commandBoostCommands.has(command)) {
      issues.push({ code: 'REWARD_POOL_GAP', message: `No COMMAND_BOOST reward exists for command "${command}".` });
    }
  }
  const tempStatBoostStats = new Set(bundle.rewards.filter((r) => r.category === 'TEMP_STAT_BOOST').map((r) => r.stat));
  for (const stat of ALL_TEMP_STATS) {
    if (!tempStatBoostStats.has(stat)) {
      issues.push({ code: 'REWARD_POOL_GAP', message: `No TEMP_STAT_BOOST reward exists for stat "${stat}".` });
    }
  }

  return { valid: issues.length === 0, issues };
}
