import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';

/**
 * MVP-10 official content — 「解析パルス」(岡村駆の初期スペル; MVP-10で新規
 * 決定した名称、資料由来ではない) と 「リフレクト」(葉山智也の初期スペル;
 * v0.2 §18.1「自分または味方の状況を整える万能系スペル」に既存HEAL
 * mechanicを当てた表示名)。両スペルとも、character.additionalSpellPoolIds
 * を通じて他キャラクターのNEW_SPELL報酬候補にもなる(spec §9.8)。IDは
 * `spell_ice_shard_placeholder` / `spell_heal_placeholder` のままSave V1
 * 互換性を維持。effect/cost/バランス値は変更しない。
 */
export const sampleAdditionalSpellIce: SpellDefinition = {
  id: 'spell_ice_shard_placeholder',
  name: '解析パルス',
  targetType: 'enemy',
  maxLevel: 3,
  levels: [
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 10 }] },
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 16 }] },
    { mpCost: 2, effects: [{ type: 'DAMAGE', amount: 22 }] },
  ],
};

export const sampleAdditionalSpellHeal: SpellDefinition = {
  id: 'spell_heal_placeholder',
  name: 'リフレクト',
  targetType: 'self',
  maxLevel: 3,
  levels: [
    { mpCost: 2, effects: [{ type: 'HEAL', amount: 15 }] },
    { mpCost: 2, effects: [{ type: 'HEAL', amount: 22 }] },
    { mpCost: 2, effects: [{ type: 'HEAL', amount: 30 }] },
  ],
};

/** All spells any sample character's additionalSpellPoolIds may reference. */
export const sampleAdditionalSpells: SpellDefinition[] = [sampleAdditionalSpellIce, sampleAdditionalSpellHeal];
