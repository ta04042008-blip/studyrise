import { describe, expect, it } from 'vitest';
import {
  characterArtById,
  enemyArtById,
  stageBackgroundById,
  resolveCharacterArtPath,
  resolveEnemyArtPath,
  resolveStageBackgroundPath,
  resolveBaseHomeBackgroundPath,
} from '../../../src/presentation/assets/studyRiseAssets';

describe('studyRiseAssets registries', () => {
  it('has exactly the 3 playable characters', () => {
    expect(Object.keys(characterArtById)).toHaveLength(3);
  });

  it('has exactly the 13 Area 1 enemies (8 normal + 2 強敵 + 3 Boss)', () => {
    expect(Object.keys(enemyArtById)).toHaveLength(13);
  });

  it('has exactly the 3 Stage backgrounds', () => {
    expect(Object.keys(stageBackgroundById)).toHaveLength(3);
  });
});

describe('resolveCharacterArtPath', () => {
  it('resolves a known character id to its runtime path', () => {
    expect(resolveCharacterArtPath('char_hero_placeholder')).toBe(
      '/assets/studyrise/characters/hayama_tomoya.png',
    );
    expect(resolveCharacterArtPath('char_mage_placeholder')).toBe(
      '/assets/studyrise/characters/nagumo_ayano.png',
    );
    expect(resolveCharacterArtPath('char_knight_placeholder')).toBe(
      '/assets/studyrise/characters/okamura_kakeru.png',
    );
  });

  it('returns undefined for an unknown id', () => {
    expect(resolveCharacterArtPath('char_does_not_exist')).toBeUndefined();
  });

  it('returns undefined for undefined input, without throwing', () => {
    expect(() => resolveCharacterArtPath(undefined)).not.toThrow();
    expect(resolveCharacterArtPath(undefined)).toBeUndefined();
  });
});

describe('resolveEnemyArtPath', () => {
  it('resolves every registered enemy id to its runtime path', () => {
    expect(resolveEnemyArtPath('enemy_slime_placeholder')).toBe('/assets/studyrise/enemies/runner.png');
    expect(resolveEnemyArtPath('enemy_goblin_placeholder')).toBe('/assets/studyrise/enemies/watcher.png');
    expect(resolveEnemyArtPath('enemy_clamp')).toBe('/assets/studyrise/enemies/clamp.png');
    expect(resolveEnemyArtPath('enemy_relay')).toBe('/assets/studyrise/enemies/relay.png');
    expect(resolveEnemyArtPath('enemy_drainer')).toBe('/assets/studyrise/enemies/drainer.png');
    expect(resolveEnemyArtPath('enemy_purger')).toBe('/assets/studyrise/enemies/purger.png');
    expect(resolveEnemyArtPath('enemy_shielder')).toBe('/assets/studyrise/enemies/shielder.png');
    expect(resolveEnemyArtPath('enemy_scrib')).toBe('/assets/studyrise/enemies/scrib.png');
    expect(resolveEnemyArtPath('enemy_sentinel')).toBe('/assets/studyrise/enemies/sentinel.png');
    expect(resolveEnemyArtPath('enemy_auditor')).toBe('/assets/studyrise/enemies/auditor.png');
    expect(resolveEnemyArtPath('enemy_boss_ogre_placeholder')).toBe('/assets/studyrise/enemies/janus.png');
    expect(resolveEnemyArtPath('enemy_boss_nereid')).toBe('/assets/studyrise/enemies/nereid.png');
    expect(resolveEnemyArtPath('enemy_boss_mnemos')).toBe('/assets/studyrise/enemies/mnemos.png');
  });

  it('returns undefined for an unknown id', () => {
    expect(resolveEnemyArtPath('enemy_does_not_exist')).toBeUndefined();
  });

  it('returns undefined for undefined input, without throwing', () => {
    expect(() => resolveEnemyArtPath(undefined)).not.toThrow();
    expect(resolveEnemyArtPath(undefined)).toBeUndefined();
  });
});

describe('resolveStageBackgroundPath', () => {
  it('resolves a known stage id to its runtime path', () => {
    expect(resolveStageBackgroundPath('stage_sample_placeholder')).toBe(
      '/assets/studyrise/backgrounds/stages/stage_closed_route.png',
    );
    expect(resolveStageBackgroundPath('stage_haruka_02')).toBe(
      '/assets/studyrise/backgrounds/stages/stage_circulation_district.png',
    );
    expect(resolveStageBackgroundPath('stage_haruka_03')).toBe(
      '/assets/studyrise/backgrounds/stages/stage_record_tower.png',
    );
  });

  it('returns undefined for an unknown id', () => {
    expect(resolveStageBackgroundPath('stage_does_not_exist')).toBeUndefined();
  });

  it('returns undefined for undefined input, without throwing', () => {
    expect(() => resolveStageBackgroundPath(undefined)).not.toThrow();
    expect(resolveStageBackgroundPath(undefined)).toBeUndefined();
  });
});

describe('resolveBaseHomeBackgroundPath', () => {
  it('always resolves the fixed 拠点 background path', () => {
    expect(resolveBaseHomeBackgroundPath()).toBe('/assets/studyrise/backgrounds/base/base_home.png');
  });
});
