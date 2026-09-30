import { useState } from 'react';

interface SpellSubjectSelectProps {
  subjects: string[];
  onConfirm: (subject: string) => void;
}

export function SpellSubjectSelect({ subjects, onConfirm }: SpellSubjectSelectProps) {
  const [subject, setSubject] = useState(subjects[0] ?? '');
  const [submitted, setSubmitted] = useState(false);

  function handleConfirm() {
    if (submitted || !subject) return;
    setSubmitted(true);
    onConfirm(subject);
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
    </div>
  );
}
