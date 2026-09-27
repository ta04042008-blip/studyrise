import { useRunScreen } from './state/useRunScreen';
import './App.css';

/**
 * MVP-4 entry point: delegates entirely to useRunScreen, which chains
 * Battle → Reward → Battle via RunController/RogueliteEngine (spec §9,
 * CLAUDE.md §21 — multi-zone/stage itself is still MVP-5, so this is a
 * standalone two-battle harness only, per the MVP-4 brief).
 */
function App() {
  return <div className="app">{useRunScreen()}</div>;
}

export default App;
