import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { BattleScreen } from '../../../src/ui/battle/BattleScreen';
import type { BattleController, SpellAnswerFeedback } from '../../../src/state/useBattleController';
import type { BattleState } from '../../../src/engine/battle/BattleEngine.types';
import type { MultipleChoiceQuestion } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const question: MultipleChoiceQuestion = {
  id: 'spell_zoom_q',
  subject: '数学',
  field: '数学I',
  unit: '数と式',
  star: 1,
  format: 'multiple_choice',
  text: '1 + 1 は？',
  choices: ['1', '2'],
  correctIndex: 1,
  explanation: '1 + 1 = 2',
};

function stateFor(correctCount: number, phase: BattleState['phase'] = 'SPELL_QUESTION'): BattleState {
  return {
    phase,
    players: [{
      id: 'p1',
      definitionId: 'character_tomoya',
      name: 'Caster',
      kind: 'player',
      attack: 10,
      defense: 10,
      speed: 10,
      maxHp: 100,
      currentHp: 100,
      maxMp: 0,
      currentMp: 0,
      guard: null,
    }],
    enemies: [{
      id: 'e1',
      definitionId: 'enemy_watcher',
      name: 'Enemy',
      kind: 'enemy',
      attack: 1,
      defense: 1,
      speed: 1,
      maxHp: 100,
      currentHp: 100,
      maxMp: 0,
      currentMp: 0,
      guard: null,
    }],
    currentActorId: 'p1',
    upcomingActorIds: [],
    timeline: {} as BattleState['timeline'],
    pendingCommand: null,
    pendingSpellSequence: phase === 'SPELL_QUESTION' || phase === 'SPELL_EXPLANATION' ? {
      spellId: 'spell_test',
      sourceActorId: 'p1',
      targetId: 'e1',
      subject: '数学',
      questionIndex: 2,
      correctCount,
      question,
    } : null,
    pendingSpellQuestionOutcome: phase === 'SPELL_EXPLANATION' ? {
      spellId: 'spell_test',
      sourceActorId: 'p1',
      targetId: 'e1',
      questionIndex: 2,
      correct: true,
      correctCount,
      question,
      submittedAnswer: { type: 'multiple_choice', selectedIndex: 1 },
    } : null,
    preparedSpellsByPlayerId: {},
    pendingTargetSelection: null,
    pendingOutcome: null,
    lastPlayerOutcome: null,
    lastNonQuestionOutcome: null,
    enemyActionLog: [],
    searchByEnemyId: {},
    battleItems: [],
    knownSpellsByPlayerId: { p1: [] },
    outcome: null,
  };
}

function controllerFor(state: BattleState, feedback: SpellAnswerFeedback | null): BattleController {
  return {
    state,
    spellAnswerFeedback: feedback,
    listSubjects: () => ['数学'],
    listStars: () => [1],
    listSpellSubjects: () => ['数学'],
    getSpellDefinition: () => undefined,
    selectCommand: () => {},
    selectTarget: () => {},
    selectSubjectAndStar: () => {},
    selectSpellSubject: () => {},
    cancelSpellSubjectSelection: () => {},
    submitAnswer: () => {},
    submitSpellAnswer: () => {},
    useSpell: () => {},
    useItem: () => {},
    advance: () => {},
  };
}

describe('BattleScreen spell preparation presentation', () => {
  it('shows a correct effect and zoom level matching the cumulative correct count', () => {
    const feedback: SpellAnswerFeedback = {
      sequence: 3,
      sourceActorId: 'p1',
      correct: true,
      correctCount: 3,
      answeredCount: 3,
    };

    const { container } = render(<BattleScreen controller={controllerFor(stateFor(3), feedback)} />);

    expect(screen.getByText('正解！')).toBeTruthy();
    const battleScreen = container.querySelector('.battle-screen');
    expect(battleScreen?.getAttribute('data-spell-camera-zoom')).toBe('3');
    expect((battleScreen as HTMLElement | null)?.style.getPropertyValue('--spell-camera-x')).toBe('31%');

    const caster = container.querySelector('[data-actor-id="p1"]');
    expect(caster?.getAttribute('data-spell-prep-zoom')).toBe('3');
    expect(caster?.className).toContain('battle-screen__player-slot--spell-preparing');
  });

  it('briefly preserves level 5 zoom after the fifth correct answer finishes preparation', async () => {
    const feedback: SpellAnswerFeedback = {
      sequence: 5,
      sourceActorId: 'p1',
      correct: true,
      correctCount: 5,
      answeredCount: 5,
    };

    const { container } = render(<BattleScreen controller={controllerFor(stateFor(0, 'ENEMY_ACTION'), feedback)} />);

    await waitFor(() => {
      expect(container.querySelector('.battle-screen')?.getAttribute('data-spell-camera-zoom')).toBe('5');
      expect(container.querySelector('[data-actor-id="p1"]')?.getAttribute('data-spell-prep-zoom')).toBe('5');
    });
    expect(screen.getByText('正解！')).toBeTruthy();
  });
});
