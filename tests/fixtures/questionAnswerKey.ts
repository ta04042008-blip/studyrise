/**
 * Shared answer key for the MVP-10 official 50-question bank
 * (src/data/questions/sampleQuestions.ts), for tests that drive the real
 * departure flow (full 数学/英語 subject selection) rather than the
 * `createSampleStageLaunchConfig` dev/test factory's small 5-question
 * core. Keeping this in one place avoids duplicating the full answer key
 * across every such test file.
 */
export const FULL_QUESTION_ANSWER_KEY: Record<string, number> = {
  // 数学
  '7 + 5 は？': 2,
  '9 × 6 は？': 1,
  '縦4cm、横5cmの長方形の面積は？': 1,
  '12 - 5 は？': 1,
  '6 × 7 は？': 2,
  '次のうち偶数はどれ？': 2,
  '直角は何度？': 2,
  '3.2 + 1.5 は？': 1,
  '1/2 + 1/4 は？': 2,
  '1辺6cmの正方形の周の長さは？': 2,
  '50人の20%は何人？': 1,
  '3 + 4 × 2 の答えは？': 0,
  '縦2cm、横3cm、高さ4cmの直方体の体積は？': 2,
  '3回のテストが80点、70点、90点のとき、平均点は？': 2,
  'りんご3個とみかん5個の個数の比を最も簡単な整数の比で表すと？': 0,
  '定価800円の品物を2割引きで買うと、支払う金額は？': 3,
  'x = 3 のとき、2x + 5 の値は？': 3,
  '底辺8cm、高さ5cmの三角形の面積は？': 1,
  '時速60kmで2.5時間走ると、進む距離は？': 2,
  'x + 7 = 15 のとき、x の値は？': 2,
  '原価1000円の品物に3割の利益を加えて定価をつけ、その定価から2割引きで売ったときの売価は？': 1,
  '2つの数の和が20、差が4のとき、大きい数は？': 2,
  '縦10cm、横10cmの正方形の中から半径5cmの円を1つ切り取った残りの面積は何cm²？(円周率3.14)': 2,
  'Aさんは時速4kmで歩き、1時間30分でB地点に着いた。同じ道をCさんが時速6kmで歩くと何分かかる？': 2,
  'クラス40人のうち、男子と女子の人数の比は3:5である。女子の人数は？': 3,
  // 英語
  '"apple" の意味は？': 0,
  '"library" の意味は？': 1,
  '"dog" の意味は？': 0,
  '"book" の意味は？': 2,
  '"red" の意味は？': 1,
  'I ___ a student. に入る語は？': 0,
  '"apple" の正しい複数形は？': 0,
  'She ___ to school every day. に入る語は？': 1,
  '"school" の意味は？': 0,
  '"Do you like apples?" に対する自然な返答は？': 0,
  'Yesterday, I ___ to the park. に入る語は？': 2,
  'This book is ___ than that one. (interesting) に入る語は？': 1,
  '"He is tired because he studied all night." の意味として正しいものは？': 0,
  '"big" の反対の意味を持つ語は？': 0,
  'We ___ visit Japan next year. に入る語は？': 0,
  'I ___ never seen that movie. に入る語は？': 0,
  '"Although it was raining, she went outside without an umbrella." から分かることは？': 0,
  'The man ___ is standing there is my teacher. に入る語は？': 0,
  '"Turn right at the corner." の right の意味は？': 1,
  'This song ___ written by a famous singer. に入る語は？': 1,
  '"Even though he failed the first time, he kept practicing and finally succeeded." が伝える教訓に最も近いものは？': 0,
  'If I ___ more time, I would travel abroad. に入る語は？': 1,
  'The letter ___ in French was difficult to read. に入る語は？': 2,
  '"She whispered so that no one else could hear." から分かる話し方は？': 1,
  'Of the three books, this one is ___ interesting. に入る語は？': 2,
};
