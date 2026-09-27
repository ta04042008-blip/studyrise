import { useMemo, useState } from 'react';
import { BattleScreen } from './ui/battle/BattleScreen';
import { useBattleController } from './state/useBattleController';
import { sampleParty } from './data/characters/sampleCharacters';
import { sampleEnemyZone } from './data/enemies/sampleEnemies';
import { sampleQuestions } from './data/questions/sampleQuestions';
import { sampleSpell } from './data/spells/sampleSpell';
import { sampleItem } from './data/items/sampleItem';
import type { ItemBattleSlot, SpellDefinition } from './engine/battle/BattleEngine.types';
import './App.css';

const spellsById = { [sampleSpell.id]: sampleSpell };
// PLACEHOLDER: every sample party member currently shares the one sample spell.
const spellByPlayerId: Record<string, SpellDefinition | null> = Object.fromEntries(
  sampleParty.map((c) => [c.id, spellsById[c.initialSpellId] ?? null]),
);

function App() {
  const [seed, setSeed] = useState(() => Date.now());
  // PLACEHOLDER loadout: 2 uses of the one sample item, shared by the whole
  // party for this battle only (spec §5.10; no base inventory yet). Reset
  // on each new battle.
  const initialItems = useMemo<ItemBattleSlot[]>(() => [{ item: sampleItem, remainingUses: 2 }], [seed]);

  const controller = useBattleController({
    players: sampleParty,
    enemies: sampleEnemyZone,
    questions: sampleQuestions,
    spellsById,
    initialItems,
    seed,
  });

  const isOver = controller.state.phase === 'BATTLE_END';
  const title = useMemo(() => 'StudyRise — MVP-3 戦闘プロトタイプ', []);

  return (
    <div className="app">
      <h1>{title}</h1>
      <BattleScreen controller={controller} spellByPlayerId={spellByPlayerId} />
      {isOver && (
        <button type="button" onClick={() => setSeed(Date.now())}>
          もう一度たたかう
        </button>
      )}
    </div>
  );
}

export default App;
