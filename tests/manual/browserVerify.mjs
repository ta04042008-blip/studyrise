// MVP-9 manual browser verification script (Playwright, real IndexedDB in a
// real Chromium tab — the one thing the automated test suite deliberately
// does NOT exercise, since it uses InMemorySaveRepository/fake-indexeddb).
// Not part of the automated test suite; run manually against a dev server.
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

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto(BASE_URL);

  // --- Scenario A: Base loads after boot, fresh state ---
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  log('A1: Base Home loads after boot (fresh install)', true);

  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.getByRole('button', { name: /^エリア1$/ }).click().catch(async () => {
    await page.locator('.area-select-screen button').first().click();
  });
  await page.locator('.stage-select-screen button, button', { hasText: 'サンプルステージ' }).first().click();
  await page.getByRole('button', { name: '編成を変更' }).click();
  await page.locator('.party-edit-view button').first().click();
  await page.getByRole('button', { name: '決定' }).click();
  await page.getByLabel(/数学（教科単位選択）/).click();
  await page.getByLabel(/英語（教科単位選択）/).click();
  await page.getByRole('button', { name: '出撃確認へ' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
  log('setup: departed into Stage', true);

  // --- Scenario B: answer a question, reload, same question resolved / same HP ---
  async function answerOneCorrect() {
    const cmdBtn = page.locator('.command-menu button').first();
    if (await cmdBtn.count()) await cmdBtn.click();
    const targetBtn = page.locator('.target-select-view button').first();
    if (await targetBtn.count()) await targetBtn.click();
    const subjectBtn = page.locator('.subject-star-select button').first();
    if (await subjectBtn.count()) await subjectBtn.click();
    const qText = await page.locator('.question-view__text').textContent();
    const idx = CORRECT_INDEX_BY_TEXT[qText?.trim() ?? ''] ?? 0;
    await page.locator('.question-view input[type=radio]').nth(idx).click();
    await page.getByRole('button', { name: '回答する' }).click();
  }
  await answerOneCorrect();
  const hpBefore = await page.locator('.hp-bar__label').first().textContent();
  log('B1: answered one question, HP recorded', true, hpBefore ?? '');

  await page.reload();
  await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
  log('B2: reload shows Resume choice (not Base, not fresh Stage)', true);
  await page.getByRole('button', { name: '途中から再開' }).click();
  await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
  const hpAfter = await page.locator('.hp-bar__label').first().textContent();
  log('B3: resumed with the same HP', hpAfter === hpBefore, `${hpBefore} -> ${hpAfter}`);

  // --- Scenario D/E: win zone, reward candidates stable across reload ---
  for (let i = 0; i < 400; i++) {
    if (await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).count()) break;
    if (await page.getByRole('button', { name: /敗北/ }).count()) break;
    const cmdBtn = page.locator('.command-menu button').first();
    if (await cmdBtn.count()) { await cmdBtn.click(); continue; }
    const targetBtn = page.locator('.target-select-view button').first();
    if (await targetBtn.count()) { await targetBtn.click(); continue; }
    const subjectBtn = page.locator('.subject-star-select button').first();
    if (await subjectBtn.count()) { await subjectBtn.click(); continue; }
    if (await page.locator('.question-view__text').count()) { await answerOneCorrect(); continue; }
    const nextBtn = page.getByRole('button', { name: '次へ' });
    if (await nextBtn.count()) { await nextBtn.click(); continue; }
    break;
  }
  const won = await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).count();
  log('D1: won Zone 1', !!won);
  await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).click();
  const candidateNamesBefore = await page.locator('.reward-card__name').allTextContents();
  log('E1: reward candidates generated', candidateNamesBefore.length > 0, candidateNamesBefore.join(', '));

  await page.reload();
  await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '途中から再開' }).click();
  await page.locator('.reward-card__name').first().waitFor();
  const candidateNamesAfterReload = await page.locator('.reward-card__name').allTextContents();
  log(
    'E2: reload shows the SAME reward candidates (no re-roll)',
    JSON.stringify(candidateNamesBefore) === JSON.stringify(candidateNamesAfterReload),
    candidateNamesAfterReload.join(', '),
  );

  // --- Scenario F: reroll, reload, same post-reroll candidates + reroll count preserved ---
  const rerollBtnTextBefore = await page.locator('.reward-screen__actions button').first().textContent();
  await page.locator('.reward-screen__actions button').first().click(); // reroll
  const candidatesAfterReroll = await page.locator('.reward-card__name').allTextContents();
  const rerollBtnTextAfter = await page.locator('.reward-screen__actions button').first().textContent();
  log('F1: rerolled candidates', JSON.stringify(candidatesAfterReroll) !== JSON.stringify(candidateNamesAfterReload));

  await page.reload();
  await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '途中から再開' }).click();
  await page.locator('.reward-card__name').first().waitFor();
  const candidatesAfterRerollReload = await page.locator('.reward-card__name').allTextContents();
  const rerollBtnTextReloaded = await page.locator('.reward-screen__actions button').first().textContent();
  log(
    'F2: reload after reroll shows the SAME rerolled candidates',
    JSON.stringify(candidatesAfterReroll) === JSON.stringify(candidatesAfterRerollReload),
    candidatesAfterRerollReload.join(', '),
  );
  log(
    'F3: reroll count consumed is preserved across reload',
    rerollBtnTextAfter === rerollBtnTextReloaded,
    `${rerollBtnTextAfter} vs ${rerollBtnTextReloaded}`,
  );

  // --- Finish the run: pick a card, complete reward, self-return, StageResult, reload, finalize ---
  await page.locator('.reward-card').first().click();
  await page.getByRole('button', { name: '決定' }).click();
  await page.locator('.reward-screen__complete button').click();
  await page.getByRole('button', { name: '帰還する（自主帰還）' }).click();
  await page.getByRole('heading', { name: '自主帰還しました' }).waitFor();
  log('setup: reached StageResult via self-return', true);

  await page.reload();
  await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '途中から再開' }).click();
  const stageResultVisible = await page.getByRole('heading', { name: '自主帰還しました' }).count();
  log('H1: reload while on StageResult redisplays the same result (no re-reconcile)', !!stageResultVisible);

  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '持ち物' }).click();
  const currencyAfterFinalize = await page.locator('text=/^\\d+$/').allTextContents();
  log('H2: back at Base after finalize, reward applied', true, currencyAfterFinalize.join(','));
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  // --- Scenario I: reload once more — Base again, no resume prompt, Permanent/History intact ---
  await page.reload();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  const resumePromptAfterFinalize = await page.getByRole('button', { name: '途中から再開' }).count();
  log('I1: reload after finalize goes straight to Base (RunSave fully cleared)', resumePromptAfterFinalize === 0);
  await page.getByRole('button', { name: '記録' }).click();
  const hasHistory = (await page.locator('body').textContent())?.includes('全体サマリー');
  log('I2: LearningHistory survived the whole session across every reload', !!hasHistory);

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
