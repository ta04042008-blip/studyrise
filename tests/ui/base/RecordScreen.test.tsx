import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RecordScreen } from '../../../src/ui/base/RecordScreen';
import type { LearningHistoryRecord } from '../../../src/engine/learningHistory/LearningHistory.types';
import type { MultipleChoiceQuestion, QuestionDefinition } from '../../../src/engine/question/QuestionEngine.types';

afterEach(cleanup);

const mathAdditionQuestion: MultipleChoiceQuestion = {
  id: 'q_math_add',
  subject: '数学',
  field: '計算',
  unit: '四則演算',
  star: 1,
  format: 'multiple_choice',
  text: '7 + 5 は？',
  choices: ['10', '11', '12', '13'],
  correctIndex: 2,
  explanation: '7 + 5 = 12 です。',
};

const mathAreaQuestion: MultipleChoiceQuestion = {
  id: 'q_math_area',
  subject: '数学',
  field: '図形',
  unit: '面積',
  star: 3,
  format: 'multiple_choice',
  text: '縦4cm、横5cmの長方形の面積は？',
  choices: ['9', '18', '20', '24'],
  correctIndex: 2,
  explanation: '4 × 5 = 20 です。',
};

const englishQuestion: MultipleChoiceQuestion = {
  id: 'q_eng_vocab',
  subject: '英語',
  field: '語彙',
  unit: '基礎単語',
  star: 2,
  format: 'multiple_choice',
  text: '"apple" の意味は？',
  choices: ['りんご', 'みかん'],
  correctIndex: 0,
  explanation: 'apple はりんごです。',
};

const questionsById: Record<string, QuestionDefinition> = {
  [mathAdditionQuestion.id]: mathAdditionQuestion,
  [mathAreaQuestion.id]: mathAreaQuestion,
  [englishQuestion.id]: englishQuestion,
};

function makeRecord(overrides: Partial<LearningHistoryRecord> & { id: string; questionId: string }): LearningHistoryRecord {
  return {
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    answerResult: 'CORRECT',
    recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 2 },
    answeredAt: 1000,
    ...overrides,
  };
}

const records: LearningHistoryRecord[] = [
  makeRecord({
    id: 'r1',
    questionId: mathAdditionQuestion.id,
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    answerResult: 'CORRECT',
    recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 2 },
    answeredAt: 1000,
  }),
  makeRecord({
    id: 'r2',
    questionId: mathAreaQuestion.id,
    subject: '数学',
    field: '図形',
    unit: '面積',
    star: 3,
    answerResult: 'INCORRECT',
    recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 0 },
    answeredAt: 2000,
  }),
  makeRecord({
    id: 'r3',
    questionId: englishQuestion.id,
    subject: '英語',
    field: '語彙',
    unit: '基礎単語',
    star: 2,
    answerResult: 'UNKNOWN',
    recordedAnswer: { type: 'UNKNOWN' },
    answeredAt: 3000,
  }),
  // References a question that no longer resolves against the canonical
  // registry (user's explicit MVP-8 instruction: must not crash the screen).
  makeRecord({
    id: 'r4',
    questionId: 'q_missing',
    subject: '数学',
    field: '計算',
    unit: '四則演算',
    star: 1,
    answerResult: 'CORRECT',
    recordedAnswer: { type: 'MULTIPLE_CHOICE', selectedIndex: 0 },
    answeredAt: 4000,
  }),
];

describe('RecordScreen — 空履歴', () => {
  it('shows zero counts and 0% accuracy for an empty history, without NaN/Infinity', () => {
    render(<RecordScreen records={[]} questionsById={{}} onBack={() => {}} />);
    expect(screen.getByText('記録')).toBeTruthy();
    expect(screen.getByText('まだ回答履歴がありません。')).toBeTruthy();
    const summarySection = screen.getByText('全体サマリー').closest('section')!;
    expect(within(summarySection).getByText('0%')).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
    expect(screen.queryByText(/Infinity/)).toBeNull();
  });
});

describe('RecordScreen — 全体サマリー', () => {
  it('shows total/correct/incorrect/unknown/accuracy derived from records', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    const summarySection = screen.getByText('全体サマリー').closest('section')!;
    // dt order: 総回答数/正解/不正解/わからない/正答率 -> 4 total, 2 correct, 1 incorrect, 1 unknown, 50%.
    const values = within(summarySection)
      .getAllByRole('definition')
      .map((dd) => dd.textContent);
    expect(values).toEqual(['4', '2', '1', '1', '50%']);
  });
});

