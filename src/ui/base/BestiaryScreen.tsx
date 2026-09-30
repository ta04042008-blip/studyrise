import { useMemo, useState } from 'react';
import type { EnemyDefinition } from '../../engine/battle/BattleEngine.types';
import type { EnemyBestiaryState } from '../../engine/bestiary/BestiarySystem';
import { describeObservedEnemyAction, isEnemyDetailUnlocked } from '../../engine/bestiary/BestiarySystem';
import { GameImage } from '../../presentation/assets/GameImage';
import { resolveEnemyArtPath } from '../../presentation/assets/studyRiseAssets';

interface BestiaryScreenProps {
  enemies: EnemyDefinition[];
  bestiary: EnemyBestiaryState;
  onBack: () => void;
}

export function BestiaryScreen({ enemies, bestiary, onBack }: BestiaryScreenProps) {
  const firstVisibleId = useMemo(
    () => enemies.find((enemy) => bestiary[enemy.id]?.encountered)?.id ?? enemies[0]?.id ?? null,
    [enemies, bestiary],
  );
  const [selectedId, setSelectedId] = useState<string | null>(firstVisibleId);
  const selected = enemies.find((enemy) => enemy.id === selectedId) ?? enemies[0] ?? null;
  const selectedEntry = selected ? bestiary[selected.id] : undefined;
  const unlocked = isEnemyDetailUnlocked(selectedEntry);

  return (
    <main className="bestiary-screen">
      <header className="bestiary-screen__header">
        <div>
          <p>ENEMY ARCHIVE</p>
          <h1>図鑑</h1>
        </div>
        <button type="button" onClick={onBack}>拠点へ戻る</button>
      </header>

      <div className="bestiary-screen__layout">
        <section className="bestiary-screen__list" aria-label="敵一覧">
          {enemies.map((enemy) => {
            const entry = bestiary[enemy.id];
            const encountered = entry?.encountered === true;
            const defeated = entry?.defeated === true;
            return (
              <button
                key={enemy.id}
                type="button"
                className="bestiary-screen__card"
                aria-pressed={selected?.id === enemy.id}
                onClick={() => setSelectedId(enemy.id)}
              >
                <GameImage
                  src={resolveEnemyArtPath(enemy.id)}
                  alt=""
                  className={encountered ? 'bestiary-screen__thumb' : 'bestiary-screen__thumb bestiary-screen__thumb--unknown'}
                />
                <span>{encountered ? enemy.name : '？？？'}</span>
                <small>{defeated ? '観測データ解放済み' : encountered ? '未撃破' : '未遭遇'}</small>
              </button>
            );
          })}
        </section>

        <section className="bestiary-screen__detail" aria-live="polite">
          {!selected ? (
            <p>敵データがありません。</p>
          ) : !selectedEntry?.encountered ? (
            <>
              <h2>？？？</h2>
              <GameImage src={resolveEnemyArtPath(selected.id)} alt="" className="bestiary-screen__art bestiary-screen__thumb--unknown" />
              <p>まだ遭遇していません。</p>
            </>
          ) : !unlocked ? (
            <>
              <h2>{selected.name}</h2>
              <GameImage src={resolveEnemyArtPath(selected.id)} alt={`${selected.name} 図鑑`} className="bestiary-screen__art" />
              <p>この敵を1回撃破すると詳細観測データが解放されます。</p>
              <p>観測済み行動: {selectedEntry.observedActionNames.length}</p>
            </>
          ) : (
            <>
              <div className="bestiary-screen__detail-heading">
                <div>
                  <p>{selected.isBoss ? 'BOSS' : 'ENEMY'}</p>
                  <h2>{selected.name}</h2>
                </div>
                <span>撃破済み</span>
              </div>
              <GameImage src={resolveEnemyArtPath(selected.id)} alt={`${selected.name} 図鑑`} className="bestiary-screen__art" />
              <dl className="bestiary-screen__stats">
                <div><dt>HP</dt><dd>{selected.baseStats.maxHp}</dd></div>
                <div><dt>学力</dt><dd>{selected.baseStats.attack}</dd></div>
                <div><dt>忍耐力</dt><dd>{selected.baseStats.defense}</dd></div>
                <div><dt>思考速度</dt><dd>{selected.baseStats.speed}</dd></div>
              </dl>
              <section className="bestiary-screen__actions">
                <h3>観測済み行動</h3>
                {selectedEntry.observedActionNames.length === 0 ? (
                  <p>まだ行動を観測していません。</p>
                ) : (
                  <ul>
                    {selectedEntry.observedActionNames.map((actionName) => (
                      <li key={actionName}>
                        <strong>{actionName}</strong>
                        <span>{describeObservedEnemyAction(actionName)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
