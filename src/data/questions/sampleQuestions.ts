import type { MultipleChoiceQuestion } from '../../engine/question/QuestionEngine.types';

/**
 * PLACEHOLDER content — minimal question pool to exercise MVP-1's battle
 * loop (≥2 subjects, spec §12.2). Not final game content; do not treat as
 * official data (CLAUDE.md §24).
 */
export const sampleQuestions: MultipleChoiceQuestion[] = [
  {
    id: 'q_math_001',
    subject: '数学', // PLACEHOLDER
    field: '計算',
    unit: '四則演算',
    star: 1,
    format: 'multiple_choice',
    text: '7 + 5 は？',
    choices: ['10', '11', '12', '13'],
    correctIndex: 2,
    explanation: '7 + 5 = 12 です。',
  },
  {
    id: 'q_math_002',
    subject: '数学', // PLACEHOLDER
    field: '計算',
    unit: '四則演算',
    star: 2,
    format: 'multiple_choice',
    text: '9 × 6 は？',
    choices: ['52', '54', '56', '58'],
    correctIndex: 1,
    explanation: '9 × 6 = 54 です。',
  },
  {
    id: 'q_math_003',
    subject: '数学', // PLACEHOLDER
    field: '図形',
    unit: '面積',
    star: 3,
    format: 'multiple_choice',
    text: '縦4cm、横5cmの長方形の面積は？',
    choices: ['18cm²', '20cm²', '22cm²', '24cm²'],
    correctIndex: 1,
    explanation: '面積 = 縦 × 横 = 4 × 5 = 20cm² です。',
  },
  {
    id: 'q_eng_001',
    subject: '英語', // PLACEHOLDER
    field: '語彙',
    unit: '基本単語',
    star: 1,
    format: 'multiple_choice',
    text: '"apple" の意味は？',
    choices: ['りんご', 'みかん', 'ぶどう', 'もも'],
    correctIndex: 0,
    explanation: '"apple" は「りんご」という意味です。',
  },
  {
    id: 'q_eng_002',
    subject: '英語', // PLACEHOLDER
    field: '語彙',
    unit: '基本単語',
    star: 2,
    format: 'multiple_choice',
    text: '"library" の意味は？',
    choices: ['病院', '図書館', '公園', '駅'],
    correctIndex: 1,
    explanation: '"library" は「図書館」という意味です。',
  },
];
