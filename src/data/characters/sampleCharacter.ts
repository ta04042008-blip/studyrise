import type { CharacterDefinition } from '../../engine/battle/BattleEngine.types';
import { sampleSpell } from '../spells/sampleSpell';
import { sampleAdditionalSpellHeal, sampleAdditionalSpellIce } from '../spells/sampleAdditionalSpells';

/**
 * MVP-10 official content — 葉山智也 (Hayama Tomoya), the first of the
 * initial 3-person party (ストーリー・世界観仕様書 v0.2 §18 / v0.2.1). ID kept
 * as `char_hero_placeholder` for Save V1 compatibility (user's explicit
 * MVP-10 instruction); only display name / spell assignment / growth
 * profile are updated by official content. Lv1 baseStats are unchanged
 * from MVP-1〜9 to protect existing battle balance.
 */
export const sampleCharacter: CharacterDefinition = {
  id: 'char_hero_placeholder',
  name: '葉山智也',
  baseStats: {
    attack: 24,
    defense: 8,
    speed: 12,
    maxHp: 60,
    maxMp: 5,
  },
  // 智也の初期スペルは「リフレクト」(既存heal spellの表示名正式化、MVP-10決定)。
  initialSpellId: sampleAdditionalSpellHeal.id,
  additionalSpellPoolIds: [sampleSpell.id, sampleAdditionalSpellIce.id],
};
