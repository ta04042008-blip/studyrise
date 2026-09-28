/**
 * Shared 5-tier rarity scale (spec §9.5 roguelite rewards, §10.3 equipment).
 * Lives outside both RogueliteEngine and ProgressionSystem so neither has to
 * depend on the other's module just to share this one type (user's explicit
 * MVP-7 instruction — ProgressionSystem must not import from
 * RogueliteEngine.types.ts).
 */
export type Rarity = 'NORMAL' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export const RARITIES: readonly Rarity[] = ['NORMAL', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
