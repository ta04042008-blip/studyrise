import type { Rarity } from '../../engine/roguelite/RogueliteEngine.types';

/**
 * Text label per rarity (CLAUDE.md §17 — never communicate rarity by color
 * alone). The ★ count is purely decorative text here, unrelated to the
 * question-difficulty ★ (spec §9.4/§11.5: they must never influence each other).
 */
const LABELS: Record<Rarity, string> = {
  NORMAL: '★☆☆☆☆ ノーマル',
  UNCOMMON: '★★☆☆☆ アンコモン',
  RARE: '★★★☆☆ レア',
  EPIC: '★★★★☆ エピック',
  LEGENDARY: '★★★★★ レジェンダリー',
};

export function rarityLabel(rarity: Rarity): string {
  return LABELS[rarity];
}
