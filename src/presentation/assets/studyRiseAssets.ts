/**
 * Presentation-only asset registry (docs/StudyRise_AssetManifest_v0.1.md
 * §4/§5/§13). Maps stable content Definition IDs to runtime image paths
 * under `public/assets/studyrise/`. This module is UI-layer only:
 * BattleEngine / RogueliteEngine / StageEngine / ProgressionSystem /
 * SaveSystem never import it, and it never imports their Definition types
 * back (no reverse dependency) — it only ever receives plain `string`
 * ids from the caller. CharacterDefinition / EnemyDefinition gain no new
 * fields because of this file (CLAUDE.md §1/§7), and nothing here is
 * persisted (Save V1 keeps only stable ids, never filenames — manifest
 * §3), so adding/renaming/removing entries here can never require a Save
 * migration.
 *
 * All four `resolve*` functions are pure lookups: an unknown id or an
 * `undefined` input both resolve to `undefined` (never throw), matching
 * `BattleActor.definitionId?: string` so battle UI can call these
 * directly without a null check first (manifest §13's "registry entry
 * なし → 既存テキスト/HP UIへfallback" is implemented by the caller simply
 * treating `undefined` as "no art yet").
 */

export interface CharacterArtDefinition {
  runtimeFilename: string;
}

export interface EnemyArtDefinition {
  runtimeFilename: string;
}

export interface BackgroundArtDefinition {
  runtimeFilename: string;
}

const CHARACTERS_BASE_PATH = '/assets/studyrise/characters/';
const ENEMIES_BASE_PATH = '/assets/studyrise/enemies/';
const BASE_HOME_BASE_PATH = '/assets/studyrise/backgrounds/base/';
const STAGE_BACKGROUNDS_BASE_PATH = '/assets/studyrise/backgrounds/stages/';

/** 3 playable characters (manifest §6). Keyed by `CharacterDefinition.id`. */
export const characterArtById: Record<string, CharacterArtDefinition> = {
  char_hero_placeholder: { runtimeFilename: 'hayama_tomoya.png' },
  char_mage_placeholder: { runtimeFilename: 'nagumo_ayano.png' },
  char_knight_placeholder: { runtimeFilename: 'okamura_kakeru.png' },
};

/**
 * All 13 Area 1 enemies — 8 normal (§7) + 2 強敵 (§8) + 3 Boss (§9). Keyed
 * by `EnemyDefinition.id`, one flat map (mirrors the existing
 * `enemyDefinitionsById` content registry's shape — no separate
 * normal/strong/boss maps, since art lookup doesn't need that
 * distinction: each id already resolves to its own file).
 */
export const enemyArtById: Record<string, EnemyArtDefinition> = {
  enemy_slime_placeholder: { runtimeFilename: 'runner.png' },
  enemy_goblin_placeholder: { runtimeFilename: 'watcher.png' },
  enemy_clamp: { runtimeFilename: 'clamp.png' },
  enemy_relay: { runtimeFilename: 'relay.png' },
  enemy_drainer: { runtimeFilename: 'drainer.png' },
  enemy_purger: { runtimeFilename: 'purger.png' },
  enemy_shielder: { runtimeFilename: 'shielder.png' },
  enemy_scrib: { runtimeFilename: 'scrib.png' },
  enemy_sentinel: { runtimeFilename: 'sentinel.png' },
  enemy_auditor: { runtimeFilename: 'auditor.png' },
  enemy_boss_ogre_placeholder: { runtimeFilename: 'janus.png' },
  enemy_boss_nereid: { runtimeFilename: 'nereid.png' },
  enemy_boss_mnemos: { runtimeFilename: 'mnemos.png' },
};

/** Stage1〜3 backgrounds (manifest §10). Keyed by `StageDefinition.id`. */
export const stageBackgroundById: Record<string, BackgroundArtDefinition> = {
  stage_sample_placeholder: { runtimeFilename: 'stage_closed_route.png' },
  stage_haruka_02: { runtimeFilename: 'stage_circulation_district.png' },
  stage_haruka_03: { runtimeFilename: 'stage_record_tower.png' },
};

/**
 * 拠点 background (manifest §10/§11). Not keyed by a Definition id — the
 * base home screen has no `BaseDefinition`/stable id of its own (it is a
 * single fixed screen, see `BaseHomeScreen.tsx`), so this is the one
 * asset resolved unconditionally rather than by a lookup.
 */
export const baseHomeBackgroundArt: BackgroundArtDefinition = { runtimeFilename: 'base_home.png' };

/** Resolves a `CharacterDefinition.id` (or `BattleActor.definitionId`) to its runtime art path, or `undefined` if unknown/absent. */
export function resolveCharacterArtPath(definitionId: string | undefined): string | undefined {
  if (definitionId === undefined) {
    return undefined;
  }
  const art = characterArtById[definitionId];
  return art ? CHARACTERS_BASE_PATH + art.runtimeFilename : undefined;
}

/** Resolves an `EnemyDefinition.id` (or `BattleActor.definitionId`) to its runtime art path, or `undefined` if unknown/absent. */
export function resolveEnemyArtPath(definitionId: string | undefined): string | undefined {
  if (definitionId === undefined) {
    return undefined;
  }
  const art = enemyArtById[definitionId];
  return art ? ENEMIES_BASE_PATH + art.runtimeFilename : undefined;
}

/** Resolves a `StageDefinition.id` to its runtime background path, or `undefined` if unknown/absent. */
export function resolveStageBackgroundPath(stageId: string | undefined): string | undefined {
  if (stageId === undefined) {
    return undefined;
  }
  const art = stageBackgroundById[stageId];
  return art ? STAGE_BACKGROUNDS_BASE_PATH + art.runtimeFilename : undefined;
}

/** Resolves the one fixed 拠点 background path. Always defined — there is no "unknown id" case (see `baseHomeBackgroundArt`). */
export function resolveBaseHomeBackgroundPath(): string {
  return BASE_HOME_BASE_PATH + baseHomeBackgroundArt.runtimeFilename;
}
