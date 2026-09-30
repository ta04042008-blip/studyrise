import { useState } from 'react';

interface SpellSubjectSelectProps {
  subjects: string[];
  onConfirm: (subject: string) => void;
  onCancel: () => void;
}

export function SpellSubjectSelect({ subjects, onConfirm, onCancel }: SpellSubjectSelectProps) {
  const [subject, setSubject] = useState(subjects[0] ?? '');
  const [submitted, setSubmitted] = useState(false);

  function handleConfirm() {
    if (submitted || !subject) return;
    setSubmitted(true);
    onConfirm(subject);
  }

  if (subjects.length === 0) {
    return (
      <div className="subject-star-select">
        <p>現在の出題範囲には、このスペルの5問構成に必要な★がそろう教科がありません。</p>
        <button type="button" onClick={onCancel}>戻る</button>
      </div>
    );
  }

  return (
    <div className="subject-star-select">
      <p>スペルに使う教科を選んでください</p>
      <div>
        <label htmlFor="spell-subject-select">教科</label>
        <select id="spell-subject-select" value={subject} disabled={submitted} onChange={(e) => setSubject(e.target.value)}>
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <button type="button" disabled={submitted || !subject} onClick={handleConfirm}>決定</button>
      <button type="button" disabled={submitted} onClick={onCancel}>戻る</button>
    </div>
  );
}
