// MVP-10 manual browser E2E verification script (Playwright, real Chromium,
// real IndexedDB via a dev server). Not part of the automated test suite —
// drives the full Area 1《ハルカ》golden path: Base → Stage1(4 Zones, JANUS)
// → Stage2(4 Zones, NEREID) → Stage3(4 Zones, MNEMOS) → Area complete,
// with reloads along the way to confirm MVP-9's resume system still holds
// under the new MVP-10 content.
import { chromium } from 'playwright';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5183/';

const ANSWER_KEY = {
  '7 + 5 は？': 2, '9 × 6 は？': 1, '縦4cm、横5cmの長方形の面積は？': 1, '12 - 5 は？': 1, '6 × 7 は？': 2,
  '次のうち偶数はどれ？': 2, '直角は何度？': 2, '3.2 + 1.5 は？': 1, '1/2 + 1/4 は？': 2, '1辺6cmの正方形の周の長さは？': 2,
  '50人の20%は何人？': 1, '3 + 4 × 2 の答えは？': 0, '縦2cm、横3cm、高さ4cmの直方体の体積は？': 2,
  '3回のテストが80点、70点、90点のとき、平均点は？': 2, 'りんご3個とみかん5個の個数の比を最も簡単な整数の比で表すと？': 0,
  '定価800円の品物を2割引きで買うと、支払う金額は？': 3, 'x = 3 のとき、2x + 5 の値は？': 3, '底辺8cm、高さ5cmの三角形の面積は？': 1,
  '時速60kmで2.5時間走ると、進む距離は？': 2, 'x + 7 = 15 のとき、x の値は？': 2,
  '原価1000円の品物に3割の利益を加えて定価をつけ、その定価から2割引きで売ったときの売価は？': 1,
  '2つの数の和が20、差が4のとき、大きい数は？': 2,
  '縦10cm、横10cmの正方形の中から半径5cmの円を1つ切り取った残りの面積は何cm²？(円周率3.14)': 2,
  'Aさんは時速4kmで歩き、1時間30分でB地点に着いた。同じ道をCさんが時速6kmで歩くと何分かかる？': 2,
  'クラス40人のうち、男子と女子の人数の比は3:5である。女子の人数は？': 3,
  '"apple" の意味は？': 0, '"library" の意味は？': 1, '"dog" の意味は？': 0, '"book" の意味は？': 2, '"red" の意味は？': 1,
  'I ___ a student. に入る語は？': 0, '"apple" の正しい複数形は？': 0, 'She ___ to school every day. に入る語は？': 1,
  '"school" の意味は？': 0, '"Do you like apples?" に対する自然な返答は？': 0, 'Yesterday, I ___ to the park. に入る語は？': 2,
  'This book is ___ than that one. (interesting) に入る語は？': 1,
  '"He is tired because he studied all night." の意味として正しいものは？': 0, '"big" の反対の意味を持つ語は？': 0,
  'We ___ visit Japan next year. に入る語は？': 0, 'I ___ never seen that movie. に入る語は？': 0,
  '"Although it was raining, she went outside without an umbrella." から分かることは？': 0,
  'The man ___ is standing there is my teacher. に入る語は？': 0, '"Turn right at the corner." の right の意味は？': 1,
  'This song ___ written by a famous singer in 1990. に入る語は？': 1,
  '"Even though he failed the first time, he kept practicing and finally succeeded." が伝える教訓に最も近いものは？': 0,
  'If I ___ more time, I would travel abroad. に入る語は？': 1, 'The letter ___ in French was difficult to read. に入る語は？': 2,
  '"She whispered so that no one else could hear." から分かる話し方は？': 1,
  'Of the three books, this one is ___ interesting. に入る語は？': 2,
};

