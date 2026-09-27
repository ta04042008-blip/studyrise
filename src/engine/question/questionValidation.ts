import type { QuestionDefinition } from './QuestionEngine.types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const VALID_STARS = new Set([1, 2, 3, 4, 5]);
const VALID_FORMATS = new Set(['multiple_choice', 'true_false', 'ordering', 'short_answer']);

/**
 * Content validation per CLAUDE.md §14 / spec §12.1. Catches at minimum:
 * missing text, invalid difficulty, invalid type, missing correct answer,
 * invalid/duplicate choices. Bad content is reported, never thrown, so one
 * bad record cannot take down the whole game (CLAUDE.md §19).
 */
export function validateQuestion(question: QuestionDefinition): ValidationResult {
  const errors: string[] = [];

  if (!question.id || question.id.trim() === '') {
    errors.push('missing id');
  }
  if (!question.subject || question.subject.trim() === '') {
    errors.push('missing subject');
  }
  if (!question.text || question.text.trim() === '') {
    errors.push('missing text');
  }
  if (!VALID_STARS.has(question.star)) {
    errors.push(`invalid star: ${String(question.star)}`);
  }
  if (!VALID_FORMATS.has(question.format)) {
    errors.push(`invalid format: ${String(question.format)}`);
  }
  if (!question.explanation || question.explanation.trim() === '') {
    errors.push('missing explanation');
  }

  if (question.format === 'multiple_choice') {
    if (!question.choices || question.choices.length < 2) {
      errors.push('multiple_choice requires at least 2 choices');
    } else {
      const uniqueChoices = new Set(question.choices);
      if (uniqueChoices.size !== question.choices.length) {
        errors.push('multiple_choice has duplicate choices');
      }
      if (
        question.correctIndex == null ||
        question.correctIndex < 0 ||
        question.correctIndex >= question.choices.length
      ) {
        errors.push('missing or out-of-range correctIndex');
      }
    }
  } else if (question.format === 'true_false') {
    if (typeof question.correctAnswer !== 'boolean') {
      errors.push('true_false requires a correctAnswer');
    }
  } else if (question.format === 'ordering') {
    if (!question.items || question.items.length < 2) {
      errors.push('ordering requires at least 2 items');
    }
    if (!question.correctOrder || question.correctOrder.length !== question.items?.length) {
      errors.push('ordering requires a correctOrder matching items length');
    }
  } else if (question.format === 'short_answer') {
    if (!question.acceptedAnswers || question.acceptedAnswers.length === 0) {
      errors.push('short_answer requires at least one accepted answer');
    }
  }

  return { valid: errors.length === 0, errors };
}

export interface ValidatedPool {
  validQuestions: QuestionDefinition[];
  invalid: { question: QuestionDefinition; errors: string[] }[];
}

export function validateQuestionPool(pool: readonly QuestionDefinition[]): ValidatedPool {
  const validQuestions: QuestionDefinition[] = [];
  const invalid: { question: QuestionDefinition; errors: string[] }[] = [];

  for (const question of pool) {
    const result = validateQuestion(question);
    if (result.valid) {
      validQuestions.push(question);
    } else {
      invalid.push({ question, errors: result.errors });
    }
  }

  return { validQuestions, invalid };
}
