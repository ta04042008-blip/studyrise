/**
 * Official stat keys and UI labels per docs/StudyRise_Spec_v0.2.md §4.2.
 * Do not reintroduce old stats (集中力, 自信, WPM, 成長率).
 */
export type StatKey = 'hp' | 'attack' | 'defense' | 'speed' | 'mp';

export const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  attack: '学力',
  defense: '忍耐力',
  speed: '思考速度',
  mp: 'MP',
};

/** Growth/base stats a character or enemy is defined with (data-driven). */
export interface BaseStats {
  attack: number;
  defense: number;
  speed: number;
  maxHp: number;
}

/** Player characters additionally have an MP pool (spec §4.2: MP max is 5). Enemies do not use MP (spec §4.6). */
export interface PlayerBaseStats extends BaseStats {
  maxMp: number;
}

export type StarLevel = 1 | 2 | 3 | 4 | 5;