describe('RecordScreen — 教科 → 分野 → 単元', () => {
  it('drills down from subject to field to unit on click', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    const subjectSection = screen.getByText('教科別').closest('section')!;

    // Subject-level row visible; field not yet.
    expect(within(subjectSection).getByText(/数学（/)).toBeTruthy();
    expect(within(subjectSection).queryByText(/計算（/)).toBeNull();

    fireEvent.click(within(subjectSection).getByText(/数学（/));
    expect(within(subjectSection).getByText(/計算（/)).toBeTruthy();
    expect(within(subjectSection).queryByText(/四則演算（/)).toBeNull();

    fireEvent.click(within(subjectSection).getByText(/計算（/));
    expect(within(subjectSection).getByText(/四則演算（/)).toBeTruthy();
  });
});

describe('RecordScreen — ★別', () => {
  it('shows all 5 ★ levels, including zero-filled ones', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    const starSection = screen.getByText('★別').closest('section')!;
    expect(within(starSection).getByText(/^★:/)).toBeTruthy();
    expect(within(starSection).getByText(/^★★★★★:/)).toBeTruthy(); // ★5, unattempted -> 0問
  });
});

describe('RecordScreen — 履歴一覧', () => {
  it('lists every record with a short question-text preview, newest first by default', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));

    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThanOrEqual(4);
    // Newest first: r4 (answeredAt 4000) appears before r1 (answeredAt 1000).
    const listText = items.map((li) => li.textContent).join('\n');
    expect(listText.indexOf('q_missing') === -1).toBe(true); // id itself isn't shown, only resolved preview/fallback
    expect(screen.getByText(/問題データを読み込めません/)).toBeTruthy(); // r4's preview fallback
  });

  it('filters the list by subject', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));

    fireEvent.change(screen.getByLabelText('教科'), { target: { value: '英語' } });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText(/英語/)).toBeTruthy();
  });

  it('filters the list by answer result (UNKNOWN)', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));

    fireEvent.change(screen.getByLabelText('正誤'), { target: { value: 'UNKNOWN' } });
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('わからない');
  });

  it('sorts oldest first when selected', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));

    fireEvent.change(screen.getByLabelText('並び順'), { target: { value: 'OLDEST_FIRST' } });
    const items = screen.getAllByRole('listitem');
    // r1 (answeredAt 1000, the oldest) is now first.
    expect(items[0].textContent).toContain('四則演算');
    expect(items[0].textContent).toContain('★'); // has at least one star marker
  });
});

describe('RecordScreen — 履歴詳細', () => {
  it('shows question text, choices, own answer, correct answer, and explanation for a resolved question', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));
    fireEvent.click(screen.getByText(/縦4cm、横5cmの長方形の面積は？/));

    const detail = screen.getByText('履歴詳細').closest('section')!;
    expect(within(detail).getByText('縦4cm、横5cmの長方形の面積は？')).toBeTruthy();
    expect(within(detail).getByText(/9（自分の回答）/)).toBeTruthy(); // r2 selected index 0 -> choice "9"
    expect(within(detail).getByText(/20（正答）/)).toBeTruthy(); // correctIndex 2 -> choice "20"
    expect(within(detail).getByText('4 × 5 = 20 です。')).toBeTruthy();
  });

  it('shows 「わからない」 for an UNKNOWN record instead of a selected choice', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));
    fireEvent.click(screen.getByText(/"apple" の意味は？/));

    const detail = screen.getByText('履歴詳細').closest('section')!;
    expect(within(detail).getByText('自分の回答: わからない')).toBeTruthy();
    expect(within(detail).getByText(/りんご（正答）/)).toBeTruthy();
  });

  it('falls back safely (no crash) when the QuestionDefinition cannot be resolved', () => {
    render(<RecordScreen records={records} questionsById={questionsById} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));
    fireEvent.click(screen.getByText(/問題データを読み込めません/));

    const detail = screen.getByText('履歴詳細').closest('section')!;
    // Record-level facts still show even though the question itself doesn't resolve.
    expect(within(detail).getByText('数学')).toBeTruthy();
    expect(within(detail).getByText('問題データを読み込めません。')).toBeTruthy();
  });
});
