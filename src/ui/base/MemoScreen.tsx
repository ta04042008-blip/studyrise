import { useEffect, useState } from 'react';

interface MemoScreenProps {
  initialMemo: string;
  onSave: (memo: string) => void;
  onBack: () => void;
}

const MAX_MEMO_LENGTH = 5000;

export function MemoScreen({ initialMemo, onSave, onBack }: MemoScreenProps) {
  const [memo, setMemo] = useState(initialMemo);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMemo(initialMemo);
    setSaved(false);
  }, [initialMemo]);

  function handleSave() {
    onSave(memo);
    setSaved(true);
  }

  return (
    <main className="memo-screen">
      <header className="memo-screen__header">
        <div>
          <p className="memo-screen__eyebrow">BASE NOTE</p>
          <h1>メモ</h1>
        </div>
        <button type="button" onClick={onBack}>拠点へ戻る</button>
      </header>

      <p className="memo-screen__lead">
        学習中に覚えておきたいことや、次にやることを自由に残せます。
      </p>

      <label className="memo-screen__editor">
        <span className="memo-screen__label">メモ内容</span>
        <textarea
          value={memo}
          maxLength={MAX_MEMO_LENGTH}
          onChange={(event) => {
            setMemo(event.target.value);
            setSaved(false);
          }}
          placeholder="例：数学Iの二次関数を復習する"
          aria-label="メモ内容"
        />
      </label>

      <div className="memo-screen__footer">
        <span className="memo-screen__count">{memo.length} / {MAX_MEMO_LENGTH}</span>
        {saved && <span className="memo-screen__saved" role="status">保存しました</span>}
        <button type="button" className="memo-screen__save" onClick={handleSave}>
          メモを保存
        </button>
      </div>
    </main>
  );
}
