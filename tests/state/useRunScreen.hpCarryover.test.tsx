import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useRunScreen } from '../../src/state/useRunScreen';

afterEach(cleanup);

function Harness() {
  return <>{useRunScreen()}</>;
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

/** Drives COMMAND_SELECT→...→EXPLANATION/RESULT_APPLY loops with "アタック" + correct answers until the battle-end win button appears. */
function driveBattleToWin(maxSteps = 500) {
  for (let i = 0; i < maxSteps; i++) {
    if (screen.queryByRole('button', { name: 'ゾーンクリア → 報酬へ' })) return 'won';
    if (screen.queryByRole('button', { name: /敗北/ })) return 'lost';

    if (clickIfPresent('.command-menu button')) continue; // "アタック" is always the first, enabled command button
    if (clickIfPresent('.target-select-view button')) continue;
    if (clickIfPresent('.subject-star-select button')) continue;

    const questionText = document.querySelector('.question-view__text');
    if (questionText) {
      const idx = CORRECT_INDEX_BY_TEXT[questionText.textContent?.trim() ?? ''] ?? 0;
      const radios = document.querySelectorAll<HTMLInputElement>('.question-view input[type=radio]');
      fireEvent.click(radios[idx]);
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

function readHpBars(): Record<string, { current: number; max: number }> {
  const result: Record<string, { current: number; max: number }> = {};
  for (const el of document.querySelectorAll<HTMLElement>('.hp-bar__label')) {
    const text = el.textContent ?? '';
    const m = text.match(/^(?:▶\s*)?(\S+)\s+HP (\d+) \/ (\d+)/);
    if (m) result[m[1]] = { current: Number(m[2]), max: Number(m[3]) };
  }
  return result;
}

/** Picks the current character's first offered reward card, confirms it, and returns the card's full text (for post-hoc category detection). */
function pickFirstRewardAndConfirm(): string {
  const card = document.querySelector<HTMLElement>('.reward-card')!;
  const text = card.textContent ?? '';
  fireEvent.click(card);
  fireEvent.click(screen.getByRole('button', { name: '決定' }));
  return text;
}

/** Given the picked reward's card text and the character's Battle1 ending HP, predicts what Battle2 should show — mirrors RogueliteEngine's own application rules (spec §9.7, MVP_TUNING heal%). */
function expectedHpAfterReward(rewardText: string, ending: { current: number; max: number }): { current: number; max: number } {
  if (rewardText.includes('現在HPも同時に加算')) {
    // TEMP_STAT_BOOST: hp, +10/level (rewardConfig.tempStatBoostPerLevel.hp).
    return { current: ending.current + 10, max: ending.max + 10 };
  }
  if (rewardText.includes('即座に回復')) {
    // HEAL_SPECIAL sample: 30% of maxHp, clamped at maxHp.
    return { current: Math.min(ending.max, ending.current + Math.round(ending.max * 0.3)), max: ending.max };
  }
  // Any other category (NEW_SPELL/SPELL_UPGRADE/other TEMP_STAT_BOOST/COMMAND_BOOST) never touches HP.
  return ending;
}

describe('useRunScreen — Battle1 → Reward → Battle2 HP carryover (spec §2.4/§8)', () => {
  it('every survivor\'s real ending HP (never a full-HP reset) carries into Battle2, correctly combined with whatever reward they picked; enemies start fresh', () => {
    render(<Harness />);

    expect(driveBattleToWin()).toBe('won');

    // Snapshot every survivor's true ending HP from Battle1 before touching the reward phase.
    const endingHp = readHpBars();
    const partyLabels = ['主人公', '魔法使い', '騎士'];
    for (const label of partyLabels) expect(endingHp[label]).toBeDefined();

    // Sanity: at least one party member must have actually taken damage in
    // this deterministic seed/script, otherwise this test can't distinguish
    // "carried over" from "reset to full" — if this ever fails, the fixed
    // seed/answer sequence above needs revisiting, not the assertions below.
    expect(partyLabels.some((label) => endingHp[label].current < endingHp[label].max)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }));

    const pickedRewardTextByLabel: Record<string, string> = {};
    for (const label of partyLabels) {
      expect(screen.getByRole('heading', { name: new RegExp(`^${label}の報酬$`) })).toBeTruthy();
      pickedRewardTextByLabel[label] = pickFirstRewardAndConfirm();
    }

    fireEvent.click(screen.getByRole('button', { name: '次の戦闘へ' }));

    const battle2Hp = readHpBars();
    for (const label of partyLabels) {
      const expected = expectedHpAfterReward(pickedRewardTextByLabel[label], endingHp[label]);
      expect(battle2Hp[label]).toEqual(expected);
      // Whatever else happened, Battle2 must never silently reset a
      // survivor back to full HP unless their picked reward's own math
      // says the current value happens to equal max (e.g. a heal that
      // tops them off) — this line documents that distinction rather than
      // asserting it away.
    }

    // MP always resets to 0 at zone start regardless of HP carryover
    // (BattleEngine's actorFromCharacter always sets currentMp: 0 — see
    // the pre-existing "BattleEngine — MP starts at 0" test, untouched by
    // this change); Battle2's Spell button being present/enabled-by-MP is
    // consistent with that and is exercised throughout the existing suite.

    // New enemies always start at their full initial HP (a fresh zone, spec §2.1/§8).
    expect(battle2Hp['スライム']).toEqual({ current: 40, max: 40 });
    expect(battle2Hp['ゴブリン']).toEqual({ current: 25, max: 25 });
  });
});
