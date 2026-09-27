import { useMemo, useState } from 'react';
import { BattleScreen } from './ui/battle/BattleScreen';
import { useBattleController } from './state/useBattleController';
import { sampleCharacter } from './data/characters/sampleCharacter';
import { sampleEnemy } from './data/enemies/sampleEnemy';
import { sampleQuestions } from './data/questions/sampleQuestions';
import './App.css';

function App() {
  const [seed, setSeed] = useState(() => Date.now());
  const controller = useBattleController({
    player: sampleCharacter,
    enemy: sampleEnemy,
    questions: sampleQuestions,
    seed,
  });

  const isOver = controller.state.phase === 'BATTLE_END';
  const title = useMemo(() => 'StudyRise — MVP-1 戦闘プロトタイプ', []);

  return (
    <div className="app">
      <h1>{title}</h1>
      <BattleScreen controller={controller} />
      {isOver && (
        <button type="button" onClick={() => setSeed(Date.now())}>
          もう一度たたかう
        </button>
      )}
    </div>
  );
}

export default App;
