import { useState } from 'react';
import type { StarLevel } from '../../types/stats';

interface SubjectStarSelectProps {
  subjects: string[];
  listStars: (subject: string) => StarLevel[];
  onConfirm: (subject: string, star: StarLevel) => void;
}

/**
 * 教科+★ selection (spec §12.3). Field/unit are fixed at deployment time
 * (base/出撃準備, MVP-6+) and are not selectable here in MVP-1.
 */
export function SubjectStarSelect({ subjects, listStars, onConfirm }: SubjectStarSelectProps) {
  const [subject, setSubject] = useState<string>(subjects[0] ?? '');
  const stars = subject ? listStars(subject) : [];
  const [star, setStar] = useState<StarLevel | null>(stars[0] ?? null);
  const [submitted, setSubmitted] = useState(false);

  function handleSubjectChange(nextSubject: string) {
    setSubject(nextSubject);
    const nextStars = listStars(nextSubject);
    setStar(nextStars[0] ?? null);
  }

  function handleConfirm() {
    if (submitted || !subject || star == null) return;
    setSubmitted(true); // idempotency guard (CLAUDE.md §13)
    onConfirm(subject, star);
  }

  return (
    <div className="subject-star-select">
      <p>教科と★を選んでください</p>
      <div>
        <label htmlFor="subject-select">教科</label>
        <select
          id="subject-select"
          value={subject}
          onChange={(e) => handleSubjectChange(e.target.value)}
          disabled={submitted}
        >
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="star-select">★</label>
        <select
          id="star-select"
          value={star ?? ''}
          onChange={(e) => setStar(Number(e.target.value) as StarLevel)}
          disabled={submitted || stars.length === 0}
        >
          {stars.map((s) => (
            <option key={s} value={s}>
              {'★'.repeat(s)}
            </option>
          ))}
        </select>
      </div>
      <button type="button" disabled={submitted || star == null} onClick={handleConfirm}>
        決定
      </button>
    </div>
  );
}
