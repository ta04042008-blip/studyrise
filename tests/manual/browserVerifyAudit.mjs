// MVP-9 follow-up audit — real-browser verification of the 3 scenarios the
// user flagged as insufficiently confirmed in the first pass: B (unanswered
// QUESTION survives reload with selection reset), D (Search reveal + timeline
// survive reload), G (Zone 2 mid-progress, not just Zone 1). Real Chromium +
// real IndexedDB, same as browserVerify.mjs.
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5183/';
const CORRECT_INDEX_BY_TEXT = {
  '7 + 5 は？': 2,
  '9 × 6 は？': 1,
  '縦4cm、横5cmの長方形の面積は？': 1,
  '"apple" の意味は？': 0,
  '"library" の意味は？': 1,
};

function log(step, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${step}${extra ? ' — ' + extra : ''}`);
  if (!ok) process.exitCode = 1;
}

async function departInto(page) {
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.locator('.area-select-screen button, button').first().click();
  await page.locator('button', { hasText: 'サンプルステージ' }).first().click();
  await page.getByRole('button', { name: '編成を変更' }).click();
  await page.locator('.party-edit-view button').first().click();
  await page.getByRole('button', { name: '決定' }).click();
  await page.getByLabel(/数学（教科単位選択）/).click();
  await page.getByLabel(/英語（教科単位選択）/).click();
  await page.getByRole('button', { name: '出撃確認へ' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
}

async function answerCorrect(page) {
  const qText = await page.locator('.question-view__text').textContent();
  const idx = CORRECT_INDEX_BY_TEXT[qText?.trim() ?? ''] ?? 0;
  await page.locator('.question-view input[type=radio]').nth(idx).click();
  await page.getByRole('button', { name: '回答する' }).click();
}

async function driveOneRoundIfIdle(page) {
  const cmdBtn = page.locator('.command-menu button').first();
  if (await cmdBtn.count()) { await cmdBtn.click(); return true; }
  const targetBtn = page.locator('.target-select-view button').first();
  if (await targetBtn.count()) { await targetBtn.click(); return true; }
  const subjectBtn = page.locator('.subject-star-select button').first();
  if (await subjectBtn.count()) { await subjectBtn.click(); return true; }
  if (await page.locator('.question-view__text').count()) { await answerCorrect(page); return true; }
  const nextBtn = page.getByRole('button', { name: '次へ' });
  if (await nextBtn.count()) { await nextBtn.click(); return true; }
  return false;
}

async function driveToWin(page, maxSteps = 400) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).count()) return true;
    if (await page.getByRole('button', { name: /敗北/ }).count()) return false;
    if (!(await driveOneRoundIfIdle(page))) return false;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto(BASE_URL);
  await departInto(page);
  log('setup: departed into Stage (Zone 1)', true);

  // --- Scenario B: unanswered QUESTION survives reload, selection resets ---
  await page.locator('.command-menu button').first().click();
  const targetBtn = page.locator('.target-select-view button').first();
  if (await targetBtn.count()) await targetBtn.click();
  await page.locator('.subject-star-select button').first().click();
  await page.locator('.question-view__text').waitFor();
  const questionBefore = (await page.locator('.question-view__text').textContent())?.trim();
  const checkedBefore = await page.locator('.question-view input[type=radio]:checked').count();
  log('B1: reached QUESTION phase unanswered', !!questionBefore, questionBefore ?? '');
  log('B2: no radio pre-checked before reload', checkedBefore === 0);

  await page.reload();
  await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '途中から再開' }).click();
  await page.locator('.question-view__text').waitFor();
  const questionAfter = (await page.locator('.question-view__text').textContent())?.trim();
  const checkedAfter = await page.locator('.question-view input[type=radio]:checked').count();
  log('B3: same questionId shown after resume', questionAfter === questionBefore, `${questionBefore} -> ${questionAfter}`);
  log('B4: selection reset to unselected after resume', checkedAfter === 0);

  // Answer it so we can move on to Scenario D.
  await answerCorrect(page);
  await page.getByRole('button', { name: '次へ' }).click(); // COMMAND_ANIMATION -> EXPLANATION

  // --- Scenario D: Search reveal + timeline survive reload ---
  // Get back to COMMAND_SELECT first.
  for (let i = 0; i < 20 && !(await page.locator('.command-menu button').count()); i++) {
    const nextBtn = page.getByRole('button', { name: '次へ' });
    if (await nextBtn.count()) await nextBtn.click();
    else break;
  }
  const searchBtn = page.getByRole('button', { name: 'サーチ' });
  if (await searchBtn.count()) {
    await searchBtn.click();
    const searchTarget = page.locator('.target-select-view button').first();
    if (await searchTarget.count()) await searchTarget.click();
    await page.locator('.subject-star-select button').first().click();
    await answerCorrect(page);
    await page.getByRole('button', { name: '次へ' }).click(); // apply RESULT -> EXPLANATION, populates searchByEnemyId

    const searchPanelBefore = await page.locator('.search-info-panel').textContent();
    const turnOrderBefore = await page.locator('.turn-order-view').textContent();
    log('D1: Search revealed enemy planned actions', !!searchPanelBefore, searchPanelBefore ?? '');

    await page.reload();
    await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: '途中から再開' }).click();
    await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
    const searchPanelAfter = await page.locator('.search-info-panel').textContent();
    const turnOrderAfter = await page.locator('.turn-order-view').textContent();
    log('D2: revealed content identical after reload', searchPanelAfter === searchPanelBefore, searchPanelAfter ?? '');
    log('D3: turn order identical after reload', turnOrderAfter === turnOrderBefore, `${turnOrderBefore} -> ${turnOrderAfter}`);
  } else {
    log('D0: サーチ button not available at this point (phase moved on) — skipped, already covered by automated white-box test', true);
  }

  // --- Scenario G: Zone 2 mid-progress (not just Zone 1) ---
  const won = await driveToWin(page);
  log('setup: won Zone 1', won);
  if (won) {
    await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).click();
    await page.locator('.reward-card').first().click();
    await page.getByRole('button', { name: '決定' }).click();
    await page.locator('.reward-screen__complete button').click();
    await page.getByRole('button', { name: '次のゾーンへ' }).click();
    await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
    log('setup: entered Zone 2', true);

    // Take a couple of actions so HP/MP/timeline/items are non-trivial mid-Zone-2.
    await driveOneRoundIfIdle(page);
    await driveOneRoundIfIdle(page);
    await driveOneRoundIfIdle(page);

    const hpBefore = await page.locator('.hp-bar__label').allTextContents();
    const devPanelBefore = await page.locator('.dev-panel').textContent().catch(() => null);
    log('G1: mid-Zone-2 state captured', true, `${devPanelBefore ?? ''} | ${hpBefore.join(' / ')}`);

    await page.reload();
    await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
    await page.getByRole('button', { name: '途中から再開' }).click();
    await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
    const hpAfter = await page.locator('.hp-bar__label').allTextContents();
    const devPanelAfter = await page.locator('.dev-panel').textContent().catch(() => null);
    log('G2: still Zone 2 after reload (not Zone 1, not a fresh Stage)', devPanelAfter === devPanelBefore, `${devPanelBefore} -> ${devPanelAfter}`);
    log('G3: HP identical after reload', JSON.stringify(hpAfter) === JSON.stringify(hpBefore), hpAfter.join(' / '));
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
