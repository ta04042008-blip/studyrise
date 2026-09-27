import type { BattleController } from '../../state/useBattleController';
import type { SpellDefinition } from '../../engine/battle/BattleEngine.types';
import { HpBar } from './HpBar';
import { CommandMenu } from './CommandMenu';
import { SubjectStarSelect } from './SubjectStarSelect';
import { QuestionView } from './QuestionView';
import { CommandAnimationView } from './CommandAnimationView';
import { ExplanationView } from './ExplanationView';
import { SpellItemResultView } from './SpellItemResultView';
import { EnemyActionLog } from './EnemyActionLog';
import { SearchInfoPanel } from './SearchInfoPanel';
import { BattleEndView } from './BattleEndView';

interface BattleScreenProps {
  controller: BattleController;
  /** The player's one known spell, or null if none is defined. */
  spell: SpellDefinition | null;
}

/**
 * Pure presentation + input collection (CLAUDE.md §9): every branch below
 * only reads `state` and dispatches to the controller. No damage/crit/HP
 * calculation happens in this component.
 */
export function BattleScreen({ controller, spell }: BattleScreenProps) {
  const { state } = controller;
  const actorNameById = { [state.player.id]: state.player.name, [state.enemy.id]: state.enemy.name };

  return (
    <div className="battle-screen">
      <div className="battle-screen__hp">
        <HpBar label={state.player.name} current={state.player.currentHp} max={state.player.maxHp} />
        <HpBar label={state.enemy.name} current={state.enemy.currentHp} max={state.enemy.maxHp} />
      </div>

      <SearchInfoPanel searchByEnemyId={state.searchByEnemyId} actorNameById={actorNameById} />

      {state.phase === 'COMMAND_SELECT' && (
        <>
          <EnemyActionLog log={state.enemyActionLog} />
          <CommandMenu
            enabled
            spell={spell}
            playerMp={state.player.currentMp}
            items={state.availableItems}
            onSelectCommand={controller.selectCommand}
            onUseSpell={controller.useSpell}
            onUseItem={controller.useItem}
          />
        </>
      )}

      {state.phase === 'SUBJECT_DIFFICULTY_SELECT' && (
        <SubjectStarSelect
          subjects={controller.listSubjects()}
          listStars={controller.listStars}
          onConfirm={controller.selectSubjectAndStar}
        />
      )}

      {state.phase === 'QUESTION' && state.pendingCommand?.question && (
        <QuestionView question={state.pendingCommand.question} onSubmit={controller.submitAnswer} />
      )}

      {state.phase === 'COMMAND_ANIMATION' && state.pendingOutcome && (
        <CommandAnimationView outcome={state.pendingOutcome} onAdvance={controller.advance} />
      )}

      {state.phase === 'EXPLANATION' && state.lastPlayerOutcome && (
        <ExplanationView outcome={state.lastPlayerOutcome} onAdvance={controller.advance} />
      )}

      {state.phase === 'RESULT_APPLY' && state.lastNonQuestionOutcome && (
        <SpellItemResultView outcome={state.lastNonQuestionOutcome} onAdvance={controller.advance} />
      )}

      {state.phase === 'BATTLE_END' && state.outcome && <BattleEndView outcome={state.outcome} />}
    </div>
  );
}
