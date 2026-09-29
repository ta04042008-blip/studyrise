/**
 * Presentation-only asset registry (docs/StudyRise_AssetManifest_v0.1.md).
 *
 * Stable Definition IDs remain the only cross-layer identifiers. Runtime art
 * paths are resolved here so presentation assets can change without touching
 * Engine / Save / Definition schemas.
 */

export interface CharacterArtDefinition {
  /** Full-body art used by character detail / profile surfaces. */
  detailRuntimeFilename: string;
  /** Battle-facing sprite/art. It may be absent on disk until that asset is produced. */
  battleRuntimeFilename: string;
}

export type EnemyVisualSize = 'small' | 'standard' | 'large' | 'extra-large';

export type EnemyMotionType =
  | 'ground'
  | 'quadruped'
  | 'crawler'
  | 'hover'
  | 'flying'
  | 'swimming';

export interface EnemyArtDefinition {
  runtimeFilename: string;
  /**
   * Presentation-only visual class. This must never affect battle stats.
   * extra-large is reserved for bosses / set-piece enemies that should exceed
   * the normal enemy silhouette while remaining inside the battle safe area.
   */
  visualSize?: EnemyVisualSize;
  motionType?: EnemyMotionType;
  /** Fine-tuning multiplier inside the visual-size class. */
  displayScale?: number;
  /** Grounded actors align feet here; hover/flying/swimming align their body baseline. */
  baseline?: 'ground' | 'hover';
}

export interface BackgroundArtDefinition {
  runtimeFilename: string;
}

const APP_BASE_PATH = import.meta.env.BASE_URL;
const CHARACTERS_BASE_PATH = `${APP_BASE_PATH}assets/studyrise/characters/`;
const ENEMIES_BASE_PATH = `${APP_BASE_PATH}assets/studyrise/enemies/`;
const BASE_HOME_BASE_PATH = `${APP_BASE_PATH}assets/studyrise/backgrounds/base/`;
const STAGE_BACKGROUNDS_BASE_PATH = `${APP_BASE_PATH}assets/studyrise/backgrounds/stages/`;

/**
 * 3 playable characters. Detail art and battle art are intentionally separate
 * runtime assets even though both are keyed by the same stable character ID.
 */
export const characterArtById: Record<string, CharacterArtDefinition> = {
  char_hero_placeholder: {
    detailRuntimeFilename: 'hayama_tomoya.png',
    battleRuntimeFilename: 'hayama_tomoya_battle.png',
  },
  char_mage_placeholder: {
    detailRuntimeFilename: 'nagumo_ayano.png',
    battleRuntimeFilename: 'nagumo_ayano_battle.png',
  },
  char_knight_placeholder: {
    detailRuntimeFilename: 'okamura_kakeru.png',
    battleRuntimeFilename: 'okamura_kakeru_battle.png',
  },
};

/** All 13 Area 1 enemies, keyed by EnemyDefinition.id. */
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

/** Stage1〜3 backgrounds, keyed by StageDefinition.id. */
export const stageBackgroundById: Record<string, BackgroundArtDefinition> = {
  stage_sample_placeholder: { runtimeFilename: 'stage_closed_route.png' },
  stage_haruka_02: { runtimeFilename: 'stage_circulation_district.png' },
  stage_haruka_03: { runtimeFilename: 'stage_record_tower.png' },
};

/** Fixed BaseHome background (BaseHome has no Definition ID of its own). */
export const baseHomeBackgroundArt: BackgroundArtDefinition = { runtimeFilename: 'base_home.png' };

/** Resolves full-body detail/profile art for a playable character. */
export function resolveCharacterDetailArtPath(definitionId: string | undefined): string | undefined {
  if (definitionId === undefined) {
    return undefined;
  }
  const art = characterArtById[definitionId];
  return art ? CHARACTERS_BASE_PATH + art.detailRuntimeFilename : undefined;
}

/** Resolves battle-facing art/sprite for a playable character. */
export function resolveCharacterBattleArtPath(definitionId: string | undefined): string | undefined {
  if (definitionId === undefined) {
    return undefined;
  }
  const art = characterArtById[definitionId];
  return art ? CHARACTERS_BASE_PATH + art.battleRuntimeFilename : undefined;
}

/**
 * Backward-compatible alias for callers created before detail/battle art were
 * separated. It intentionally resolves to detail art. New code should call the
 * explicit detail or battle resolver instead.
 */
export function resolveCharacterArtPath(definitionId: string | undefined): string | undefined {
  return resolveCharacterDetailArtPath(definitionId);
}

/** Resolves an EnemyDefinition.id (or BattleActor.definitionId) to runtime art. */
export function resolveEnemyArtPath(definitionId: string | undefined): string | undefined {
  if (definitionId === undefined) {
    return undefined;
  }
  const art = enemyArtById[definitionId];
  return art ? ENEMIES_BASE_PATH + art.runtimeFilename : undefined;
}

/** Presentation metadata for per-enemy sizing / motion without touching Engine definitions. */
export function resolveEnemyArtDefinition(definitionId: string | undefined): EnemyArtDefinition | undefined {
  return definitionId === undefined ? undefined : enemyArtById[definitionId];
}

/** Resolves a StageDefinition.id to its runtime background path. */
export function resolveStageBackgroundPath(stageId: string | undefined): string | undefined {
  if (stageId === undefined) {
    return undefined;
  }
  const art = stageBackgroundById[stageId];
  return art ? STAGE_BACKGROUNDS_BASE_PATH + art.runtimeFilename : undefined;
}

/** Resolves the fixed BaseHome background path. */
export function resolveBaseHomeBackgroundPath(): string {
  return BASE_HOME_BASE_PATH + baseHomeBackgroundArt.runtimeFilename;
}
