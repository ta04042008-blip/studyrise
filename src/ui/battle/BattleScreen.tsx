import { useEffect, useState } from 'react';
import type { BattleController } from '../../state/useBattleController';
import { HpBar } from './HpBar';
import { TurnOrderView } from './TurnOrderView';
import { TargetSelectView } from './TargetSelectView';
import { CommandMenu } from './CommandMenu';
import { SpellSelectView } from './SpellSelectView';
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
}

/**
 * Pure presentation + input collection (CLAUDE.md §9): every branch below
 * only reads `state` and dispatches to the controller. No damage/crit/HP
 * calculation happens in this component.
 */
export function BattleScreen({ controller }: BattleScreenProps) {
  const { state } = controller;
  const allActors = [...state.players, ...state.enemies];
  const actorNameById = Object.fromEntries(allActors.map((a) => [a.id, a.name]));
  const actorHpById = Object.fromEntries(allActors.map((a) => [a.id, { current: a.currentHp, max: a.maxHp }]));
  const currentActor = allActors.find((a) => a.id === state.currentActorId);
  const currentKnownSpells = state.knownSpellsByPlayerId[state.currentActorId] ?? [];
  // UI-only "which spell" step (CLAUDE.md §9) — never a BattleEngine phase.
  // Reset whenever the acting player changes, so a stale open picker never
  // survives into someone else's turn.
  const [isSpellSelectOpen, setSpellSelectOpen] = useState(false);
  useEffect(() => {
    setSpellSelectOpen(false);
  }, [state.currentActorId]);

  return (
    <div className="battle-screen">
      <div className="battle-screen__hp battle-screen__hp--players">
        {state.players.map((p) => (
          <HpBar key={p.id} label={p.name} current={p.currentHp} max={p.maxHp} isCurrentActor={p.id === state.currentActorId} />
        ))}
      </div>
      <div className="battle-screen__hp battle-screen__hp--enemies">
        {state.enemies.map((e) => (
          <HpBar key={e.id} label={e.name} current={e.currentHp} max={e.maxHp} />
        ))}
      </div>

      <TurnOrderView
        currentActorName={currentActor?.name ?? state.currentActorId}
        upcomingActorNames={state.upcomingActorIds.map((id) => actorNameById[id] ?? id)}
      />

      <SearchInfoPanel searchByEnemyId={state.searchByEnemyId} actorNameById={actorNameById} />

      {state.phase === 'COMMAND_SELECT' && (
        <>
          <EnemyActionLog log={state.enemyActionLog} actorNameById={actorNameById} />
          {isSpellSelectOpen ? (
            <SpellSelectView
              knownSpells={currentKnownSpells}
              playerMp={currentActor?.currentMp ?? 0}
              onSelect={(spellId) => {
                setSpellSelectOpen(false);
                controller.useSpell(spellId);
              }}
              onCancel={() => setSpellSelectOpen(false)}
            />
          ) : (
            <CommandMenu
              enabled
              knownSpells={currentKnownSpells}
              playerMp={currentActor?.currentMp ?? 0}
              items={state.battleItems}
              onSelectCommand={controller.selectCommand}
              onUseSpell={controller.useSpell}
              onOpenSpellSelect={() => setSpellSelectOpen(true)}
              onUseItem={controller.useItem}
            />
          )}
        </>
      )}

      {state.phase === 'TARGET_SELECT' && state.pendingTargetSelection && (
        <TargetSelectView
          candidateIds={state.pendingTargetSelection.candidateIds}
          actorNameById={actorNameById}
          actorHpById={actorHpById}
          onSelect={controller.selectTarget}
        />
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
