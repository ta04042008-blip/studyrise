import type { DepartureItemCatalogEntry } from '../../base/base.types';
import { sampleItem } from './sampleItem';

/**
 * PLACEHOLDER MVP-6 *temporary* departure item catalog (spec §5.10 持ち込み
 * 3枠). This is explicitly not a permanent Inventory (CLAUDE.md §21 — stock,
 * purchase, sale, and post-Stage inventory changes are all MVP-7). Not final
 * game content.
 */
export const sampleDepartureItemCatalog: DepartureItemCatalogEntry[] = [{ item: sampleItem, defaultUses: 2 }];

export const sampleDepartureItemCatalogById: Record<string, DepartureItemCatalogEntry> = Object.fromEntries(
  sampleDepartureItemCatalog.map((entry) => [entry.item.id, entry]),
);
