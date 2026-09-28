import type { EquipmentDefinition } from '../../engine/progression/ProgressionSystem.types';

/**
 * PLACEHOLDER content — minimal equipment set to exercise MVP-7's
 * equip/enhance/dismantle/drop loop (CLAUDE.md §24). Not final game
 * content. specialEffects/allowedCharacterIds/requiredLevel are
 * intentionally omitted (MVP-7 decision doc §7 — not implemented yet).
 */
export const sampleWeaponNormal: EquipmentDefinition = {
  id: 'equip_weapon_wood_sword_placeholder',
  name: '木の剣', // PLACEHOLDER
  slot: 'weapon',
  rarity: 'NORMAL',
  baseStatBonus: { attack: 5 },
  enhancementBonusPerLevel: { attack: 2 },
};

export const sampleWeaponRare: EquipmentDefinition = {
  id: 'equip_weapon_iron_blade_placeholder',
  name: '鉄の刃', // PLACEHOLDER
  slot: 'weapon',
  rarity: 'RARE',
  baseStatBonus: { attack: 12, speed: 2 },
  enhancementBonusPerLevel: { attack: 3 },
};

export const sampleArmorNormal: EquipmentDefinition = {
  id: 'equip_armor_cloth_robe_placeholder',
  name: '布のローブ', // PLACEHOLDER
  slot: 'armor',
  rarity: 'NORMAL',
  baseStatBonus: { defense: 4, hp: 5 },
  enhancementBonusPerLevel: { defense: 1, hp: 2 },
};

export const sampleArmorUncommon: EquipmentDefinition = {
  id: 'equip_armor_leather_mail_placeholder',
  name: '革の鎧', // PLACEHOLDER
  slot: 'armor',
  rarity: 'UNCOMMON',
  baseStatBonus: { defense: 8, hp: 10 },
  enhancementBonusPerLevel: { defense: 2, hp: 3 },
};

export const sampleAccessoryNormal: EquipmentDefinition = {
  id: 'equip_accessory_wooden_charm_placeholder',
  name: '木のお守り', // PLACEHOLDER
  slot: 'accessory',
  rarity: 'NORMAL',
  baseStatBonus: { speed: 3 },
  enhancementBonusPerLevel: { speed: 1 },
};

export const sampleAccessoryEpic: EquipmentDefinition = {
  id: 'equip_accessory_swift_band_placeholder',
  name: '疾風の腕輪', // PLACEHOLDER
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
