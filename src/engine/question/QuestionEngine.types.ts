import type { StarLevel } from '../../types/stats';

/** Four production question formats supported by the revised 2026-09-30 official bank. */
export type QuestionFormat = 'multiple_choice' | 'true_false' | 'ordering' | 'short_answer';

interface QuestionBase {
  id: string;
  subject: string;
  /** 分野 — not selectable in MVP-1 battle UI (fixed by the deployment's question range, which doesn't exist yet). */
  field: string;
  /** 単元 — not selectable in MVP-1 battle UI. */
  unit: string;
  star: StarLevel;
  text: string;
  /** 簡潔な解説 — mandatory per spec §12.8. */
  explanation: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  format: 'multiple_choice';
  choices: string[];
  correctIndex: number;
}

export interface TrueFalseQuestion extends QuestionBase {
  format: 'true_false';
  correctAnswer: boolean;
}

export interface OrderingQuestion extends QuestionBase {
  format: 'ordering';
  items: string[];
  correctOrder: number[];
}

export interface ShortAnswerQuestion extends QuestionBase {
  format: 'short_answer';
  acceptedAnswers: string[];
}

export type QuestionDefinition =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | OrderingQuestion
  | ShortAnswerQuestion;

/** All answer payloads used by the attached official StudyRise question banks. */
export type QuestionAnswer =
  | { type: 'multiple_choice'; selectedIndex: number }
  | { type: 'true_false'; value: boolean }
  | { type: 'ordering'; order: number[] }
  | { type: 'short_answer'; value: string }
  | { type: 'dont_know' };

/** Compatibility alias retained while older battle tests/imports still use the old name. */
export type MultipleChoiceAnswer = QuestionAnswer;

function normalizeShortAnswer(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function isQuestionAnswerCorrect(question: QuestionDefinition, answer: QuestionAnswer): boolean {
  if (answer.type === 'dont_know') return false;
  switch (question.format) {
    case 'multiple_choice':
      return answer.type === 'multiple_choice' && answer.selectedIndex === question.correctIndex;
    case 'true_false':
      return answer.type === 'true_false' && answer.value === question.correctAnswer;
    case 'ordering':
      return answer.type === 'ordering' &&
        answer.order.length === question.correctOrder.length &&
        answer.order.every((value, index) => value === question.correctOrder[index]);
    case 'short_answer': {
      if (answer.type !== 'short_answer') return false;
      const normalized = normalizeShortAnswer(answer.value);
      return question.acceptedAnswers.some((candidate) => normalizeShortAnswer(candidate) === normalized);
    }
  }
}
