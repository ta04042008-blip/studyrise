import { describe, expect, it } from 'vitest';
import {
  characterArtById,
  enemyArtById,
  stageBackgroundById,
  resolveCharacterArtPath,
  resolveCharacterDetailArtPath,
  resolveCharacterBattleArtPath,
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

describe('character art resolvers', () => {
  it('resolves detail art for all 3 playable characters', () => {
    expect(resolveCharacterDetailArtPath('char_hero_placeholder')).toBe(
      '/assets/studyrise/characters/hayama_tomoya.png',
    );
    expect(resolveCharacterDetailArtPath('char_mage_placeholder')).toBe(
      '/assets/studyrise/characters/nagumo_ayano.png',
    );
    expect(resolveCharacterDetailArtPath('char_knight_placeholder')).toBe(
      '/assets/studyrise/characters/okamura_kakeru.png',
    );
  });

  it('resolves separate battle art paths for all 3 playable characters', () => {
    expect(resolveCharacterBattleArtPath('char_hero_placeholder')).toBe(
      '/assets/studyrise/characters/hayama_tomoya_battle.png',
    );
    expect(resolveCharacterBattleArtPath('char_mage_placeholder')).toBe(
      '/assets/studyrise/characters/nagumo_ayano_battle.png',
    );
    expect(resolveCharacterBattleArtPath('char_knight_placeholder')).toBe(
      '/assets/studyrise/characters/okamura_kakeru_battle.png',
    );
  });

  it('keeps resolveCharacterArtPath as a detail-art compatibility alias', () => {
    expect(resolveCharacterArtPath('char_hero_placeholder')).toBe(
      resolveCharacterDetailArtPath('char_hero_placeholder'),
    );
  });

  it('returns undefined for unknown ids', () => {
    expect(resolveCharacterDetailArtPath('char_does_not_exist')).toBeUndefined();
    expect(resolveCharacterBattleArtPath('char_does_not_exist')).toBeUndefined();
  });

  it('returns undefined for undefined input, without throwing', () => {
    expect(() => resolveCharacterDetailArtPath(undefined)).not.toThrow();
    expect(() => resolveCharacterBattleArtPath(undefined)).not.toThrow();
    expect(resolveCharacterDetailArtPath(undefined)).toBeUndefined();
    expect(resolveCharacterBattleArtPath(undefined)).toBeUndefined();
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
