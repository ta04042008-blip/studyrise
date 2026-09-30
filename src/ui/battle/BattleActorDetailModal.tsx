import { createPortal } from 'react-dom';
import type { BattleActor, KnownSpell } from '../../engine/battle/BattleEngine.types';
import type { EnemyBestiaryEntry } from '../../engine/bestiary/BestiarySystem';
import { describeObservedEnemyAction, isEnemyDetailUnlocked } from '../../engine/bestiary/BestiarySystem';

interface BattleActorDetailModalProps {
  actor: BattleActor | null;
  knownSpells?: KnownSpell[];
  enemyObservation?: EnemyBestiaryEntry;
  onClose: () => void;
}

function statRows(actor: BattleActor) {
  return [
    ['HP', `${actor.currentHp} / ${actor.maxHp}`],
    ['学力', actor.attack],
    ['忍耐力', actor.defense],
    ['思考速度', actor.speed],
  ] as const;
}

export function BattleActorDetailModal({
  actor,
  knownSpells = [],
  enemyObservation,
  onClose,
}: BattleActorDetailModalProps) {
  if (!actor || typeof document === 'undefined') return null;

  const enemyUnlocked = actor.kind === 'enemy' && isEnemyDetailUnlocked(enemyObservation);

  return createPortal(
    <div className="battle-detail-modal__backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="battle-detail-modal" role="dialog" aria-modal="true" aria-label={`${actor.name}の詳細`}>
        <header className="battle-detail-modal__header">
          <div>
            <p>{actor.kind === 'player' ? 'PLAYER DATA' : 'ENEMY DATA'}</p>
            <h2>{actor.name}</h2>
          </div>
          <button type="button" onClick={onClose}>閉じる</button>
        </header>

        {actor.kind === 'enemy' && !enemyUnlocked ? (
          <div className="battle-detail-modal__locked">
            <p>HP {actor.currentHp} / {actor.maxHp}</p>
            <strong>詳細観測データ未解放</strong>
            <span>この敵を1回撃破すると、能力値と観測済み行動の詳細を確認できます。</span>
          </div>
        ) : (
          <>
            <dl className="battle-detail-modal__stats">
              {statRows(actor).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            <section className="battle-detail-modal__section">
              <h3>状態</h3>
              <p>{actor.guard ? `ガード：被ダメージを${Math.round(actor.guard.mitigationPercent * 100)}%軽減（次の1回）` : '状態効果なし'}</p>
            </section>

            {actor.kind === 'player' ? (
              <>
                <section className="battle-detail-modal__section">
                  <h3>固有スキル</h3>
                  <p>—</p>
                </section>
                <section className="battle-detail-modal__section">
                  <h3>スペル</h3>
                  {knownSpells.length === 0 ? (
                    <p>なし</p>
                  ) : (
                    <ul>
                      {knownSpells.map((spell) => (
                        <li key={spell.spellId}>{spell.name} Lv{spell.level}</li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            ) : (
              <section className="battle-detail-modal__section">
                <h3>観測済み行動</h3>
                {!enemyObservation || enemyObservation.observedActionNames.length === 0 ? (
                  <p>まだ行動を観測していません。</p>
                ) : (
                  <ul>
                    {enemyObservation.observedActionNames.map((actionName) => (
                      <li key={actionName}>
                        <strong>{actionName}</strong>
                        <span>{describeObservedEnemyAction(actionName)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
