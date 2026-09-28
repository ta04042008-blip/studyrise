import type { EquipmentDefinition } from '../../engine/progression/ProgressionSystem.types';

/**
 * MVP-10 official content — display names正式化(旧文明技術/遠征用品の語彙、
 * ビジュアルデザイン基準v0.1 §5/§8を参照)。IDs kept unchanged for Save V1
 * compatibility (user's explicit instruction). specialEffects/
 * allowedCharacterIds/requiredLevel remain intentionally omitted (MVP-7
 * decision doc §7 — not implemented yet). stat bonuses unchanged.
 */
export const sampleWeaponNormal: EquipmentDefinition = {
  id: 'equip_weapon_wood_sword_placeholder',
  name: '簡易出力端末',
  slot: 'weapon',
  rarity: 'NORMAL',
  baseStatBonus: { attack: 5 },
  enhancementBonusPerLevel: { attack: 2 },
};

export const sampleWeaponRare: EquipmentDefinition = {
  id: 'equip_weapon_iron_blade_placeholder',
  name: '高出力演算端末',
  slot: 'weapon',
  rarity: 'RARE',
  baseStatBonus: { attack: 12, speed: 2 },
  enhancementBonusPerLevel: { attack: 3 },
};

export const sampleArmorNormal: EquipmentDefinition = {
  id: 'equip_armor_cloth_robe_placeholder',
  name: '遠征ジャケット',
  slot: 'armor',
  rarity: 'NORMAL',
  baseStatBonus: { defense: 4, hp: 5 },
  enhancementBonusPerLevel: { defense: 1, hp: 2 },
};

export const sampleArmorUncommon: EquipmentDefinition = {
  id: 'equip_armor_leather_mail_placeholder',
  name: '耐衝撃ベスト',
  slot: 'armor',
  rarity: 'UNCOMMON',
  baseStatBonus: { defense: 8, hp: 10 },
  enhancementBonusPerLevel: { defense: 2, hp: 3 },
};

export const sampleAccessoryNormal: EquipmentDefinition = {
  id: 'equip_accessory_wooden_charm_placeholder',
  name: '軽量識別タグ',
  slot: 'accessory',
  rarity: 'NORMAL',
  baseStatBonus: { speed: 3 },
  enhancementBonusPerLevel: { speed: 1 },
};

export const sampleAccessoryEpic: EquipmentDefinition = {
  id: 'equip_accessory_swift_band_placeholder',
  name: '発光接続インジケーター',
  slot: 'accessory',
  rarity: 'EPIC',
  baseStatBonus: { speed: 8, attack: 4 },
  enhancementBonusPerLevel: { speed: 2, attack: 1 },
};

export const sampleEquipmentDefinitions: EquipmentDefinition[] = [
  sampleWeaponNormal,
  sampleWeaponRare,
  sampleArmorNormal,
  sampleArmorUncommon,
  sampleAccessoryNormal,
  sampleAccessoryEpic,
];

export const sampleEquipmentDefinitionsById: Record<string, EquipmentDefinition> = Object.fromEntries(
  sampleEquipmentDefinitions.map((e) => [e.id, e]),
);
