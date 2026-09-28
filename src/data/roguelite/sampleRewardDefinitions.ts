import type { RewardDefinition } from '../../engine/roguelite/RogueliteEngine.types';
import { rewardConfig } from '../../config/rewardConfig';
import { sampleSpell } from '../spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../spells/sampleAdditionalSpells';

/**
 * MVP-10 official content — reward pool covering every RewardCategory.
 * Spell name references正式化(ブレイク/解析パルス/リフレクト、既存ID/effect
 * は変更しない)。`reward_new_spell_firebolt`はMVP-10で新規追加(既存
 * mechanicのみ使用、user's Phase5指示 — 智也/駆のadditionalSpellPoolIdsに
 * ブレイクが入ったため、その2人がNEW_SPELLでブレイクを習得できるよう
 * 対応するreward candidateが必要)。
 */
export const sampleRewardDefinitions: RewardDefinition[] = [
  // NEW_SPELL — one per spell any character's additionalSpellPoolIds may reference.
  {
    id: 'reward_new_spell_firebolt',
    category: 'NEW_SPELL',
    spellId: sampleSpell.id,
    name: '新規スペル：ブレイク',
    description: 'ブレイクを新たに習得する。',
  },
  {
    id: 'reward_new_spell_ice',
    category: 'NEW_SPELL',
    spellId: sampleAdditionalSpellIce.id,
    name: '新規スペル：解析パルス',
    description: '解析パルスを新たに習得する。',
  },
  {
    id: 'reward_new_spell_heal',
    category: 'NEW_SPELL',
    spellId: sampleAdditionalSpellHeal.id,
    name: '新規スペル：リフレクト',
    description: 'リフレクトを新たに習得する。',
  },

  // SPELL_UPGRADE — one per spell any sample character could know.
  {
    id: 'reward_spell_upgrade_firebolt',
    category: 'SPELL_UPGRADE',
    spellId: sampleSpell.id,
    name: 'スペル強化：ブレイク',
    description: 'ブレイクのLvを1上げる。',
  },
  {
    id: 'reward_spell_upgrade_ice',
    category: 'SPELL_UPGRADE',
    spellId: sampleAdditionalSpellIce.id,
    name: 'スペル強化：解析パルス',
    description: '解析パルスのLvを1上げる。',
  },
  {
    id: 'reward_spell_upgrade_heal',
    category: 'SPELL_UPGRADE',
    spellId: sampleAdditionalSpellHeal.id,
    name: 'スペル強化：リフレクト',
    description: 'リフレクトのLvを1上げる。',
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
