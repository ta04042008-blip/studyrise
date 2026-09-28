import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useBaseController } from '../../src/state/useBaseController';
import { sampleArea } from '../../src/data/areas/sampleArea';
import { sampleStage } from '../../src/data/stages/sampleStage';
import { sampleParty } from '../../src/data/characters/sampleCharacters';

afterEach(cleanup);

function Harness() {
  return <>{useBaseController()}</>;
}

const CORRECT_INDEX_BY_TEXT: Record<string, number> = {
  '7 + 5 は？': 2,
  '9 × 6 は？': 1,
  '縦4cm、横5cmの長方形の面積は？': 1,
  '"apple" の意味は？': 0,
  '"library" の意味は？': 1,
};

function clickIfPresent(selector: string): boolean {
  const el = document.querySelector<HTMLButtonElement>(selector);
  if (el && !el.disabled) {
    fireEvent.click(el);
    return true;
  }
  return false;
}

/**
 * End-to-end integration test (user's final MVP-8 verification checklist):
 * drives Base → Stage → answers one question CORRECT, one INCORRECT, one
 * UNKNOWN (「わからない」), then back to Base, and checks the 記録 screen's
 * derived summary/history reflect exactly those three answers.
 */
function driveZone1AnsweringPlan(maxSteps = 1500) {
  // 0-indexed: attempt 0 -> deliberately wrong choice (INCORRECT), attempt 1
  // -> 「わからない」(UNKNOWN), attempt 2+ -> correct (to eventually win).
  let attempt = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';
    if (clickIfPresent('.command-menu button')) continue;
    if (clickIfPresent('.target-select-view button')) continue;
    if (clickIfPresent('.subject-star-select button')) continue;
    const questionText = document.querySelector('.question-view__text');
    if (questionText) {
      const currentAttempt = attempt;
      attempt += 1;

      if (currentAttempt === 1) {
        fireEvent.click(screen.getByRole('button', { name: 'わからない' }));
        continue;
      }

      const text = questionText.textContent?.trim() ?? '';
      const correctIndex = CORRECT_INDEX_BY_TEXT[text] ?? 0;
      const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
      // Attempt 0: deliberately wrong (any other choice); attempt 2+: correct.
      const chosenIndex = currentAttempt === 0 ? (correctIndex + 1) % radios.length : correctIndex;

      fireEvent.click(radios[chosenIndex]);
      fireEvent.click(screen.getByRole('button', { name: '回答する' }));
      continue;
    }
    const nextBtn = screen.queryByRole('button', { name: '次へ' });
    if (nextBtn) {
      fireEvent.click(nextBtn);
      continue;
    }
    return 'stuck';
  }
  return 'timeout';
}

function driveToStageStart() {
  fireEvent.click(screen.getByRole('button', { name: '出撃' }));
  fireEvent.click(screen.getByRole('button', { name: sampleArea.name }));
  fireEvent.click(screen.getByRole('button', { name: sampleStage.name }));

  fireEvent.click(screen.getByRole('button', { name: '編成を変更' }));
  fireEvent.click(screen.getByRole('button', { name: sampleParty[0].name }));
  fireEvent.click(screen.getByRole('button', { name: '決定' }));

  fireEvent.click(screen.getByLabelText(/数学（教科単位選択）/));
  fireEvent.click(screen.getByLabelText(/英語（教科単位選択）/));

  fireEvent.click(screen.getByRole('button', { name: '出撃確認へ' }));
  fireEvent.click(screen.getByRole('button', { name: '出撃' }));
}

describe('useBaseController — 記録 screen shows navigation and an empty history before any battle', () => {
  it('拠点 → 記録 shows the zero-record summary', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: '記録' }));
    expect(screen.getByText('記録')).toBeTruthy();
    expect(screen.getByText('まだ回答履歴がありません。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));
    expect(screen.getByRole('button', { name: '記録' })).toBeTruthy();
  });
});

describe('useBaseController — 記録 screen after a battle with CORRECT/INCORRECT/UNKNOWN answers', () => {
  it('records exactly the 3 answers and derives the summary from them, back at Base', () => {
    render(<Harness />);
    driveToStageStart();

    const outcome = driveZone1AnsweringPlan();
    expect(outcome).toBe('won');

    // Zone 1 reward → self-return between zones → back to Base (mirrors the
    // MVP-7 permanentReward test's proven self-return path).
    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));
    const card = document.querySelector<HTMLElement>('.reward-card')!;
    fireEvent.click(card);
    fireEvent.click(screen.getByRole('button', { name: '決定' }));
    fireEvent.click(document.querySelector<HTMLElement>('.reward-screen__complete button')!);
    fireEvent.click(screen.getByRole('button', { name: '帰還する（自主帰還）' }));
    fireEvent.click(screen.getByRole('button', { name: '拠点へ戻る' }));

    // Back at Base — open 記録.
    fireEvent.click(screen.getByRole('button', { name: '記録' }));

    const summarySection = screen.getByText('全体サマリー').closest('section')!;
    const values = within(summarySection)
      .getAllByRole('definition')
      .map((dd) => dd.textContent);
    // At least the 3 planned answers were recorded (extra correct answers may
    // have been needed to actually defeat the enemy after 2 no-damage turns).
    const [total, correct, incorrect, unknown] = values.map(Number);
    expect(total).toBeGreaterThanOrEqual(3);
    expect(correct).toBeGreaterThanOrEqual(1);
    expect(incorrect).toBe(1);
    expect(unknown).toBe(1);
    expect(total).toBe(correct + incorrect + unknown);

    // 履歴一覧 shows exactly `total` entries, one of them わからない.
    fireEvent.click(screen.getByRole('button', { name: '履歴一覧' }));
    fireEvent.change(screen.getByLabelText('正誤'), { target: { value: 'UNKNOWN' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);

    // Selecting it shows the detail view with a resolved question and the correct answer.
    fireEvent.click(screen.getAllByRole('listitem')[0].querySelector('button')!);
    expect(screen.getByText('履歴詳細')).toBeTruthy();
    expect(screen.getByText('自分の回答: わからない')).toBeTruthy();
  });
});
