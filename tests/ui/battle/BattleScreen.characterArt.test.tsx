import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BattleScreen } from '../../../src/ui/battle/BattleScreen';
import { useBattleController } from '../../../src/state/useBattleController';
import type { CharacterDefinition, EnemyDefinition, SpellDefinition } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const SPELL: SpellDefinition = {
  id: 'spell_test',
  name: 'テストスペル',
  targetType: 'enemy',
  maxLevel: 1,
  levels: [{ mpCost: 0, effects: [{ type: 'DAMAGE', amount: 10 }] }],
};

const TOMOYA: CharacterDefinition = {
  id: 'char_hero_placeholder',
  name: '葉山智也',
  baseStats: { attack: 24, defense: 8, speed: 12, maxHp: 60, maxMp: 5 },
  initialSpellId: SPELL.id,
  additionalSpellPoolIds: [],
};

const ENEMY: EnemyDefinition = {
  id: 'enemy_without_art',
  name: 'テスト敵',
  baseStats: { attack: 5, defense: 2, speed: 5, maxHp: 30 },
};

const QUESTION: MultipleChoiceQuestion = {
  id: 'q1',
  subject: '数学',
  field: '計算',
  unit: '四則演算',
  star: 1,
  format: 'multiple_choice',
  text: '1 + 1 は？',
  choices: ['1', '2'],
  correctIndex: 1,
  explanation: '1 + 1 = 2 です。',
};

function Harness({ stageId }: { stageId?: string }) {
  const controller = useBattleController({
    players: [TOMOYA],
    enemies: [ENEMY],
    questions: [QUESTION],
    spellsById: { [SPELL.id]: SPELL },
    initialItems: [],
    seed: 1,
  });

describe('BattleScreen stage background', () => {
  it('renders the Stage1 background for stage_sample_placeholder', () => {
    const { container } = render(<Harness stageId="stage_sample_placeholder" />);
    const image = container.querySelector('.battle-screen__background-image') as HTMLImageElement | null;
    expect(image).not.toBeNull();
    expect(image?.src).toContain('/assets/studyrise/backgrounds/stages/stage_closed_route.png');
    expect(screen.getByText('葉山智也')).toBeTruthy();
  });

  it('keeps the existing battle UI and omits the background when stage art is unavailable', () => {
    const { container } = render(<Harness stageId="stage_unknown" />);
    expect(container.querySelector('.battle-screen__background')).toBeNull();
    expect(screen.getByText('葉山智也')).toBeTruthy();
    expect(screen.getByText('テスト敵')).toBeTruthy();
  });
});

  return <BattleScreen controller={controller} stageId={stageId} />;
}

describe('BattleScreen character battle art', () => {
  it('renders Tomoya using the battle-specific asset path', () => {
    render(<Harness />);
    const image = screen.getByRole('img', { name: '葉山智也 戦闘' }) as HTMLImageElement;
    expect(image.src).toContain('/assets/studyrise/characters/hayama_tomoya_battle.png');
  });

  it('does not render an enemy img when the enemy has no registered art', () => {
    render(<Harness />);
    expect(screen.queryByRole('img', { name: 'テスト敵 戦闘' })).toBeNull();
  });
});
