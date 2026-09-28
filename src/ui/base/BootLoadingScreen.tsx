/**
 * MVP-9: shown while SaveSystem's async boot load (IndexedDB open + read of
 * PermanentSave/LearningHistorySave/RunSave) is in flight. Deliberately the
 * ONLY thing rendered during that window — Base/Stage must never flash
 * before the load resolves (user's explicit instruction: "load完了前に
 * Base HomeやStageを一瞬表示しないでください").
 */
export function BootLoadingScreen() {
  return (
    <div className="boot-loading-screen">
      <p>読み込み中…</p>
    </div>
  );
}
