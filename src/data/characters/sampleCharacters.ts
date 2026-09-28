import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleCharacter } from './sampleCharacter';
import { sampleSpell } from '../spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../spells/sampleAdditionalSpells';

/**
 * MVP-10 official content — 南雲彩乃 (Nagumo Ayano) and 岡村駆 (Okamura
 * Kakeru), the remaining two of the initial 3-person party (ストーリー・
 * 世界観仕様書 v0.2 §19-20). IDs kept as `char_mage_placeholder` /
 * `char_knight_placeholder` for Save V1 compatibility (user's explicit
 * MVP-10 instruction); only display name / spell assignment / growth
 * profile are updated. Lv1 baseStats are unchanged from MVP-1〜9.
 */
export const samplePartyMember2: CharacterDefinition = {
  id: 'char_mage_placeholder',
  name: '南雲彩乃',
  baseStats: {
    attack: 20,
    defense: 5,
    speed: 16,
    maxHp: 45,
    maxMp: 5,
  },
  // 彩乃の初期スペルは「ブレイク」(既存firebolt spellの表示名正式化)。
  initialSpellId: sampleSpell.id,
  additionalSpellPoolIds: [sampleAdditionalSpellIce.id, sampleAdditionalSpellHeal.id],
};

export const samplePartyMember3: CharacterDefinition = {
  id: 'char_knight_placeholder',
  name: '岡村駆',
  baseStats: {
    attack: 18,
    defense: 14,
    speed: 8,
    maxHp: 80,
    maxMp: 5,
  },
  // 駆の初期スペルは「解析パルス」(既存ice_shard spellの表示名正式化)。
  initialSpellId: sampleAdditionalSpellIce.id,
  additionalSpellPoolIds: [sampleSpell.id, sampleAdditionalSpellHeal.id],
};

/** Full 3-person party, in fixed order (spec §4.1: no mid-stage swap in MVP-3). */
export const sampleParty: CharacterDefinition[] = [sampleCharacter, samplePartyMember2, samplePartyMember3];
