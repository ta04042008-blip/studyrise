import { useMemo, useState } from 'react';
import { BattleScreen } from './ui/battle/BattleScreen';
import { useBattleController } from './state/useBattleController';
import { sampleCharacter } from './data/characters/sampleCharacter';
import { sampleEnemy } from './data/enemies/sampleEnemy';
import { sampleQuestions } from './data/questions/sampleQuestions';
import { sampleSpell } from './data/spells/sampleSpell';
import { sampleItem } from './data/items/sampleItem';
import type { ItemBattleSlot } from './engine/battle/BattleEngine.types';
import './App.css';

const spellsById = { [sampleSpell.id]: sampleSpell };

function App() {
  const [seed, setSeed] = useState(() => Date.now());
  // PLACEHOLDER loadout: 2 uses of the one sample item for this battle only
  // (no 3-slot inventory/base stock yet, spec §17.3). Reset on each new battle.
  const initialItems = useMemo<ItemBattleSlot[]>(() => [{ item: sampleItem, remainingUses: 2 }], [seed]);

  const controller = useBattleController({
    player: sampleCharacter,
    enemy: sampleEnemy,
    questions: sampleQuestions,
    spellsById,
    initialItems,
    seed,
  });

  const isOver = controller.state.phase === 'BATTLE_END';
  const title = useMemo(() => 'StudyRise — MVP-2 戦闘プロトタイプ', []);

  return (
    <div className="app">
      <h1>{title}</h1>
      <BattleScreen controller={controller} spell={sampleSpell} />
      {isOver && (
        <button type="button" onClick={() => setSeed(Date.now())}>
          もう一度たたかう
        </button>
      )}
    </div>
  );
}

export default App;