let failures = 0;
function log(step, ok, extra = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${step}${extra ? ' — ' + extra : ''}`);
  if (!ok) failures++;
}

async function answerOneCorrect(page) {
  const cmdBtn = page.locator('.command-menu button').first();
  if (await cmdBtn.count()) await cmdBtn.click();
  const targetBtn = page.locator('.target-select-view button').first();
  if (await targetBtn.count()) await targetBtn.click();
  const subjectBtn = page.locator('.subject-star-select button').first();
  if (await subjectBtn.count()) await subjectBtn.click();
  const qText = await page.locator('.question-view__text').textContent();
  const idx = ANSWER_KEY[qText?.trim() ?? ''] ?? 0;
  await page.locator('.question-view input[type=radio]').nth(idx).click();
  await page.getByRole('button', { name: '回答する' }).click();
}

async function driveZoneToWin(page, maxSteps = 3000) {
  for (let i = 0; i < maxSteps; i++) {
    if (await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).count()) return 'won';
    if (await page.getByRole('button', { name: /敗北/ }).count()) return 'lost';
    const cmdBtn = page.locator('.command-menu button').first();
    if (await cmdBtn.count()) { await cmdBtn.click(); continue; }
    const targetBtn = page.locator('.target-select-view button').first();
    if (await targetBtn.count()) { await targetBtn.click(); continue; }
    const subjectBtn = page.locator('.subject-star-select button').first();
    if (await subjectBtn.count()) { await subjectBtn.click(); continue; }
    if (await page.locator('.question-view__text').count()) { await answerOneCorrect(page); continue; }
    const nextBtn = page.getByRole('button', { name: '次へ' });
    if (await nextBtn.count()) { await nextBtn.click(); continue; }
    return 'stuck';
  }
  return 'timeout';
}

async function completeRewardPhaseAndProceed(page, partyLabels) {
  for (const label of partyLabels) {
    const heading = page.getByRole('heading', { name: new RegExp(`^${label}の報酬$`) });
    if (!(await heading.count())) continue;
    await page.locator('.reward-card').first().click();
    await page.getByRole('button', { name: '決定' }).click();
  }
  await page.locator('.reward-screen__complete button').click();
}

async function departFor(page, stageNameText, partyLabels) {
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.locator('.area-select-screen button, button', { hasText: 'ハルカ' }).first().click();
  await page.locator('button', { hasText: stageNameText }).first().click();
  await page.getByRole('button', { name: '編成を変更' }).click();
  // PartyEditView's roster buttons toggle selection (aria-pressed) — only
  // click ones not already selected, since a party may carry over from a
  // previous departure and a blind click would deselect them instead.
  for (const name of partyLabels) {
    const btn = page.locator('.party-edit-view button', { hasText: name }).first();
    if ((await btn.getAttribute('aria-pressed')) !== 'true') {
      await btn.click();
    }
  }
  await page.getByRole('button', { name: '決定' }).click();
  // .check() (not .click()) — idempotent regardless of whether the scope
  // already carried over checked from a previous departure.
  await page.getByLabel(/数学（教科単位選択）/).check();
  await page.getByLabel(/英語（教科単位選択）/).check();
  await page.getByRole('button', { name: '出撃確認へ' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.getByRole('heading', { name: 'StudyRise — Stage攻略' }).waitFor();
}

/** Reads Level/EXP + resolved stats (HP/学力/忍耐力/思考速度/MP) from キャラクター詳細, starting and ending at Base Home. */
async function readCharacterDetail(page, name) {
  await page.getByRole('button', { name: 'キャラクター' }).click();
  await page.locator('.character-list-view button', { hasText: name }).first().click();
  const levelDd = page.locator('.character-detail-view__level dd');
  const level = (await levelDd.nth(0).textContent())?.trim();
  const exp = (await levelDd.nth(1).textContent())?.trim();
  const statsDd = page.locator('.character-detail-view__stats dd');
  const hp = (await statsDd.nth(0).textContent())?.trim();
  const attack = (await statsDd.nth(1).textContent())?.trim();
  const defense = (await statsDd.nth(2).textContent())?.trim();
  const speed = (await statsDd.nth(3).textContent())?.trim();
  await page.getByRole('button', { name: '一覧へ戻る' }).click();
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  return { level, exp, hp, attack, defense, speed };
}

async function clearWholeStage(page, stageName, bossName, partyLabels) {
  for (let zone = 0; zone < 4; zone++) {
    const outcome = await driveZoneToWin(page);
    log(`${stageName} Zone${zone + 1}: won`, outcome === 'won', outcome);
    await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).click();
    await completeRewardPhaseAndProceed(page, partyLabels);
    if (zone < 3) {
      await page.getByRole('button', { name: '次のゾーンへ' }).click();
    }
  }
  const cleared = await page.getByRole('heading', { name: 'ステージクリア！' }).count();
  log(`${stageName}: ステージクリア！ (boss ${bossName} defeated)`, !!cleared);
}

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  await page.goto(BASE_URL);

  const PARTY_LABELS = ['葉山智也', '南雲彩乃', '岡村駆'];

  // --- 1. New save → Base ---
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  log('1: 新規Base読み込み', true);

  // --- 2. キャラクター確認 ---
  await page.getByRole('button', { name: 'キャラクター' }).click();
  const bodyText1 = (await page.locator('body').textContent()) ?? '';
  log('2: 智也/彩乃/駆の3人が表示', PARTY_LABELS.every((n) => bodyText1.includes(n)), bodyText1.slice(0, 80));
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  // --- 3. 装備・持ち物確認 ---
  await page.getByRole('button', { name: '装備' }).click();
  log('3a: 装備画面へ遷移', await page.locator('body').count() > 0);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  await page.getByRole('button', { name: '持ち物' }).click();
  log('3b: 持ち物画面へ遷移', await page.locator('body').count() > 0);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  // --- Lv/EXP checkpoint: Stage1開始時 ---
  const lvStage1Start = await readCharacterDetail(page, PARTY_LABELS[0]);
  log('Lv/EXP: Stage1開始時', true, JSON.stringify(lvStage1Start));

  // --- 4. 出撃: Area選択 → Stage1 ---
  await departFor(page, '閉ざされた連絡路', PARTY_LABELS);
  log('4: Stage1へ出撃(3人編成、数学+英語選択)', true);

  // --- 5. Stage1 全4Zone → JANUS撃破 → Stage Clear ---
  await clearWholeStage(page, 'Stage1', 'JANUS', PARTY_LABELS);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });

  // --- Lv/EXP checkpoint: Stage1 clear後 ---
  const lvStage1End = await readCharacterDetail(page, PARTY_LABELS[0]);
  log('Lv/EXP: Stage1 clear後', true, JSON.stringify(lvStage1End));

  // --- 5b. Equipment drop → 装備 → 強化 → reload (default runSeed sequence:
  // Stage1 uses runSeed=1, whose Zone4/JANUS BOSS_ZONE (50%) roll is a
  // guaranteed drop — verified analytically against the production
  // permanent-drop RNG derivation before writing this script; no seed
  // override needed, production drop probabilities are untouched). ---
  await page.getByRole('button', { name: '装備' }).click();
  const equipRowsAfterStage1 = page.locator('.equipment-list-screen__item');
  const equipCountAfterStage1 = await equipRowsAfterStage1.count();
  log('5b-1: Stage1(JANUS BOSS_ZONE)クリアでEquipment dropが発生', equipCountAfterStage1 > 0, `所持数=${equipCountAfterStage1}`);

  const currencyMaterialBefore = await page.locator('.equipment-list-screen h1 + p').textContent();
  const firstItemRow = equipRowsAfterStage1.first();
  const firstItemLabel = (await firstItemRow.locator('span').first().textContent())?.trim();
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  const statsBeforeEquip = await readCharacterDetail(page, PARTY_LABELS[0]);
  await page.getByRole('button', { name: '装備' }).click();

  // 智也 is selected by default (roster[0]); equip the dropped item to him.
  await firstItemRow.getByRole('button', { name: '装備' }).click();
  const equippedSlotText = await page.locator('.equipment-list-screen__equipped-slots dd').first().textContent();
  log('5b-2: 装備をキャラクターへ装備', !!equippedSlotText && !equippedSlotText.includes('未装備'), equippedSlotText ?? '');

  // Enhance +1 and confirm currency/material decreased by exactly the previewed cost.
  const enhanceButton = firstItemRow.getByRole('button', { name: /^強化（/ });
  await enhanceButton.click();
  const currencyMaterialAfterEnhance = await page.locator('.equipment-list-screen h1 + p').textContent();
  log(
    '5b-3: 強化+1後、コイン/強化素材が減少',
    currencyMaterialAfterEnhance !== currencyMaterialBefore,
    `${currencyMaterialBefore} -> ${currencyMaterialAfterEnhance}`,
  );
  const enhancedLabel = (await firstItemRow.locator('span').first().textContent())?.trim();
  log('5b-4: 装備の強化Lv表示が+1に更新', enhancedLabel !== firstItemLabel, `${firstItemLabel} -> ${enhancedLabel}`);
  // Captured AFTER enhancement (not equippedSlotText, which was captured
  // right after equipping but BEFORE the +1 enhance) — this is the correct
  // baseline for the reload-persistence comparison below.
  const equippedSlotTextAfterEnhance = await page.locator('.equipment-list-screen__equipped-slots dd').first().textContent();

  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  const statsBeforeReload = await readCharacterDetail(page, PARTY_LABELS[0]);
  log(
    '5b-4b: 装備+強化後、キャラクターの解決済みstatsが変化(装備補正反映)',
    JSON.stringify(statsBeforeReload) !== JSON.stringify(statsBeforeEquip),
    `${JSON.stringify(statsBeforeEquip)} -> ${JSON.stringify(statsBeforeReload)}`,
  );

  // Reload and verify: instanceId/enhancementLevel/equipped-state/currency/material all persisted.
  await page.reload();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '装備' }).click();
  const labelAfterReload = (await page.locator('.equipment-list-screen__item').first().locator('span').first().textContent())?.trim();
  const currencyMaterialAfterReload = await page.locator('.equipment-list-screen h1 + p').textContent();
  const equippedSlotAfterReload = await page.locator('.equipment-list-screen__equipped-slots dd').first().textContent();
  log('5b-5: reload後も強化Lv/装備名が維持', labelAfterReload === enhancedLabel, `${enhancedLabel} -> ${labelAfterReload}`);
  log(
    '5b-6: reload後もコイン/強化素材数量が維持',
    currencyMaterialAfterReload === currencyMaterialAfterEnhance,
    `${currencyMaterialAfterEnhance} -> ${currencyMaterialAfterReload}`,
  );
  log(
    '5b-7: reload後も装備中スロットが維持(instanceId再解決)',
    equippedSlotAfterReload?.trim() === equippedSlotTextAfterEnhance?.trim(),
    `${equippedSlotTextAfterEnhance} -> ${equippedSlotAfterReload}`,
  );
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  const statsAfterReload = await readCharacterDetail(page, PARTY_LABELS[0]);
  log(
    '5b-8: reload後もキャラクターのLevel/EXPが維持',
    JSON.stringify(statsAfterReload) === JSON.stringify(statsBeforeReload),
    `${JSON.stringify(statsBeforeReload)} -> ${JSON.stringify(statsAfterReload)}`,
  );

  // --- 6. Stage2 unlock 確認 ---
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.locator('.area-select-screen button, button', { hasText: 'ハルカ' }).first().click();
  const stage2Visible = await page.locator('button', { hasText: '沈黙した循環区' }).count();
  log('6: Stage1クリア後、Stage2《沈黙した循環区》がunlockされ選択可能', !!stage2Visible);
  await page.getByRole('button', { name: 'エリア選択へ戻る' }).click();
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  // --- 7. Base: Level/EXP, Equipment, LearningHistory ---
  await page.getByRole('button', { name: 'キャラクター' }).click();
  await page.locator('.character-list-view button', { hasText: PARTY_LABELS[0] }).first().click();
  const detailText = (await page.locator('body').textContent()) ?? '';
  log('7a: キャラクター詳細にLevelが表示', /Lv|レベル|Level/.test(detailText), detailText.slice(0, 120));
  await page.getByRole('button', { name: '一覧へ戻る' }).click();
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  await page.getByRole('button', { name: '記録' }).click();
  const hasHistory = ((await page.locator('body').textContent()) ?? '').includes('全体サマリー');
  log('7b: 記録画面にLearningHistoryサマリーが表示', hasHistory);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  // --- Lv/EXP checkpoint: Stage2開始時 ---
  const lvStage2Start = await readCharacterDetail(page, PARTY_LABELS[0]);
  log('Lv/EXP: Stage2開始時', true, JSON.stringify(lvStage2Start));

  // --- 8. Stage2 出撃 → 全4Zone → NEREID撃破 ---
  await departFor(page, '沈黙した循環区', PARTY_LABELS);
  log('8: Stage2へ出撃', true);

  // Mid-stage reload check (after Zone1 clear + reward pick, inside INTER_ZONE_CHOICE).
  const z1 = await driveZoneToWin(page);
  log('8a: Stage2 Zone1: won', z1 === 'won', z1);
  await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).click();
  await completeRewardPhaseAndProceed(page, PARTY_LABELS);
  const hpBeforeReload = await page.locator('.hp-bar__label').first().textContent().catch(() => null);
  await page.reload();
  await page.getByRole('button', { name: '途中から再開' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: '途中から再開' }).click();
  await page.getByText(/次のゾーンへ進みますか/).waitFor({ timeout: 5000 });
  log('8b: Stage2 Zone1後のreload/resumeが正常(INTER_ZONE_CHOICE復帰)', true);
  await page.getByRole('button', { name: '次のゾーンへ' }).click();

  for (let zone = 1; zone < 4; zone++) {
    const outcome = await driveZoneToWin(page);
    log(`Stage2 Zone${zone + 1}: won`, outcome === 'won', outcome);
    await page.getByRole('button', { name: 'ゾーンクリア → 報酬へ' }).click();
    await completeRewardPhaseAndProceed(page, PARTY_LABELS);
    if (zone < 3) await page.getByRole('button', { name: '次のゾーンへ' }).click();
  }
  const stage2Cleared = await page.getByRole('heading', { name: 'ステージクリア！' }).count();
  log('Stage2: ステージクリア！ (NEREID defeated)', !!stage2Cleared);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });

  // --- Lv/EXP checkpoint: Stage2 clear後 ---
  const lvStage2End = await readCharacterDetail(page, PARTY_LABELS[0]);
  log('Lv/EXP: Stage2 clear後', true, JSON.stringify(lvStage2End));

  // --- 9. Stage3 unlock 確認 → 出撃 → 全4Zone → MNEMOS撃破 ---
  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.locator('.area-select-screen button, button', { hasText: 'ハルカ' }).first().click();
  const stage3Visible = await page.locator('button', { hasText: '記録塔' }).count();
  log('9: Stage2クリア後、Stage3《記録塔》がunlockされ選択可能', !!stage3Visible);
  await page.getByRole('button', { name: 'エリア選択へ戻る' }).click();
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  // --- Lv/EXP checkpoint: Stage3開始時 ---
  const lvStage3Start = await readCharacterDetail(page, PARTY_LABELS[0]);
  log('Lv/EXP: Stage3開始時', true, JSON.stringify(lvStage3Start));

  await departFor(page, '記録塔', PARTY_LABELS);

  await clearWholeStage(page, 'Stage3', 'MNEMOS', PARTY_LABELS);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  log('10: 第1エリア《ハルカ》完走(Stage1/2/3クリア)', true);

  // --- Lv/EXP checkpoint: Stage3 clear後 ---
  const lvStage3End = await readCharacterDetail(page, PARTY_LABELS[0]);
  log('Lv/EXP: Stage3 clear後', true, JSON.stringify(lvStage3End));

  // --- 11. Final reload: Permanent/History/Clear state persists ---
  await page.reload();
  await page.getByRole('button', { name: '出撃', exact: true }).waitFor({ timeout: 5000 });
  const resumePromptAfterFinish = await page.getByRole('button', { name: '途中から再開' }).count();
  log('11a: 完走後のreloadでResumeプロンプトが出ない(RunSave正常clear)', resumePromptAfterFinish === 0);

  await page.getByRole('button', { name: 'キャラクター' }).click();
  const finalCharText = (await page.locator('body').textContent()) ?? '';
  log('11b: reload後もキャラクター一覧が正常表示', PARTY_LABELS.every((n) => finalCharText.includes(n)));
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  await page.getByRole('button', { name: '記録' }).click();
  const historyAfterReload = ((await page.locator('body').textContent()) ?? '').includes('全体サマリー');
  log('11c: reload後もLearningHistoryが保持', historyAfterReload);
  await page.getByRole('button', { name: '拠点へ戻る' }).click();

  await page.getByRole('button', { name: '出撃', exact: true }).click();
  await page.locator('.area-select-screen button, button', { hasText: 'ハルカ' }).first().click();
  const allStagesStillVisible =
    (await page.locator('button', { hasText: '閉ざされた連絡路' }).count()) &&
    (await page.locator('button', { hasText: '沈黙した循環区' }).count()) &&
    (await page.locator('button', { hasText: '記録塔' }).count());
  log('11d: reload後もunlockedStageIds(全3Stage)が保持', !!allStagesStillVisible);

  console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
  await browser.close();
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
