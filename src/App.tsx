import { useStageController } from './state/useStageController';
import './App.css';

/**
 * MVP-5 entry point: delegates entirely to useStageController, which drives
 * one Stage's full Zone1 → Reward → Zone2 → ... → Boss → Reward →
 * StageResult flow via StageEngine/BattleEngine/RogueliteEngine (spec v0.5
 * §2, CLAUDE.md §21).
 */
function App() {
  return <div className="app">{useStageController()}</div>;
}

export default App;
