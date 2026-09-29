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
import { GameImage } from '../../presentation/assets/GameImage';
import {
  resolveCharacterBattleArtPath,
  resolveEnemyArtPath,
  resolveStageBackgroundPath,
} from '../../presentation/assets/studyRiseAssets';

interface BattleScreenProps {
  controller: BattleController;
  /** Presentation-only StageDefinition.id used to resolve the battle background. */
  stageId?: string;
}

/**
 * Pure presentation + input collection (CLAUDE.md §9): every branch below
 * only reads `state` and dispatches to the controller. No damage/crit/HP
 * calculation happens in this component.
 */
export function BattleScreen({ controller, stageId }: BattleScreenProps) {
  const { state } = controller;
  const stageBackgroundPath = resolveStageBackgroundPath(stageId);
  const allActors = [...state.players, ...state.enemies];
  const actorNameById = Object.fromEntries(allActors.map((a) => [a.id, a.name]));
  const actorHpById = Object.fromEntries(allActors.map((a) => [a.id, { current: a.currentHp, max: a.maxHp }]));
  const currentActor = allActors.find((a) => a.id === state.currentActorId);
  const currentKnownSpells = state.knownSpellsByPlayerId[state.currentActorId] ?? [];
  const commandAnimationOutcome = state.phase === 'COMMAND_ANIMATION' ? state.pendingOutcome : undefined;
  const attackAnimationOutcome = commandAnimationOutcome?.command === 'attack' ? commandAnimationOutcome : undefined;
  const latestEnemyAction = state.phase === 'COMMAND_SELECT' && state.enemyActionLog.length > 0
    ? state.enemyActionLog[state.enemyActionLog.length - 1]
    : undefined;
  // UI-only "which spell" step (CLAUDE.md §9) — never a BattleEngine phase.
  // Reset whenever the acting player changes, so a stale open picker never
  // survives into someone else's turn.
  const [isSpellSelectOpen, setSpellSelectOpen] = useState(false);
  useEffect(() => {
    setSpellSelectOpen(false);
  }, [state.currentActorId]);

  return (
    <div className="battle-screen">
      {stageBackgroundPath && (
        <div className="battle-screen__background" aria-hidden="true">
          <GameImage
            src={stageBackgroundPath}
            alt=""
            className="battle-screen__background-image"
          />
          <div className="battle-screen__background-overlay" />
        </div>
      )}

      <div className="battle-screen__hp battle-screen__hp--players" style={{ left: 16, right: 'auto' }}>
        {state.players.map((p) => (
          <HpBar key={p.id} label={p.name} current={p.currentHp} max={p.maxHp} isCurrentActor={p.id === state.currentActorId} />
        ))}
      </div>
      <div className="battle-screen__hp battle-screen__hp--enemies" style={{ left: 'auto', right: 16 }}>
        {state.enemies.map((e) => (
          <HpBar key={e.id} label={e.name} current={e.currentHp} max={e.maxHp} />
        ))}
      </div>

      <div className="battle-screen__actors" aria-label="戦闘キャラクター">
        <div className="battle-screen__actors-side battle-screen__actors-side--players" style={{ left: '31%', right: 'auto' }}>
          {state.players.map((player, index) => (
            <div
              key={player.id}
              className={[
                'battle-screen__player-slot',
                latestEnemyAction?.targetId === player.id ? 'battle-screen__player-slot--enemy-hit' : '',
                player.currentHp <= 0 ? 'battle-screen__player-slot--ko' : '',
                commandAnimationOutcome?.sourceActorId === player.id ? `battle-screen__player-slot--command-${commandAnimationOutcome.command}` : '',
                attackAnimationOutcome?.sourceActorId === player.id ? 'battle-screen__player-slot--attack-source' : '',
              ].filter(Boolean).join(' ')}
              data-party-index={index}
            >
              <GameImage
                src={resolveCharacterBattleArtPath(player.definitionId)}
                alt={`${player.name} 戦闘`}
                className="battle-screen__actor-art battle-screen__actor-art--player"
              />
              {latestEnemyAction?.targetId === player.id && (
                <div className={`battle-screen__damage-pop battle-screen__damage-pop--player-hit${latestEnemyAction.isCritical ? ' battle-screen__damage-pop--critical' : ''}`}>
                  {latestEnemyAction.isCritical && <span>CRITICAL!</span>}
                  <strong>-{latestEnemyAction.damage}</strong>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="battle-screen__actors-side battle-screen__actors-side--enemies" style={{ left: '69%', right: 'auto' }}>
          {state.enemies.map((enemy) => (
            <div key={enemy.id} className={['battle-screen__enemy-slot', enemy.currentHp <= 0 ? 'battle-screen__enemy-slot--ko' : '', attackAnimationOutcome?.targetId === enemy.id && attackAnimationOutcome.correct ? 'battle-screen__enemy-slot--hit' : '', attackAnimationOutcome?.targetId === enemy.id && attackAnimationOutcome.isCritical ? 'battle-screen__enemy-slot--critical' : ''].filter(Boolean).join(' ')}>
              <GameImage src={resolveEnemyArtPath(enemy.definitionId)} alt={`${enemy.name} 戦闘`} className="battle-screen__actor-art battle-screen__actor-art--enemy" />
              {attackAnimationOutcome?.targetId === enemy.id && (
                <div className={[
                  'battle-screen__damage-pop',
                  attackAnimationOutcome.correct ? '' : 'battle-screen__damage-pop--miss',
                  attackAnimationOutcome.isCritical ? 'battle-screen__damage-pop--critical' : '',
                ].filter(Boolean).join(' ')}>
                  {attackAnimationOutcome.correct ? (
                    <>
                      {attackAnimationOutcome.isCritical && <span>CRITICAL!</span>}
                      <strong>-{attackAnimationOutcome.damage}</strong>
                    </>
                  ) : (
                    <strong>MISS</strong>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
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
