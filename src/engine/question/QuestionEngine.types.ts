import type { StarLevel } from '../../types/stats';

/**
 * Four question formats per spec §12.6. MVP-1 only ever *serves*
 * `multiple_choice` questions (CommandMenu/QuestionView only render that
 * one), but the type is defined for all four from the start so later MVPs
 * (content expansion, MVP-10) don't need a breaking type change.
 */
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

/** Typed for future MVPs; not implemented/served in MVP-1. */
export interface TrueFalseQuestion extends QuestionBase {
  format: 'true_false';
  correctAnswer: boolean;
}

/** Typed for future MVPs; not implemented/served in MVP-1. */
export interface OrderingQuestion extends QuestionBase {
  format: 'ordering';
  items: string[];
  correctOrder: number[];
}

/** Typed for future MVPs; not implemented/served in MVP-1. */
export interface ShortAnswerQuestion extends QuestionBase {
  format: 'short_answer';
  acceptedAnswers: string[];
}

export type QuestionDefinition =
  | MultipleChoiceQuestion
  | TrueFalseQuestion
  | OrderingQuestion
  | ShortAnswerQuestion;

/** MVP-1 only submits/evaluates multiple-choice answers (or "わからない"). */
export type MultipleChoiceAnswer = { type: 'multiple_choice'; selectedIndex: number } | { type: 'dont_know' };
