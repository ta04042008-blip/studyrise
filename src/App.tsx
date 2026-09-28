import { useBaseController } from './state/useBaseController';
import './App.css';

/**
 * MVP-6 entry point: delegates entirely to useBaseController, which drives
 * 拠点ホーム → エリア選択 → ステージ選択 → 出撃準備 → 出撃確認 → ステージ
 * (via StageSessionScreen) → 拠点 (spec v0.6 §3, CLAUDE.md §21).
 */
function App() {
  return <div className="app">{useBaseController()}</div>;
}

export default App;
