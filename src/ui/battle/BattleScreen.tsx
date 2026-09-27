import type { BattleController } from '../../state/useBattleController';
import { HpBar } from './HpBar';
import { CommandMenu } from './CommandMenu';
import { SubjectStarSelect } from './SubjectStarSelect';
import { QuestionView } from './QuestionView';
import { CommandAnimationView } from './CommandAnimationView';
import { ExplanationView } from './ExplanationView';
import { EnemyActionLog } from './EnemyActionLog';
import { BattleEndView } from './BattleEndView';

interface BattleScreenProps {
  controller: BattleController;
}

/**
 * Pure presentation + input collection (CLAUDE.md §9): every branch below
 * only reads `state` and dispatches to the controller. No damage/crit/HP
 * calculation happens in this component.
 */
export function BattleScreen({ controller }: BattleScreenProps) {
  const { state } = controller;

  return (
    <div className="battle-screen">
      <div className="battle-screen__hp">
        <HpBar label={state.player.name} current={state.player.currentHp} max={state.player.maxHp} />
        <HpBar label={state.enemy.name} current={state.enemy.currentHp} max={state.enemy.maxHp} />
      </div>

      {state.phase === 'COMMAND_SELECT' && (
        <>
          <EnemyActionLog log={state.enemyActionLog} />
          <CommandMenu enabled onSelectAttack={controller.selectAttackCommand} />
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

      {state.phase === 'BATTLE_END' && state.outcome && <BattleEndView outcome={state.outcome} />}
    </div>
  );
}
