import { fireEvent, screen } from '@testing-library/react';
import { officialQuestions } from '../../src/data/questions/officialQuestions';
import type { QuestionDefinition } from '../../src/engine/question/QuestionEngine.types';

function currentQuestion(): QuestionDefinition {
  const text = document.querySelector('.question-view__text')?.textContent?.trim();
  if (!text) throw new Error('No current question is rendered.');
  const matches = officialQuestions.filter((question) => question.text.trim() === text);
  if (matches.length === 0) throw new Error(`Question not found in official pool: ${text}`);

  // Repeated wording is allowed across banks; the rendered metadata narrows
  // the match without depending on internal BattleEngine state.
  const meta = document.querySelector('.question-view__meta')?.textContent ?? '';
  return matches.find((question) =>
    meta.includes(question.subject) &&
    meta.includes(question.field) &&
    meta.includes(question.unit),
  ) ?? matches[0];
}

function submitCurrentSelection() {
  fireEvent.click(screen.getByRole('button', { name: '回答する' }));
}

/** Answers the currently rendered official question correctly in all 4 formats. */
export function answerCurrentOfficialQuestionCorrectly(): QuestionDefinition {
  const question = currentQuestion();

  switch (question.format) {
    case 'multiple_choice': {
      const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
      const radio = radios[question.correctIndex];
      if (!radio) throw new Error(`Missing multiple-choice option ${question.correctIndex} for ${question.id}`);
      fireEvent.click(radio);
      submitCurrentSelection();
      return question;
    }
    case 'true_false':
      fireEvent.click(screen.getByRole('button', { name: question.correctAnswer ? '正' : '誤' }));
      submitCurrentSelection();
      return question;
    case 'ordering': {
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.question-view__choices button'));
      for (const index of question.correctOrder) {
        const button = buttons[index];
        if (!button) throw new Error(`Missing ordering item ${index} for ${question.id}`);
        fireEvent.click(button);
      }
      submitCurrentSelection();
      return question;
    }
    case 'short_answer': {
      const input = document.querySelector<HTMLInputElement>('.question-view__short-answer');
      if (!input) throw new Error(`Missing short-answer input for ${question.id}`);
      fireEvent.change(input, { target: { value: question.acceptedAnswers[0] ?? '' } });
      submitCurrentSelection();
      return question;
    }
  }
}

/** Deliberately submits an incorrect answer in all 4 official formats. */
export function answerCurrentOfficialQuestionIncorrectly(): QuestionDefinition {
  const question = currentQuestion();

  switch (question.format) {
    case 'multiple_choice': {
      const wrongIndex = question.choices.findIndex((_, index) => index !== question.correctIndex);
      const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
      const radio = radios[wrongIndex];
      if (!radio) throw new Error(`Missing wrong multiple-choice option for ${question.id}`);
      fireEvent.click(radio);
      submitCurrentSelection();
      return question;
    }
    case 'true_false':
      fireEvent.click(screen.getByRole('button', { name: question.correctAnswer ? '誤' : '正' }));
      submitCurrentSelection();
      return question;
    case 'ordering': {
      const wrongOrder = [...question.correctOrder];
      if (wrongOrder.length >= 2) [wrongOrder[0], wrongOrder[1]] = [wrongOrder[1], wrongOrder[0]];
      else throw new Error(`Cannot construct incorrect ordering for ${question.id}`);
      const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.question-view__choices button'));
      for (const index of wrongOrder) {
        const button = buttons[index];
        if (!button) throw new Error(`Missing ordering item ${index} for ${question.id}`);
        fireEvent.click(button);
      }
      submitCurrentSelection();
      return question;
    }
    case 'short_answer': {
      const input = document.querySelector<HTMLInputElement>('.question-view__short-answer');
      if (!input) throw new Error(`Missing short-answer input for ${question.id}`);
      fireEvent.change(input, { target: { value: '__intentionally_wrong__' } });
      submitCurrentSelection();
      return question;
    }
  }
}
