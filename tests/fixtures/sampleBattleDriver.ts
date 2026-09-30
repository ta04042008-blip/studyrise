import { fireEvent, screen, waitFor } from '@testing-library/react';
import { FULL_QUESTION_ANSWER_KEY } from './questionAnswerKey';

export function answerCurrentSampleQuestionCorrectly(): void {
  const questionText = document.querySelector('.question-view__text')?.textContent?.trim();
  if (!questionText) throw new Error('No sample question is rendered.');

  const correctIndex = FULL_QUESTION_ANSWER_KEY[questionText];
  if (correctIndex === undefined) throw new Error(`No sample answer key for: ${questionText}`);

  const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
  const radio = radios[correctIndex];
  if (!radio) throw new Error(`Missing option ${correctIndex} for: ${questionText}`);

  fireEvent.click(radio);
  fireEvent.click(screen.getByRole('button', { name: '回答する' }));
}

function clickIfPresent(selector: string): boolean {
  const el = document.querySelector<HTMLButtonElement>(selector);
  if (!el || el.disabled) return false;
  fireEvent.click(el);
  return true;
}

/**
 * Drives the current sample-question battle through the presentation layer.
 * Command animations are timer-driven in production, so tests must wait for
 * them rather than treating an intermediate frame as a stuck battle.
 */
export async function driveSampleZoneBattleToWin(
  maxSteps = 2000,
): Promise<'won' | 'lost' | 'stuck' | 'timeout'> {
  for (let i = 0; i < maxSteps; i += 1) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';

    if (clickIfPresent('.command-menu button')) continue;
    if (clickIfPresent('.target-select-view button')) continue;
    if (clickIfPresent('.subject-star-select button')) continue;

    if (document.querySelector('.question-view')) {
      answerCurrentSampleQuestionCorrectly();
      continue;
    }

    if (document.querySelector('.command-animation-view')) {
      await waitFor(
        () => {
          if (document.querySelector('.command-animation-view')) {
            throw new Error('command animation still running');
          }
        },
        { timeout: 1400, interval: 20 },
      );
      continue;
    }

    if (document.querySelector('.explanation-view')) {
      fireEvent.click(await screen.findByRole('button', { name: '次へ' }, { timeout: 800 }));
      continue;
    }

    return 'stuck';
  }

  return 'timeout';
}
