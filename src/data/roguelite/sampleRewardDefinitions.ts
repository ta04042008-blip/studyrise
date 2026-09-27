import type { RewardDefinition } from '../../engine/roguelite/RogueliteEngine.types';
import { rewardConfig } from '../../config/rewardConfig';
import { sampleSpell } from '../spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../spells/sampleAdditionalSpells';

/**
 * PLACEHOLDER content (CLAUDE.md §24) — the MVP-4 sample reward pool, just
 * enough to exercise every RewardCategory end-to-end. Not final game
 * balance; only the id/category/target fields are load-bearing for
 * RogueliteEngine, the name/description text is illustrative.
 */
export const sampleRewardDefinitions: RewardDefinition[] = [
  // NEW_SPELL — one per spell in the sample characters' additionalSpellPoolIds.
  {
    id: 'reward_new_spell_ice',
    category: 'NEW_SPELL',
    spellId: sampleAdditionalSpellIce.id,
    name: '新規スペル：アイスシャード',
    description: 'アイスシャードを新たに習得する。',
  },
  {
    id: 'reward_new_spell_heal',
    category: 'NEW_SPELL',
    spellId: sampleAdditionalSpellHeal.id,
    name: '新規スペル：ヒール',
    description: 'ヒールを新たに習得する。',
  },

  // SPELL_UPGRADE — one per spell any sample character could know.
  {
    id: 'reward_spell_upgrade_firebolt',
    category: 'SPELL_UPGRADE',
    spellId: sampleSpell.id,
    name: 'スペル強化：ファイアボルト',
    description: 'ファイアボルトのLvを1上げる。',
  },
  {
    id: 'reward_spell_upgrade_ice',
    category: 'SPELL_UPGRADE',
    spellId: sampleAdditionalSpellIce.id,
    name: 'スペル強化：アイスシャード',
    description: 'アイスシャードのLvを1上げる。',
  },
  {
    id: 'reward_spell_upgrade_heal',
    category: 'SPELL_UPGRADE',
    spellId: sampleAdditionalSpellHeal.id,
    name: 'スペル強化：ヒール',
    description: 'ヒールのLvを1上げる。',
  },

  // COMMAND_BOOST — one per official command (max 3 stacks, rewardConfig).
  {
    id: 'reward_command_boost_attack',
    category: 'COMMAND_BOOST',
    command: 'attack',
    name: '基本コマンド強化：アタック',
    description: `アタックの最終ダメージ +${rewardConfig.commandBoostPerLevel.attack}%（1段階）。`,
  },
  {
    id: 'reward_command_boost_guard',
    category: 'COMMAND_BOOST',
    command: 'guard',
    name: '基本コマンド強化：ガード',
    description: `ガードの軽減率 +${Math.round(rewardConfig.commandBoostPerLevel.guard * 100)}pt（1段階）。`,
  },
  {
    id: 'reward_command_boost_charge',
    category: 'COMMAND_BOOST',
    command: 'charge',
    name: '基本コマンド強化：チャージ',
    description: `チャージの大成功率 +${Math.round(rewardConfig.commandBoostPerLevel.charge * 100)}pt（1段階）。`,
  },
  {
    id: 'reward_command_boost_search',
    category: 'COMMAND_BOOST',
    command: 'search',
    name: '基本コマンド強化：サーチ',
    description: `サーチの未来行動表示数 +${rewardConfig.commandBoostPerLevel.search}（1段階）。`,
  },

  // TEMP_STAT_BOOST — one per boostable stat (max 3 stacks, rewardConfig).
  {
    id: 'reward_temp_stat_hp',
    category: 'TEMP_STAT_BOOST',
    stat: 'hp',
    name: '一時ステータス強化：HP',
    description: `最大HP +${rewardConfig.tempStatBoostPerLevel.hp}（現在HPも同時に加算、1段階）。`,
  },
  {
    id: 'reward_temp_stat_attack',
    category: 'TEMP_STAT_BOOST',
    stat: 'attack',
    name: '一時ステータス強化：学力',
    description: `学力 +${rewardConfig.tempStatBoostPerLevel.attack}（1段階）。`,
  },
  {
    id: 'reward_temp_stat_defense',
    category: 'TEMP_STAT_BOOST',
    stat: 'defense',
    name: '一時ステータス強化：忍耐力',
    description: `忍耐力 +${rewardConfig.tempStatBoostPerLevel.defense}（1段階）。`,
  },
  {
    id: 'reward_temp_stat_speed',
    category: 'TEMP_STAT_BOOST',
    stat: 'speed',
    name: '一時ステータス強化：思考速度',
    description: `思考速度 +${rewardConfig.tempStatBoostPerLevel.speed}（1段階）。`,
  },

  // HEAL_SPECIAL — MVP-4's one sample: immediate heal for a percent of maxHp.
  {
    id: 'reward_heal_special_sample',
    category: 'HEAL_SPECIAL',
    applicationTiming: 'IMMEDIATE',
    healPercentOfMaxHp: rewardConfig.healSpecialSamplePercentOfMaxHp,
    name: '回復・特殊効果：応急手当',
    description: `最大HPの${Math.round(rewardConfig.healSpecialSamplePercentOfMaxHp * 100)}%を即座に回復する。`,
  },
];
