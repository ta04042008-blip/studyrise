# StudyRise 正式仕様書 v0.11

基準日: 2026-09-30  
状態: 新StudyRiseの開発用正本  
対象: MVP設計〜今後の拡張基盤

> この文書は新StudyRiseのゲーム仕様の正本である。  
> 旧StudyRiseのコード、仕様、画面、資産、ステータス体系は参照元としない。  
> 本書に書かれていないゲーム性は、実装都合だけで独自追加・変更しない。

---

## 1. ゲームの核

StudyRiseは、学習問題への回答を戦闘行動へ結び付けた、ステージ制ローグライトRPGである。

基本ループ:

1. 拠点で準備
2. エリア・ステージを選択
3. 出題範囲を設定
4. ステージへ出撃
5. 10ゾーンを連続攻略
6. 各ゾーンで戦闘
7. ゾーンクリアごとにローグライト報酬を選択
8. Zone 10のボスを撃破して1周踏破
9. 「次の周回へ」ならZone 1へ戻り、敵を強化してRunを継続
10. 「帰還」または敗北でStage Resultへ進み、恒久成長を確定
11. 1周以上踏破済みならStage Clear実績・次Stage解放を成立させる

---

## 2. 世界・進行構造

### 2.1 階層

正式な階層は以下とする。

`エリア > ステージ > ゾーン`

- エリアは複数ステージを含む。
- ステージは複数ゾーンを含む。
- 正式ステージのゾーン数は一律10。
- `ゾーン = 敵編成` とする。
- ゾーン内の全敵を倒すとゾーンクリア。
- 各ステージにはボスがちょうど1体存在する。
- ボスは必ず最終ゾーンに配置する。
- 最終ゾーンには通常敵を同時配置してよい。
- 最終ゾーン以外にボスを配置しない。
- エリア最終ステージのボス撃破でエリアクリア。

`formation` など、ゾーンと敵編成の間に追加階層を設けない。

### 2.2 エリア進行

- 基本は直線的な進行。
- 一部で分岐エリアを設けられる。
- 分岐エリア同士は任意順で攻略可能。
- 後続の主要エリアに複数分岐エリアのクリアを要求できる。
- エリアクリア後の高難度・無限系・特殊コンテンツは将来のやり込み要素とする。
- エリアは `AreaDefinition` としてデータ駆動で定義する。
- MVP-10時点では第1エリア内の直線的Stage解放（Stage1→Stage2→Stage3）とクリア状態管理を実装済み。分岐エリアは未実装。

`AreaDefinition` の最低限の構造:

- `id`
- `name`
- `stageIds`

### 2.3 ステージクリア / 周回

正式ステージは1周10ゾーンとする。

Zone 10の全敵を撃破し、出撃中キャラクター全員分のゾーン報酬を確定した時点で「1周踏破」とする。
1周踏破だけではRunを強制終了しない。

Zone 10報酬確定後:

1. `completedLaps` を1増やす
2. 「次の周回へ」または「帰還する」を選択
3. 「次の周回へ」の場合、同じStageのZone 1へ戻る
4. HP / RunBuild / 持ち込みアイテム残数を維持する
5. 次周の敵を強化する
6. 「帰還する」の場合、Stage Resultへ進む

敵強化は線形とし、全Enemy BaseStatsへ以下を適用する。

`multiplier = 1 + completedLaps × 0.20`

- 1周目: 100%
- 2周目: 120%
- 3周目: 140%
- 以降も1周ごとに+20%
- `attack / defense / speed / maxHp` をそれぞれceilで整数化
- EnemyDefinition自体は変更せず、その戦闘用instance解決時だけ補正する

1周以上踏破したRunは、その後に自主帰還または敗北してもStage Clear実績を成立させる。
初回Stage Clear / 次Stage解放はStage Resultを拠点へ確定する時点で反映する。

### 2.4 再挑戦

クリア済みステージは再挑戦可能。

- 必ずZone 1から開始。
- 初回報酬は再取得不可。
- ストーリー初回イベントは再実行しない。
- 通常経験値、通貨、素材、装備、周回クリア報酬は取得可能。

### 2.5 自主帰還

- ゾーンとゾーンの間でのみ自主帰還可能。
- 0周のまま帰還した場合はステージ未クリア扱い。
- 1周以上踏破済みならStage Clear実績は保持する。
- 次回の新規出撃はZone 1・1周目から開始。
- その挑戦で得た経験値、通常通貨、素材、装備は保持。
- ローグライト一時強化はすべて消滅。

### 2.6 敗北

- 即時Stage Resultへ進む。
- 0周のまま敗北した場合はステージ未クリア。
- 1周以上踏破済みならStage Clear実績は保持する。
- 次回の新規出撃はZone 1・1周目から開始。
- 経験値は保持。
- 取得済み装備は保持。
- 既存の拠点資産は失わない。
- その挑戦中に得た基本通貨・通常素材の一部を失う。
- ローグライト一時強化はすべて消滅。
- 将来、演出用の特殊敗北イベントを別処理として追加可能。


### 2.7 ステージ内進行

ステージ攻略中の基本フロー:

`Zone Battle → Zone Reward → Zone間選択 → 次Zone Battle`

Zone 10:

`Boss Battle → Zone Reward → 周回間選択 → (次周Zone 1 / Stage Result)`

- BattleEngineは1ゾーンの戦闘のみを担当する。
- RogueliteEngineはゾーンクリア報酬のみを担当する。
- StageEngineは複数ゾーン、現在ゾーン、最終ゾーン判定、ステージ終了条件を担当する。
- 自主帰還はゾーン報酬確定後から次ゾーン開始前の間だけ選択可能。
- 敗北時は即座にステージ攻略を終了する。
- 新規出撃・再挑戦時は必ずZone 1・1周目から開始する。

### 2.8 ステージ・ゾーンデータ

Stage / Zone / 敵配置はデータ駆動とする。

StageDefinitionは最低限以下を持つ。

- `id`
- `name`
- `zones`

ZoneDefinitionは最低限以下を持つ。

- `id`
- `enemies`
- `isRareRewardEvent`
- `isFinalZone`

敵配置はコンテンツ定義IDと戦闘インスタンスIDを分離する。

- `enemyDefinitionId`: 敵種を示す安定したコンテンツID
- `instanceId`: そのゾーン戦闘内の個体ID

同一種類の敵を同じゾーンへ複数配置可能。

有効なStageDefinitionは以下を満たす。

- ゾーンはちょうど10個。
- Zone IDはStage内で一意。
- 各Zoneに敵が1体以上。
- 各Zone内のinstanceIdは一意。
- enemyDefinitionIdが実在。
- `isFinalZone=true` はちょうど1Zone。
- Final Zoneはzones配列の最後。
- Stage全体のBossはちょうど1体。
- BossはFinal Zone内。
- Final Zone以外にBossを配置しない。

無効なStageDefinitionはロード対象から除外し、アプリ全体をクラッシュさせない。

---

## 3. 拠点

拠点はステージ攻略の準備と、将来の恒久成長機能へ接続するホーム画面である。

### 3.1 拠点ホーム方式

- 自由歩行は行わない。
- 1枚の正式な拠点背景を画面全面に表示する。
- 現在保存されているパーティの先頭キャラクターを拠点中央に表示する。
- 拠点の主要機能は背景上のホットスポットではなく、固定ナビゲーションから開く。
- iPhone縦画面とiPad横画面の両方で操作可能にする。
- 将来、自由歩行型に拡張可能な構造にする。
- 旧StudyRiseの拠点UI・資産は流用しない。

### 3.2 主要機能

拠点ホームの正式ナビゲーションは6項目。

- 出撃
- 仲間
- 編成
- 装備
- 持ち物
- 記録

「仲間」は既存のキャラクター一覧へ接続する。
拠点背景そのものには主要機能のホットスポットを配置しない。

### 3.3 出撃導線

正式導線:

`拠点 → エリア選択 → ステージ選択 → 出撃準備 → 出撃確認 → ステージ開始`

エリアが1件だけの場合も、MVP-6ではArea Selectを省略せず、正式階層を維持する。

出撃準備で設定・確認するもの:

1. パーティ
2. 装備確認
3. 持ち込みアイテム
4. 出題範囲

### 3.4 編成

- パーティは1〜3人。
- 0人では出撃不可。
- 4人以上も出撃不可。
- パーティ配列順を戦闘参加順として扱う。
- 拠点ホームの「編成」と出撃準備内の「編成」は同一の編成UIを再利用可能な構造にする。
- 編成の確定操作は「パーティを保存」とし、選択したキャラクターIDを順序付きでPermanentSaveへ保存する。
- 保存済みパーティがある場合、次回の出撃導線ではその編成を初期パーティとして再利用する。
- 拠点中央に表示するキャラクターは保存済みパーティの先頭とする。
- 旧Saveで保存済みパーティ情報が存在しない場合は互換読込を維持し、出撃パーティを暗黙確定しない。
- ステージ開始後はパーティ固定。

### 3.5 キャラクター画面

MVP-6でプレイヤー向けに表示する最低限の情報:

- 名前
- HP
- 学力
- 忍耐力
- 思考速度
- MP
- 初期スペル

`additionalSpellPoolIds` などの内部IDをユーザー画面へ直接表示しない。

まだ実装されていない情報は捏造しない。

### 3.6 装備画面

MVP-6では装備本体は未実装。

- 拠点ホームから「装備」画面へ遷移可能。
- 内容はプレースホルダー。
- 出撃準備には「装備確認」を表示するが、編集不可。
- 装備未実装であることは出撃を妨げない。
- 装備の取得・装備変更・強化・分解・性能反映はMVP-7以降。

### 3.7 持ち物・持ち込みアイテム

恒久InventoryはMVP-6では実装しない。

出撃準備では持ち込みアイテム3枠を持つ。

`battleItemSlots: [itemId | null, itemId | null, itemId | null]`

- 各枠は空欄可。
- MVP-6では一時的な出撃用アイテムカタログから選択する。
- これは恒久Inventoryではない。
- 永久所持数、購入、売却、通貨連携、Stage終了後の在庫増減は未実装。
- Stage開始時に選択された3枠をRun側へ渡す。
- 拠点の「持ち物」画面本体はMVP-6ではプレースホルダー。

### 3.8 記録

- 拠点ホームから「記録」画面へ遷移可能。
- MVP-6では導線・プレースホルダーのみ。
- 学習履歴データの保存・集計・表示はMVP-8。

### 3.9 Base / Stage境界

拠点側はゲーム計算を担当しない。

Base側が保持するのは、出撃準備に必要なUI状態を中心とする。

- 現在画面
- 選択Area
- 選択Stage
- PartySelection
- QuestionScopeSelection
- BattleItemSlots
- DepartureDraft

Stage開始時は、必要な入力をすべて確定した `StageLaunchConfig` を作り、Stage側へ渡す。

`StageLaunchConfig` は必須入力とし、本番コードで不足項目をsample値へ暗黙fallbackしない。

責務:

- Base: 画面遷移と出撃準備
- StageSessionScreen: BaseとStageのUI境界
- StageController: Stage進行
- StageEngine: 複数Zoneのゲーム進行
- BattleEngine: 1Zone戦闘
- RogueliteEngine: Zone報酬

React Hooksは条件付きで呼ばない。
`IN_STAGE` のときだけStage用コンポーネントをマウントし、そのコンポーネント内部でStage Hookを通常通り呼ぶ。

### 3.10 ステージ終了後

Stage Resultから「拠点へ戻る」を選択可能にする。

- Stage Clear
- Defeat
- Self Return

すべてBase Homeへ帰還できる。

再挑戦用の開発用導線を残すことは可能だが、通常導線は拠点帰還とする。

---

## 4. キャラクター

### 4.1 パーティ

- 1〜3人。
- 最大3人が同時戦闘。
- MVPでは控え・戦闘中交代なし。
- ステージ中は編成固定。

### 4.2 正式ステータス

UI表示名:

- HP
- 学力
- 忍耐力
- 思考速度

内部キー:

- `hp`
- `attack`
- `defense`
- `speed`

MPは正式ステータスから廃止する。既存SaveにMP値が残る場合は互換読込時に無視し、新規保存へゲーム状態として引き継がない。

### 4.3 キャラクター構成

各キャラクターは以下を持つ。

- 基本情報
- 基礎ステータス
- ステータス成長
- 固有スキル1つ
- 初期スペル1つ
- 追加スペルプール
- 特殊確率補正
- 戦闘傾向タグ
- 装備条件
- 解放条件

### 4.4 固有スキル

「スキル」はキャラクター固有のパッシブ能力を指す。

MVP-10完成時点では固有スキル発動システムは未実装。
《再検証》《即断》《解析癖》は世界観資料上の候補であり、正式なゲーム効果としてはまだ採用しない。

- 原則1キャラクター1つ。
- 常時発動、または条件付き自動発動のみ。
- 手動使用不可。
- MP消費なし。
- 問題回答なし。
- ローグライト報酬で取得・変更・強化しない。
- 他キャラクターへ付け替え不可。

利用可能な発動契機の例:

- 常時
- ゾーン開始
- 自分の行動開始/終了
- アタック成功
- ガード成功
- チャージ成功
- サーチ成功
- スペル使用
- クリティカル
- 被ダメージ
- HP条件
- 味方KO
- 敵KO
- 敵複数
- ボス戦

条件付きスキル発動時は短い専用表示を出す。
常時効果は毎行動表示しない。

### 4.5 スペル

「スペル」は、連続問題への回答によって発動効果を準備し、使用者の次回行動開始時に自動発動する能動技を指す。

- MPは使用しない。
- プレイヤーが自分の行動でスペルを手動選択する。
- スペル選択後は教科のみ選択し、★はプレイヤーが選択しない。
- 基本出題数は5問。
- 5問それぞれの内容・難易度構成・出題条件はスペルごとに定義できる。
- 5問への回答中は、そのキャラクターは別の戦闘行動を行わない。
- 5問終了時点ではスペル効果を適用せず、正答数と選択済みスペルを「発動待ち」として保持してそのターンを終了する。
- 発動待ちのキャラクターの次回行動開始時、コマンド選択より前にスペルを自動発動する。
- 自動発動はその次回行動を消費する。発動後、そのキャラクターの次の通常行動機会へ進む。
- 0/5正解は完全失敗。次回行動時に失敗演出のみ行い、ダメージ・回復・バフ等の効果は一切発生しない。
- 1〜5問正解は正答数に対応する5段階の発動効果を持つ。
- スペルLvと今回の正答数は別軸で扱う。最終効果は「スペルLv × 正答数」に対応するSpellDefinition側のデータで定義する。
- 5/5正解でもスペルLvが異なれば効果は異なり得る。
- 準備中・発動待ち状態は敵から攻撃を受けても解除しない。
- 対象種別はスペルごとに設定する。
- 各キャラクターはステージ開始時に初期スペルLv1を1つ所持。
- ローグライト中に最大3スペルまで増加。
- 3枠埋まった後、新規スペル報酬は出現しない。
- スペルの入れ替えは行わない。
- スペル強化上限はスペルごとに設定。
- 最大Lv到達後、そのスペルの強化候補は出現しない。
- ステージ終了時、追加スペルと強化Lvは消滅し、初期スペルLv1へ戻る。

### 4.6 スキルとスペルの区別

| 項目 | スキル | スペル |
|---|---|---|
| 役割 | 固有パッシブ | 能動技 |
| 手動使用 | 不可 | 可 |
| MP | 不要 | 不要（MP自体を廃止） |
| 問題回答 | 不要 | 5問連続（基本） |
| ローグライト取得 | なし | あり |
| ステージ終了後 | 残る | 追加・強化リセット |

敵にも同じ概念を使用する。
敵スキルは常時/自動能力、敵スペルは能動特殊行動。
敵はMPを使用しない。

---

## 5. 戦闘

### 5.1 基本コマンド

正式コマンドは5つ。チャージは廃止する。

1. アタック
2. ガード
3. サーチ
4. スペル
5. アイテム

問題回答が必要:

- アタック
- ガード
- サーチ
- スペル（基本5問の連続問題）

問題回答不要:

- アイテム
- ステージ
- ゾーン
- 敵配置

### 5.2 行動順

- 思考速度を使った内部アクションゲージ/タイムライン方式。
- 味方・敵を同一の連続タイムライン上で扱う。
- 行動者はプレイヤーが任意に選ばず、タイムラインによって決定する。
- 高速キャラクター・敵は、低速キャラクターが1回行動する前に複数回行動し得る。
- ゲージそのものはUIに表示しない。
- UIには現在の行動者と今後の行動順を表示する。
- 今後の行動順表示は実際の行動順と一致させ、表示計算によって本番の乱数状態やタイムライン状態を進めない。
- 同時到達時は思考速度が高い方を先にする。
- 完全同値時はランダム。
- ゾーン開始ごとに行動タイムラインを初期化する。
- 戦闘中にKOが発生した場合、KOしたアクターだけを行動順から除外し、生存中アクターがそれまで蓄積したゲージは保持する。

### 5.3 プレイヤー行動フロー

問題コマンド:

`コマンド → 対象 → 教科+★ → 問題 → 回答 → コマンド演出 → 戦闘結果反映 → 正誤判定 → 解説 → 次へ`

スペル・アイテム:

`コマンド → 対象/選択 → 条件確認 → 即時処理`

対象選択ルール:

- 選択可能対象が複数いる場合のみ、対象選択UIを表示する。
- 選択可能対象が1体だけの場合は自動決定して対象選択UIを省略できる。
- アタックとサーチは生存中の敵1体を対象とする。
- ガードは使用者自身が対象であり、対象選択を行わない。
- スペル・アイテムは各データの対象種別に従う。
- KO済みアクターは通常の対象候補から除外する。

### 5.4 問題表示後

問題が表示された後は以下を変更不可。

- コマンド
- 対象
- 教科
- ★
- 問題

必ず回答または「わからない」で完了する。

### 5.5 正誤とコマンド結果

正解時のみコマンド成功。

不正解/わからない:

- アタック: ダメージ0
- ガード: 付与なし
- サーチ: 情報取得なし

失敗時も専用演出を出す。

### 5.6 アタック

- 複数敵時、対象をプレイヤーが選択。
- キャラクター固有のアタック派生を将来許可。
- 基本ダメージ式:

`finalDamage = (学力 - 忍耐力) × attackSpecificMultiplier × starModifier × randomModifier × criticalModifier`

- 最低ダメージ保障を持つ。
- ダメージ乱数の現行基準: 0.90〜1.10。
- クリティカルの現行基準: 4%、1.5倍。
- これらはバランス調整可能な設定値とする。

### 5.7 ガード

- 問題成功で付与。
- 次の敵攻撃1回を軽減した後に解除。
- ★により軽減性能を補正。
- ガード大成功を独立抽選可能。
- ガード大成功の現行基準確率は5%。
- 大成功時は通常のガード軽減率に20 percentage pointsを加算する。
- 最終ダメージ軽減率の上限は90%。
- 将来、複数回防御・複数ターン防御を実装可能。

現行の調整基準:
- ★1: 20%（大成功時40%）
- ★2: 30%（大成功時50%）
- ★3: 40%（大成功時60%）
- ★4: 50%（大成功時70%）
- ★5: 60%（大成功時80%）

数値はバランス設定として変更可能。

### 5.8 スペル準備と自動発動

スペル選択ターン:

`スペル選択 → 対象確定（必要時） → 教科選択 → [問題 → 回答 → 正誤・解説 → 次の問題] ×5 → 正答数確定 → 発動待ち保存 → ターン終了`

- ★選択UIは表示しない。
- 各問題の★はSpellDefinitionの問題構成ルールから決定する。
- 教科選択では、そのスペルの5問構成に必要な★が現在の出題範囲内にすべて存在する教科だけを候補にする。
- 候補教科が0件の場合は条件を勝手に広げず、スペル準備をキャンセルしてコマンド選択へ戻れる。
- 教科確定後、5問の途中で別コマンドへ変更できない。
- 5問それぞれの回答確定後に正誤・正答・解説を表示し、「次の問題へ」で次問へ進む。5問目は解説確認後に発動待ちへ移行する。
- 各回答は通常の問題回答と同様に確定し、再回答できない。
- 「わからない」は不正解として正答数に加算しない。
- 5問終了後の正答数0〜5を保存する。

次回行動:

`行動開始 → 発動待ち確認 → スペル自動発動/完全失敗 → 効果適用 → 発動待ち解除 → 行動終了`

- 発動待ちがある場合、通常コマンド選択は行わない。
- 0問正解でも同じタイミングで失敗処理を行い、その行動を消費する。
- KO等により行動不能の間は自動発動しない。再び行動可能になった最初の自己行動開始時に処理する。

### 5.9 サーチ

- 敵1体を対象。
- 問題成功時のみ有効。
- 現在ゾーン内のみ有効。
- 同じ敵に再使用した場合は上書き。
- 敵AIの予定変更に追従して表示も更新。
- 敵が1回行動するごとに表示可能行動数を1消費。
- 表示するのは「行動名 + 対象」。
- 詳細威力、内部倍率、状態異常成功率などは表示しない。

★ごとの表示数:

- ★1: 2行動
- ★2: 3行動
- ★3: 4行動
- ★4: 6行動
- ★5: 8行動

サーチで見えた行動は図鑑上の「観測済み行動」として扱う。

- サーチ表示は、敵が実際に今後実行する予定行動列そのものを参照する。
- サーチ用表示と実際の敵行動を別々の抽選・別々のAI判定で生成しない。
- 予定行動には行動名と対象を含める。
- 予定対象がKOするなどして実行不能になった場合は、敵AIが予定を再計画し、サーチ表示も同じ新予定へ更新する。

### 5.10 アイテム

- 問題回答なし。
- 持ち込み3枠。
- 対象ルールはアイテムごとに設定。
- 使用時に消費。
- 未使用分は帰還時に所持品へ戻る。

### 5.11 特殊確率

- クリティカル
- ガード大成功

は独立した確率として扱う。

UIには原則正確な確率を数値表示せず、必要に応じて
`↑ / ↑↑ / ↓ / ↓↓`
で傾向表示する。

---

## 6. 敵・AI

### 6.1 敵行動

敵は複数の以下を持てる。

- アタック
- ガード
- スペル
- 固有スキル

### 6.2 AI

敵ごとに戦略差を持たせる。

例:

- 攻撃重視
- 防御重視
- 条件付き
- HPフェーズ
- 特定対象優先
- 低HP狙い
- 高学力狙い
- MP保有者狙い
- ランダム
- ボス専用

敵スペルはMP/使用回数を基本的に持たないが、AI上の優先度・条件で乱用を防ぐ。

### 6.3 予告

通常行動はサーチなしでは非表示。

強力なスペル/ボス大技は事前予告を持てる。
予告時も正確なダメージ量までは表示しない。

---

## 7. 状態異常・バフ・デバフ

### 7.1 基本

各効果は個別に持続方式を設定可能。

例:

- ターン
- 行動回数
- 被弾回数
- 条件成立まで
- ゾーン終了まで

### 7.2 状態異常

- 個別の付与成功率を持てる。
- 使用者補正、対象耐性、装備、ボス耐性などを反映可能。
- ボスは原則「完全無効」より「耐性」で対応。
- 特殊な完全無効は例外的に許可。
- 同じ状態異常は原則スタックしない。
- 再付与は基本的に持続更新。
- 特殊例外のみスタック可。

### 7.3 バフ・デバフ

- 原則、命中確率判定なし。
- 効果が成立すれば付与。

### 7.4 MVP初期候補

- 毒
- スタン
- 学力アップ/ダウン
- 忍耐力アップ/ダウン
- 思考速度アップ/ダウン

---

## 8. KO・ゾーン間状態

- HP 0でKO。
- KO中はそのゾーンで行動不可。
- KOしたアクターは行動順から除外する。
- KO発生時に生存中アクターの行動ゲージをリセットしない。
- 味方の一部だけがKOしている場合は戦闘を継続する。
- 敵全員がKOしたら勝利。
- 味方全員がKOしたら敗北。
- 問題コマンドで最後の敵をKOした場合も、`戦闘結果反映 → 正誤判定 → 解説 → 次へ` を完了してから勝利画面へ進む。
- 敵行動によって味方全員がKOした場合は、その時点で敗北へ進む。
- ゾーン終了時、KOキャラクターは次ゾーン開始前に自動復帰する。
- KO復帰HPのMVP基準は、そのキャラクターの一時強化を含む有効最大HPの30%。
- 復帰HPは `ceil(effectiveMaxHp × 0.30)` とし、最低1HP。
- KO復帰率は設定値として変更可能にする。
- 生存者のHPは回復させず、そのまま次ゾーンへ持ち越す。
- 発動待ちスペルはゾーン間へ持ち越さず、ゾーン開始時に解除する。
- 状態異常、バフ、デバフ、ガード、一時戦闘効果はゾーン間で消去。
- 行動タイムラインもゾーン開始時に再計算。

---

## 9. ローグライト

### 9.1 ゾーンクリア報酬

各ゾーンクリア後、出撃中の各キャラクターに1回ずつ報酬選択を行う。

3人編成の例:

`キャラクター1の報酬選択 → 確定 → キャラクター2の報酬選択 → 確定 → キャラクター3の報酬選択 → 確定 → 報酬フェーズ終了`

- 1〜2人編成でも、出撃中の全キャラクターに1回ずつ報酬を付与する。
- KO中のキャラクターも報酬選択対象。
- キャラクター自体を報酬候補生成時に抽選しない。
- 現在の `targetCharacterId` を固定し、そのキャラクターに有効な報酬だけから候補を生成する。
- 全キャラクターの報酬確定後にのみ次ゾーンへ進める。

通常:
- 各キャラクターごとに3候補から1つ。

希少報酬イベント:
- 各キャラクターごとに4候補から1つ。
- 希少報酬イベントの発生条件・頻度はステージ/ゾーン側の将来仕様とし、MVP-4では外部フラグ `isRareRewardEvent` で指定可能な構造にする。
- 希少報酬イベントと高レアリティ候補は別概念とする。

### 9.2 リロール

- 無料リロールは、各キャラクターの報酬選択につき1回。
- 使用時、そのキャラクターの現在候補をすべて入れ替える。
- リロール前の候補へ戻れない。
- 可能な限りリロール前と同一の候補内容を再登場させない。
- 候補プール不足時のみ最終フォールバックとして重複を許可できる。
- 報酬確定後はリロール不可。
- スキップ不可。

### 9.3 報酬分類

1. 新規スペル
2. 既存スペル強化
3. 基本コマンド強化
4. 一時ステータス強化
5. 回復・特殊効果

固有スキルはローグライト報酬に含めない。

### 9.4 RewardPhaseSession

報酬フェーズはパーティ単位の `RewardPhaseSession` で管理する。

基本状態:

- `characterOrder`
- `currentCharacterIndex`
- 現在対象の `targetCharacterId`
- 現在キャラクター用の `RewardSession`

流れ:

`候補生成 → カード選択 → 決定 → LOCKED_IN → apply → APPLIED → 次キャラクター`

最後のキャラクターまで適用後、報酬フェーズ完了。

確定後の二重タップ、再リロール、別カード選択などは no-op とする。

### 9.5 レアリティ

5段階:

- ノーマル
- アンコモン
- レア
- エピック
- レジェンダリー

現行基準:

- 50%
- 28%
- 14%
- 6%
- 2%

- 確率は設定値として調整可能。
- 候補スロットごとに独立抽選する。
- 問題★は報酬レアリティに影響しない。
- キャラクター、シナジー、カテゴリ重みはレアリティ確率そのものを変更しない。
- MVP-4ではレアリティと具体的効果量の対応ルールは未確定。独自に効果量をスケールさせない。

### 9.6 候補生成

対象キャラクターを固定した状態で、概ね以下の順で候補を生成する。

1. そのキャラクターに有効な報酬を列挙
2. 最大強化到達済み報酬を除外
3. スペル3枠満杯なら新規スペルを除外
4. レアリティ抽選
5. 報酬カテゴリ抽選
6. 軽いシナジー補正
7. 報酬内容抽選

カテゴリ基本重みはMVP基準で各 `1.0`。

無効カテゴリを除外後、残りカテゴリで正規化する。

スペル3枠満杯時:
- `NEW_SPELL` を除外
- `SPELL_UPGRADE` のカテゴリ重みを `×1.20`

同一オファー内で、同一キャラクターかつ実質同一内容の報酬カードは原則重複させない。

### 9.7 シナジー補正

現在ビルドに直接つながる候補を少しだけ出しやすくしてよい。

MVP基準:

- 既に所持するスペルの強化
- 既に強化中の同じ基本コマンド

などに最大 `×1.15`。

- 補正は同一候補に複数回重ね掛けしない。
- 最大 `×1.15`。
- レアリティ確率は変更しない。
- 強い誘導は行わず、他候補も常に出現し得る状態を維持する。

### 9.8 スペル報酬

各キャラクターは:

- 初期スペル1つ
- キャラクター固有の `additionalSpellPoolIds`

を持つ。

新規スペル候補:
- そのキャラクターの `additionalSpellPoolIds` からのみ生成。
- 既に所持しているスペルは除外。
- Run中に所持できるスペルは最大3つ。
- 3枠満杯なら新規スペル候補を除外。

スペル強化:
- 所持中スペルのみ対象。
- 各 `SpellDefinition` が個別の `maxLevel` を持つ。
- 最大Lv到達後は強化候補から除外。
- MVPサンプルスペルの基準 `maxLevel` は3。
- レベルごとの具体効果は `SpellDefinition` 側のレベルデータで管理し、RogueliteEngineへ戦闘計算を埋め込まない。

複数スペル所持時:
- スペル使用時にスペル選択を行う。
- 使用可能スペルが1つだけの場合もスペル選択画面を表示し、効果・現在Lvを確認してから選択する。

### 9.9 基本コマンド強化

MVP基準では最大3段階。

アタック:
- 1段階につき最終ダメージ `+10%`

ガード:
- 1段階につき軽減率 `+5 percentage points`
- 最終軽減率90%上限を維持

サーチ:
- 1段階につき未来行動表示数 `+1`

これらはすべて設定値として管理する。

### 9.10 一時ステータス強化

MVP基準では最大3段階。

- HP: `+10 / 段階`
- 学力: `+5 / 段階`
- 忍耐力: `+5 / 段階`
- 思考速度: `+5 / 段階`

一時ステータス強化は取得後、次ゾーンから有効。

最大HPを `+X` した場合:
- 最大HPを `+X`
- 取得時に現在HPも同じ絶対値 `+X`
- 次ゾーン開始時もその現在HPを引き継ぐ

### 9.11 回復・特殊効果

MVP-4のサンプル回復報酬:

- 最大HPの30%回復
- 即時適用

ただし「回復・特殊効果」カテゴリ全体を常に即時適用とは固定しない。
将来拡張用に適用タイミングをデータとして表現可能にする。

### 9.12 RunState / RunBuild

`RunState` と `RunBuild` を分離する。

RunBuild:
- 所持スペル
- スペルLv
- 基本コマンド一時強化
- 一時ステータス強化
- その他ローグライト一時強化

RunState:
- RunBuild
- キャラクターごとの現在HP
- 報酬フェーズ状態
- その他、ステージ挑戦中の進行状態

現在HPをRunBuildへ含めない。

### 9.13 ゾーン間引き継ぎ

次ゾーン開始時:

- 生存キャラクターの現在HPは前ゾーン終了時の値を引き継ぐ。
- 最大HP増加報酬取得時は、増加後の現在HPをそのまま引き継ぐ。
- MPは0へリセット。
- 新しい敵はそのゾーンの初期HPで開始。
- KOキャラクターの復帰HP率は別途バランス設定で確定する。未確定値を独自に決めない。

### 9.14 リセット

ステージ挑戦終了時（クリア / 自主帰還 / 敗北）に以下を全消去:

- 追加スペル
- スペルLv強化
- 基本コマンド一時強化
- 一時ステータス強化
- その他ローグライト一時効果

次回挑戦時は各キャラクターの初期スペルLv1から開始する。


---

## 10. 恒久成長

MVP-7で恒久成長システムを正式実装する。

### 10.1 PermanentState

恒久状態は `PermanentState` としてRun系状態から分離する。

最低限:

- `characters`
- `unlockedCharacterIds`
- `unlockedStageIds`
- `clearedStageIds`
- `currency`
- `materials`
- `rareUnlockResource`
- `inventory.equipment`
- `inventory.consumables`

MVP-7時点ではメモリ上のみ保持する。
IndexedDB等への永続保存はMVP-9でSaveSystemから接続する。

#### PermanentCharacterState

各キャラクターごとに最低限:

- `characterId`
- `exp`
- `level`
- `equipped.weaponInstanceId`
- `equipped.armorInstanceId`
- `equipped.accessoryInstanceId`

装備状態の単一の真実源は `PermanentCharacterState.equipped` とする。
EquipmentInstance側へ `equippedByCharacterId` を重複保持しない。

### 10.2 レベル・経験値

- キャラクターごとの個別Lv。
- Lv1開始。
- MVPではレベル上限を設けない。
- EXPは累積値として保持可能。
- 一度の報酬で複数Lv上昇可能。

次Lvまでの必要EXP:

`round(20 × level^1.35 + 10)`

基準例:

- Lv1→2: 30
- Lv2→3: 61
- Lv3→4: 98

### 10.3 ステータス成長

恒久ステータス値そのものをPermanentStateへ保存せず、

`CharacterDefinition.baseStats + Level Growth + Equipment Bonus`

から都度導出する。

成長対象:

- HP
- 学力
- 忍耐力
- 思考速度


成長プロファイルはデータ駆動とする。

#### POWER

1Lv上昇ごと:

- HP +4
- 学力 +4
- 忍耐力 +2
- 思考速度 +2

#### GUARD

1Lv上昇ごと:

- HP +7
- 学力 +2
- 忍耐力 +4
- 思考速度 +1

#### SPEED

1Lv上昇ごと:

- HP +4
- 学力 +3
- 忍耐力 +2
- 思考速度 +4

Lv1では成長加算0。

MVPサンプル:

- 主人公: POWER
- 魔法使い: SPEED
- 騎士: GUARD

既存Lv1 `baseStats` は変更しない。

### 10.4 Zone恒久報酬

ZoneDefinitionは `permanentRewardProfileId` を持てる。

StageEngineは報酬内容を解釈しない。
ProgressionSystemのみがプロファイルを解釈する。

#### NORMAL_ZONE

- 出撃キャラクター全員 EXP +20
- 基本通貨 +15
- 強化素材 +1
- 装備ドロップ抽選 15%

#### BOSS_ZONE

- 出撃キャラクター全員 EXP +40
- 基本通貨 +30
- 強化素材 +2
- 装備ドロップ抽選 50%

KO中でも、そのZoneをクリアした出撃キャラクターはEXPを得る。
非出撃キャラクターにはEXPを与えない。

### 10.5 Stage Clear恒久報酬

通常Stage Clear追加報酬:

- 基本通貨 +30
- 強化素材 +2

Stage Clearによる追加EXPはない。
EXPはZone Clear分のみ。

初回Stage Clear:

- 希少解放資源 +1
- `clearedStageIds` へstageIdを追加
- Stage unlock ruleを実行
- Character unlock ruleを実行

初回クリア報酬は再クリアでは得られない。

### 10.6 敗北・自主帰還時の恒久報酬

#### Self Return

その挑戦中に得た恒久報酬を100%保持する。

#### Defeat

保持:

- EXP 100%
- 装備ドロップ 100%
- 希少解放資源 100%
- 挑戦前から所持していた拠点資産 100%

その挑戦中に新規獲得した以下のみ30%失う:

- 基本通貨
- 通常強化素材

`loss = floor(runGain × 0.30)`

既存の拠点資産から差し引かない。

### 10.7 通貨・素材

MVP-7では3系統。

#### 基本通貨

- internal id: `currency`
- UI仮称: コイン

#### 通常強化素材

- internal id: `upgrade_material`
- UI仮称: 強化素材
- MVP-7では1種類のみ

#### 希少解放資源

- internal id: `unlock_resource`
- UI仮称: 解放結晶

将来の拡張は可能だが、MVPでは種類を増やしすぎない。

### 10.8 装備

装備枠:

- 武器
- 防具
- アクセサリー

各キャラクター1枠ずつ。

#### EquipmentDefinition

最低限:

- `id`
- `name`
- `slot`
- `rarity`
- `baseStatBonus`
- `enhancementBonusPerLevel`

MVP-7では以下を実装しない:

- specialEffects
- allowedCharacterIds
- requiredLevel
- ランダムサブステータス

slotが一致すれば全キャラクター装備可能。

#### EquipmentInstance

最低限:

- `instanceId`
- `definitionId`
- `enhancementLevel`
- `locked`

同一EquipmentDefinitionを複数所持可能。
個体はinstanceIdで区別する。

同一EquipmentInstanceを複数キャラクターへ同時装備不可。

### 10.9 装備レアリティ

共通5段階:

- NORMAL
- UNCOMMON
- RARE
- EPIC
- LEGENDARY

Rarity型は共有層へ置き、ProgressionSystemとRogueliteEngineの一方が他方へ依存しない。

装備の基礎性能はEquipmentDefinitionごとの固定値。
レアリティだけから性能を自動計算しない。

### 10.10 装備強化

強化は必ず成功。

強化上限:

- NORMAL: +5
- UNCOMMON: +7
- RARE: +10
- EPIC: +12
- LEGENDARY: +15

次に到達する強化Lvを `n` とする。

通貨コスト:

- NORMAL: `20 × n`
- UNCOMMON: `30 × n`
- RARE: `50 × n`
- EPIC: `80 × n`
- LEGENDARY: `120 × n`

強化素材コスト:

`ceil(n / 3) × rarityMultiplier`

rarityMultiplier:

- NORMAL: 1
- UNCOMMON: 1
- RARE: 2
- EPIC: 2
- LEGENDARY: 3

強化によるステータス上昇は
`EquipmentDefinition.enhancementBonusPerLevel`
を強化Lv分だけ加算する。

### 10.11 装備分解

売却と分解は一本化する。

- 通貨は得ない。
- 強化素材のみ得る。
- locked装備は分解不可。
- 装備中の装備は分解不可。
- 自動解除して分解しない。
- 複数一括分解は全件検証後にatomicに処理する。

基礎還元:

- NORMAL: 1
- UNCOMMON: 2
- RARE: 4
- EPIC: 7
- LEGENDARY: 12

追加還元:

`floor(enhancementLevel / 2)`

### 10.12 装備ドロップ

恒久装備ドロップ抽選はProgressionSystem側で行う。

Battle RNG / Roguelite RNGへ影響させない。

seed:

`deriveSeed(runSeed, zoneId, "permanent-drop")`

Zone reward profileは `equipmentDropTableId` を持てる。

DropTableはEquipmentDefinition IDとweightを持つ。

instanceId生成はゲーム乱数と分離する。
テストでは固定factory、productionでは `crypto.randomUUID()` 等を使用可能。

### 10.13 キャラクター解放

`PermanentState.unlockedCharacterIds` を真実源とする。

MVP-7対応解放条件:

- `STAGE_FIRST_CLEAR`
- `UNLOCK_RESOURCE`

以下は将来拡張:

- AREA_CLEAR
- SPECIAL_CONDITION
- STORY

既存MVPサンプルキャラクターは回帰防止のため初期解放済み。

### 10.14 ステージ解放

`PermanentState` に以下を分離して保持する。

- `unlockedStageIds`
- `clearedStageIds`

Stage解放をAreaDefinitionの配列順だけから推測しない。
データ駆動のStageUnlockRuleを使う。

MVP-7対応:

`STAGE_FIRST_CLEAR → 指定stageIdsをunlock`

分岐Area条件はまだ実装しない。

### 10.15 恒久消費アイテムInventory

`PermanentState.inventory.consumables`:

`Record<itemDefinitionId, quantity>`

出撃準備の持ち込み3枠では所有数を超えて選択不可。

同じアイテムを複数枠へ入れることは可能だが、

`選択個数 <= 所有数`

を満たす必要がある。

持ち込み3枠はStage挑戦全体で共有する。

- Zoneを跨いでも使用済みアイテムは復活しない。
- Stage終了時に使用済み個数だけPermanent Inventoryから減算。
- 未使用分は減算しない。
- Clear / Defeat / Self Returnすべて同じ消費ルール。

### 10.16 Battle投入ステータス

ProgressionSystemは `resolveCharacterForBattle()` を提供する。

解決順:

`Base Stats → Level Growth → Equipment → Stage開始 → RunBuild temporary bonuses → Battle`

BattleEngine / StageEngine / RogueliteEngineへ恒久成長計算を入れない。

### 10.17 恒久報酬の確定タイミング

恒久報酬用のledgerをRogueliteEngineのRunStateへ持たせない。

Stage終了時の事実を `StageEndContext` としてProgressionSystemへ渡す。

最低限:

- stageResult
- stage
- partyCharacterIds
- runSeed
- consumedItemCounts

Stage Result確定後、ユーザーが「拠点へ戻る」を選んだイベントで
`ProgressionSystem.reconcileStageResult()`
を1回だけ実行する。

React Effectによる暗黙確定は避ける。
StrictModeで二重付与しない構造にする。

### 10.18 MVP-7拠点UI

#### キャラクター画面

追加表示:

- Level
- 現在EXP
- 次Lvまでの必要EXP
- 恒久成長込みステータス
- 装備中武器
- 装備中防具
- 装備中アクセサリー

固有スキルはまだ実装しない。

#### 装備画面

最低限:

- 所持装備一覧
- rarity
- slot
- 現在強化Lv
- ステータス補正
- lock / unlock
- 装備
- 外す
- 強化
- 分解

#### 持ち物画面

表示:

- 消費アイテムと所持数
- 基本通貨
- 強化素材
- 解放結晶

装備管理は専用の装備画面で行い、持ち物画面に重複させない。

### 10.19 MVP開発用初期値

MVP確認用PermanentState:

- コイン: 200
- 強化素材: 10
- 解放結晶: 0
- 既存departure item catalogの各sample consumable: 3個

これは開発・動作確認用の初期値であり、正式コンテンツバランスとは分離する。

---

## 11. 報酬

### 11.1 通常獲得

- 経験値
- 基本通貨
- 強化素材
- 装備

### 11.2 ステージクリア報酬

- 基本通貨
- 強化素材
- 装備抽選等

### 11.3 初回クリア報酬

- 希少素材
- 特殊装備
- キャラクター解放
- 新機能
- 新ステージ/新エリア
- ストーリーイベント

### 11.4 ボス

ボスの特別感は恒久報酬・ステージクリア側で表現。
ボスゾーンのローグライト報酬ルールは通常ゾーンと同じ。

### 11.5 ★と報酬

問題★によって以下を上昇させない。

- 装備レアリティ
- 装備ドロップ率
- ローグライト高レア率

---

## 12. 学習システム

### 12.1 データ階層

`教科 → 分野 → 単元 → 問題`

各問題:

- ID
- 教科
- 分野
- 単元
- ★1〜5
- 問題形式
- 問題文
- 回答データ
- 正答
- 簡潔な解説
- 任意の詳細解説
- 任意の誤答別解説
- 任意の資料

#### 12.1.1 現行正式問題カタログ（2026-09-30）

本番出題プールは、2026-09-30改訂版4問題集から変換した `officialQuestions` 9,573問を正本とする。
旧MVPの50問sample bankは本番出題・出題範囲には使用せず、回帰テストおよび旧LearningHistory参照互換のためだけに保持する。

内訳:

- 数学IA: 945問
- 数学II・B: 941問
- 数学III・C: 937問
- 英語: 6,750問
- 合計: 9,573問
- 4択: 8,617問
- 正誤: 335問
- 並べ替え: 175問
- 短答入力: 446問

正式な教科→分野→単元:

- 数学
  - 数学I: 数と式 / 集合・命題 / 2次関数 / 図形と計量 / データの分析
  - 数学A: 場合の数 / 確率 / 図形の性質 / 数学と人間の活動
  - 数学II: 式と証明 / 複素数と方程式 / 図形と方程式 / 三角関数 / 指数関数・対数関数 / 微分法・積分法
  - 数学B: 数列 / 統計的な推測
  - 数学III: 分数・無理関数 / 数列の極限・無限級数 / 関数の極限・連続 / 微分法 / 積分法
  - 数学C: ベクトル / 平面上の曲線 / 複素数平面
- 英語
  - 語彙: 基本語彙 / 文脈語彙 / 語法・類義語
  - 文法・語法: 品詞・語順・文型 / 時制・完了 / 不定詞 / 動名詞 / 受動態 / 前置詞・接続詞・節 / 仮定法 / 分詞 / 分詞構文 / 助動詞 / 関係詞 / 比較 / 冠詞・代名詞 / 形容詞・副詞・語法
  - 英作文: 基本文型・和文英訳 / 語順・整序 / 接続・論理表現 / 自由英作文・論証 / 資料統合・論証
  - 英文解釈: 文型・SV把握 / 名詞節・同格 / 名詞構文 / 強調・倒置 / 因果・論理構文 / 関係詞・修飾 / 情報構造・否定・比較 / 複数文構造比較
  - 読解: 論理関係 / 内容把握・要旨 / 推論・仮説更新 / 批判的読解・評価 / 複数資料統合

利用可能な教科・分野・単元・★は、この正式QuestionDefinition群から導出する。

### 12.2 出撃前の出題範囲

- 最低2教科。
- 選択した各教科で最低1単元。
- 最大教科数・最大単元数は設けない。
- `教科 → 分野 → 単元` の階層を維持する。
- 教科単位全選択可能。
- 分野単位全選択可能。
- 単元個別ON/OFF可能。
- 検索、全選択、全解除、選択数表示を用意。
- 利用可能な教科・分野・単元はQuestionDefinitionから導出可能な構造にする。
- 出撃時は選択されたsubject / field / unitに一致する問題だけをフィルタし、Stage起動入力へ渡す。
- 選択範囲に問題が0件の場合は出撃不可。
- QuestionEngineへ拠点UI責務を持たせない。

### 12.3 ステージ中

ステージ開始後、分野・単元は変更不可。

問題コマンドごとに選択できるのは:

- 教科
- ★

のみ。

前回使った教科+★を次回の初期選択として保持するが、自動確定しない。

★1〜5は、候補問題が存在する限り常時選択可能。

### 12.4 問題抽選

指定された
`教科 + 出撃時範囲 + ★`
からランダム抽選。

軽い分散補正:

- 直前と同じ問題
- 同じ単元
- 同じ問題形式

が過度に連続しないようにする。

ただし問題プールが狭い場合は同一問題・形式・単元の連続を許可。

使わない補正:

- 正答率
- 不正解履歴
- 苦手判定
- 学習履歴
- 弱点補正

### 12.5 問題不足

条件を勝手に広げない。

候補を使い切った場合は同一条件内で再出題を許可。
候補0件の場合、その教科+★を選択不可。
候補が少ない場合は警告のみ。

### 12.6 問題形式

初期対応:

- 4択
- 正誤
- 並べ替え
- 短答入力

通常選択式は4択を標準とするが固定しない。

選択肢は原則シャッフル。
順序に意味がある問題は固定可能。

短答は正答と許容回答リストで判定する。
AIによる曖昧なその場判定を基本にしない。

### 12.7 問題画面

基本:

1. 問題情報
2. 必要なら資料
3. 問題文
4. 回答UI
5. 「回答する」
6. 「わからない」

選択肢を押しただけでは確定しない。
「回答する」で確定。
「わからない」は確認なしで即確定。

### 12.8 解説

全問題に簡潔な解説を必須。
詳細解説は任意。

解説画面:

- 問題文
- 選択肢
- 自分の回答
- 正答
- 正誤
- 簡潔な解説
- 教科
- ★
- 分野
- 単元

誤答別解説は任意。
正解時も任意で他選択肢解説を確認可能。

### 12.9 文章量基準

標準:

- 問題文: 原則120字以内
- 選択肢: 1つ40字以内
- 簡潔な解説: 200字以内

資料問題などは例外可能。
文章量で★を上げない。

### 12.10 資料問題

使用可能:

- テキスト
- 静止画像
- 図
- 表
- グラフ
- 地図
- 複数資料

使用しない:

- 音声
- 動画
- GIF等アニメーション

資料は1問最大3枚。
A/B/Cとして管理。
拡大画面では1枚ずつタブ切り替え。
問題文/選択肢との同時表示はしない。

資料拡大:

- ピンチズーム
- ドラッグ
- ダブルタップで標準倍率
- 資料切替時に倍率と位置を初期化

画像:

- WebP標準
- 必要時PNG
- JPEG/GIF/動画は原則不使用
- 原則2MB以下
- 最大5MB
- 拡大時に文字/数値/凡例等が読めること

登録時に画像存在、参照、破損、形式、容量、A〜C整合性を検証する。

### 12.11 メモ

- 問題中だけ利用可能。
- 同一問題中のみ保持。
- 電卓へ切り替えても保持。
- 問題終了時に完全破棄。
- 保存しない。
- 使用履歴を残さない。
- 過去メモ機能なし。

### 12.12 電卓

- 簡易電卓。
- 四則演算、括弧、小数、百分率等。
- 問題ごとに使用可否設定。
- 使用履歴を残さない。
- メモとの同時表示不可。

その他の辞書、公式集、ヒント、解答検索等は通常戦闘中には設けない。

---

## 13. 学習履歴

MVP-8で学習履歴システムを正式実装する。

### 13.1 LearningHistoryState

学習履歴は `PermanentState` や `RunState` へ混ぜず、
独立した `LearningHistoryState` として保持する。

基本構造:

```ts
interface LearningHistoryState {
  records: LearningHistoryRecord[];
}
```

集計値は保存しない。
常に `records` から導出する。

MVP-8時点ではメモリ上のみ保持し、
永続保存はMVP-9でSaveSystemから接続する。

### 13.2 LearningHistoryRecord

各回答確定につき1件だけ記録する。

最低限:

- `id`
- `questionId`
- `subject`
- `field`
- `unit`
- `star`
- `answerResult`
- `recordedAnswer`
- `answeredAt`

`answerResult`:

- `CORRECT`
- `INCORRECT`
- `UNKNOWN`

`recordedAnswer` は将来拡張可能な判別可能unionとする。

現行基準:

```ts
type RecordedAnswer =
  | { type: 'MULTIPLE_CHOICE'; selectedIndex: number }
  | { type: 'TRUE_FALSE'; value: boolean }
  | { type: 'ORDERING'; order: number[] }
  | { type: 'SHORT_ANSWER'; value: string }
  | { type: 'UNKNOWN' };
```

問題文、選択肢全文、正答、解説は履歴Recordへ重複保存しない。
`questionId` から正式なQuestionDefinitionを解決する。

### 13.3 記録しない情報

LearningHistoryRecordへ以下を保存しない。

- Stage ID
- Zone ID
- Battle ID
- 使用コマンド
- 使用キャラクター
- 敵
- ダメージ
- Calculator利用
- Memo内容
- Memo利用有無
- 戦闘演出情報

学習履歴とゲーム攻略履歴を混ぜない。

### 13.4 回答確定イベント

学習履歴は問題表示時点では記録しない。

記録するのは、
「回答する」または「わからない」により
回答結果が最終確定した時点のみ。

推奨境界:

`QuestionView → useBattleController → BattleEngine.submitAnswer → accepted QuestionCommandOutcome → QuestionResult → LearningHistorySystem`

QuestionEngine内部へ保存処理を追加しない。
BattleEngine内部へLearningHistoryStateを持たせない。

### 13.5 二重記録防止

1回答確定につきHistory Recordは必ず1件。

- `useEffect` による暗黙記録を行わない。
- submit直前にBattle phaseが `QUESTION` であることを確認する。
- BattleEngineが回答を受理した場合のみ履歴イベントを発行する。
- 2回目以降のsubmitはphase guardで拒否されるため記録しない。
- RESULT画面再描画、次へ連打、StrictModeで履歴が増えない構造にする。
- questionId単体をdedupe keyにしない。

同じquestionIdが後から再出題された場合、
それは別の正当な回答として別Recordを残す。

### 13.6 ID / Clock

履歴ID生成でゲーム乱数を消費しない。

`LearningHistoryIdFactory` を注入可能にする。

production例:

- `crypto.randomUUID()`

test:

- 固定/連番factory

`answeredAt` もClock / nowProviderを注入可能にする。

production:

- `Date.now()`

test:

- 固定時刻

Date.now()をUI・Controller各所へ散らさない。

### 13.7 正答率

正答率の分母:

`CORRECT + INCORRECT + UNKNOWN`

つまり全回答数。

例:

- 正解6
- 不正解3
- わからない1

→ 正答率60%

0回答時は0%。
NaN / Infinityを表示しない。

`UNKNOWN` は不正解へ統合せず、独立して表示・集計する。

### 13.8 集計

最低限:

- 総回答数
- 正解数
- 不正解数
- わからない数
- 正答率
- 教科別
- 分野別
- 単元別
- ★別

集計はLearningHistoryState.recordsから都度導出する。

最低限の集計関数:

- `summarizeAll`
- `summarizeBySubject`
- `summarizeByField`
- `summarizeByUnit`
- `summarizeByStar`
- `computeAccuracy`

### 13.9 絞り込み・並び替え

MVP-8で対応:

- 教科
- 分野
- 単元
- ★
- CORRECT / INCORRECT / UNKNOWN
- 新しい順
- 古い順

期間フィルターはMVP-8では実装しない。

未実装:

- 今日
- 週間
- 月間
- 任意日付範囲

フィルター結果をstateへ二重保存せず、
recordsからderiveする。

### 13.10 記録画面

拠点の「記録」画面を正式実装する。

構成:

#### A. 全体サマリー

- 総回答数
- 正解
- 不正解
- わからない
- 正答率

#### B. 教科別

`教科 → 分野 → 単元`

の階層で確認可能。

#### C. ★別

★1〜★5の成績を確認可能。

#### D. 履歴一覧

最低限表示:

- 教科
- 分野
- 単元
- ★
- 正解 / 不正解 / わからない
- 日時
- 問題文の短いプレビュー

#### E. 履歴詳細

履歴選択時:

- 問題全文
- 資料
- 選択肢
- 自分の回答
- 正答
- 解説

再回答機能は持たせない。

#### F. 絞り込み

13.9のフィルターと並び替えを使用可能。

### 13.11 QuestionDefinition解決

履歴詳細では、
現在のStageで絞り込まれたquestionsだけではなく、
正式な全Question catalogからquestionIdを解決する。

`LearningHistoryRecord.questionId → canonical QuestionDefinition registry`

問題Definitionが見つからない場合も画面全体をクラッシュさせない。

その場合はRecordに保存済みの:

- 教科
- 分野
- 単元
- ★
- 正誤
- 日時

を表示し、
問題詳細部分だけ安全なfallback表示とする。

### 13.12 LearningHistorySystem

担当:

- `recordAnswer`
- `summarizeAll`
- `summarizeBySubject`
- `summarizeByField`
- `summarizeByUnit`
- `summarizeByStar`
- `filterRecords`
- `sortRecords`
- `computeAccuracy`

担当しないもの:

- Battle計算
- Stage進行
- Progression計算
- 問題抽選
- Save永続化

### 13.13 MVP-8で実装しないもの

- SaveSystem
- IndexedDB
- クラウドセーブ
- 学習履歴の削除
- 履歴エクスポート
- CSV
- 高度なグラフ
- 日別/週別/月別分析
- 復習モード
- お気に入り
- 間違い問題再出題
- AI分析
- 学習アドバイス自動生成
- 問題難易度の自動変更
- 正答率による敵強さ変更
- 正答率による問題抽選補正
- 学習履歴によるローグライト報酬補正

学習成績をBattle/Rogueliteのゲームバランスへ自動反映しない。


---

## 14. 図鑑・情報開示

### 14.1 戦闘中確認

戦闘中にキャラクター/敵の詳細を開ける。
コスト・行動消費なし。
開いている間は戦闘停止。

### 14.2 プレイヤーキャラクター詳細

- HP/MP
- 学力
- 忍耐力
- 思考速度
- 状態異常/バフ/デバフ
- 特殊確率傾向
- 固有スキル
- スペル
- スペルLv/MP/条件/効果
- ローグライト強化
- 装備

### 14.3 敵情報

戦闘HUD:

- 名前
- HP
- 状態異常/バフ/デバフ
- 敵カテゴリ
- 行動順

詳細画面では解放済みの情報だけ表示。

### 14.4 観測ルール

- 敵を最低1回撃破後、詳細観測データを閲覧可能。
- 実際に見た行動、またはサーチで見えた行動のみ観測済み。
- 撃破済みなら観測済み行動の詳細効果を解放。
- 未観測行動は非表示。
- `攻撃 3/4`, `スペル 1/3` のような達成数表示は可能。
- サーチで見えた予定行動も観測済みとして扱う。

---

## 15. セーブ・復帰

MVP-9でローカルセーブ／途中復帰システムを正式実装する。

### 15.1 基本方針

- 手動セーブなし。
- 自動セーブのみ。
- MVP-9ではIndexedDBを正式採用する。
- クラウド同期・ログイン・複数端末同期はまだ実装しない。
- SaveSystemはIndexedDBの具体実装へ直接依存せず、SaveRepository interfaceを通して保存する。
- 各UIコンポーネントからIndexedDBを直接操作しない。
- autosaveはReact state全体の変化を監視するのではなく、ゲーム上の「確定イベント」から明示的に発火する。

### 15.2 Saveの分離

最低限、以下を独立させる。

1. `PermanentSave`
2. `LearningHistorySave`
3. `RunSave`

1つの巨大Saveオブジェクトへ混在させない。

各Saveは基本的にEnvelope形式:

```ts
interface SaveEnvelope<T> {
  schemaVersion: number;
  savedAt: number;
  payload: T;
}
```

`savedAt`は注入可能なClockから取得する。

IndexedDB自体のDB versionと、
ゲームSaveの`schemaVersion`は別物として扱う。

### 15.3 PermanentSave

保存対象は `PermanentState`。

最低限:

- characters
- unlockedCharacterIds
- unlockedStageIds
- clearedStageIds
- currency
- materials
- rareUnlockResource
- inventory.equipment
- inventory.consumables

装備instanceId等も保持する。

恒久ステータスの計算結果は保存せず、
通常はLevel/EXP・装備Definition等から再導出する。

### 15.4 LearningHistorySave

保存対象は `LearningHistoryState.records`。

保持:

- questionId
- subject
- field
- unit
- star
- CORRECT / INCORRECT / UNKNOWN
- recordedAnswer
- answeredAt

集計結果は保存しない。
読込後にrecordsから再導出する。

### 15.5 RunSave

Stage挑戦中だけ存在する。

最低限:

- areaId
- stageId
- Stage開始時に確定したparty snapshot
- questionScope
- initial item slot selection
- StageRunState
- live BattleEngineSnapshot
- live RewardPhaseSnapshot
- runSeed

Stage開始時に確定した戦闘投入用CharacterDefinitionは、
途中resume時にPermanentStateから再計算して変化させず、
RunSave上の確定snapshotを使用する。

### 15.6 BattleEngineSnapshot

Battle途中復帰のため、
単なるBattleStateだけでなく、次の結果へ影響するEngine内部状態も保存する。

最低限:

- BattleState
- Battle main RNG state
- Timeline RNG state
- QuestionEngine snapshot
- enemyPlannedActions
- revealedCountByEnemyId
- その他BattleEngine内部の復帰必須mutable state

`enemyPlannedActions`を`searchByEnemyId`から推測して再構築しない。

Searchで公開されている情報と、
まだ非公開のplanned actionの双方を正確に復元する。

### 15.7 QuestionEngineSnapshot

QuestionEngineの問題抽選へ影響するmutable stateを保存する。

MVP-9時点では最低限:

- `lastPicked`

`lastPicked`は次回候補プールへ影響し得るため、
reload時にリセットしない。

同一Run・同一操作列でreload有無だけが異なる場合、
将来の問題列も一致すること。

### 15.8 RandomService snapshot

MVP-9では、
「reload後に別seedで再シード」は行わない。

現在使用している乱数アルゴリズムの内部状態を保存し、
復帰後もreloadしなかった場合と同じ乱数系列を継続する。

最低限:

- Battle main RNG
- Timeline RNG
- Reward RNG

を監査・保存する。

RandomStateはアルゴリズム識別子と内部stateを持つ。

既存 `createRandomService(seed)` の乱数系列は変更しない。

### 15.9 RewardPhaseSnapshot

報酬途中状態を保存する。

最低限:

- characterOrder
- currentCharacterIndex
- current RewardSession
- candidates
- rarity
- rerollRemaining
- LOCKED_IN / APPLIED等の確定状態
- Reward RNG state
- その他次候補生成に影響するmutable state

hoverや、確定前の単なるカード選択UIは保存不要。

Reward初期候補生成直後・reroll直後・reward apply直後はautosave対象。

reloadで初回候補やreroll結果を再抽選できない。

### 15.10 Question途中復帰

QUESTION中で未回答の場合:

- 同じquestionId
- 同じ問題内容
- 同じ選択肢

へ復帰する。

回答確定前のローカルUI選択状態は保存しない。
reload後は未選択へ戻ってよい。

回答確定済みの場合は回答前へ戻さない。

EXPLANATION中は同じ確定済み結果・回答・解説状態から復帰する。

### 15.11 Checkpoint

RunSaveは3段階のcheckpointを持つ。

`run` store key:

- `live`
- `zoneStart`
- `stageStart`

#### stageStart

Stage開始時に作成し、
そのStage終了まで保持する。

#### zoneStart

各Zone開始時に更新する。

#### live

最新の確定状態で更新する。

読込優先順位:

1. live
2. zoneStart
3. stageStart
4. Runなし → Base

各checkpointは独立validationする。
liveが壊れてもzoneStart / stageStartを巻き添えで削除しない。

### 15.12 起動フロー

IndexedDB読込は非同期なので、
明示的な起動中phaseを持つ。

基本:

`BOOT_LOADING`

→ Save読込・validation・migration

RunSaveなし:
→ `BASE_HOME`

RunSaveあり:
→ `RUN_RESUME_CHOICE`

load完了前にBaseやStageを一瞬表示しない。

### 15.13 Resume / Discard

RunSaveが存在する場合、
起動時に自動で戦闘へ飛ばさない。

最低限:

- 途中から再開
- 中断データを破棄して拠点へ

の2択。

Discard時は:

- live
- zoneStart
- stageStart

のみ削除する。

PermanentSave / LearningHistorySaveは削除しない。

RunSaveが存在する間に新しいStageを開始できない導線にする。

### 15.14 RunSave clear条件

RunSave全checkpointを削除するのは以下のみ。

- Stage Clear後の恒久報酬確定・拠点帰還成功
- Defeat後の恒久報酬確定・拠点帰還成功
- Self Return後の恒久報酬確定・拠点帰還成功
- ユーザーによる明示Discard

StageResult表示中はまだRunSaveを残す。

reloadした場合も同じStageResultへ復帰し、
「拠点へ戻る」を押した時点で初めて恒久報酬を確定する。

### 15.15 Autosave確定イベント

最低限:

- Stage開始
- Zone開始
- Question生成確定
- 回答確定
- 戦闘行動確定
- 敵行動確定後のstable state
- Search結果確定
- Reward初期候補生成
- Reward reroll
- Reward apply
- Zone Clear
- Stage Result
- 装備変更
- 装備解除
- lock / unlock
- 装備強化
- 装備分解
- LearningHistory record追加
- Character / Stage unlock
- Permanent reward確定

Engineの公開操作途中では保存せず、
操作完了後のstable snapshotを保存する。

### 15.16 回答確定のatomic保存

回答確定時は、

1. BattleEngineが回答を受理
2. BattleEngineSnapshot確定
3. LearningHistoryRecord生成
4. LearningHistoryState更新
5. Run live snapshot更新

を同一atomic save batchとして保存する。

Historyだけ保存されBattleが回答前、
またはBattleだけ保存されHistoryが欠落する状態を作らない。

### 15.17 Stage終了のatomic保存

StageResult後、
ユーザーが「拠点へ戻る」を押した時だけ恒久確定する。

最低限:

1. `reconcileStageResult`
2. PermanentState確定
3. consumable使用数確定
4. unlock等確定
5. PermanentSave書込
6. LearningHistorySave最新状態を書込
7. Run live / zoneStart / stageStart 全削除

を1つのIndexedDB transactionでcommitする。

途中失敗時は全体rollbackする。

Permanentだけ更新してRunが残る、
またはRunだけ消えてPermanent報酬が失われる状態を禁止する。

既存の一回性ガードも維持する。

### 15.18 SaveRepository

SaveSystemはSaveRepository interfaceだけを見る。

Repositoryは最低限:

- load Permanent
- load LearningHistory
- load Run checkpoints
- atomic batch commit
- Run checkpoint clear

を提供する。

複数storeを跨ぐ更新を
1つのIndexedDB `readwrite` transactionでatomic commitできる契約を持つ。

テストではInMemorySaveRepositoryを使用可能。

productionではIndexedDbSaveRepositoryを使用する。

### 15.19 IndexedDB構成

1 Databaseを使用する。

最低限object store:

- `permanent`
- `learningHistory`
- `run`

`run` store key:

- `live`
- `zoneStart`
- `stageStart`

IndexedDB APIをBattleEngine / ProgressionSystem / QuestionEngine等へ直接入れない。

### 15.20 Validation / Migration

Permanent / LearningHistory / Runは
それぞれ独立validationする。

validation失敗でアプリ全体をクラッシュさせない。

MVP-9のSave schemaはV1。

現在versionは読み込める。
unsupported versionは安全にrejectする。

将来用にmigration入口を用意するが、
存在しない過去versionのmigrationを先行実装しない。

### 15.21 Save破損時の復旧

Run:

1. live
2. zoneStart
3. stageStart
4. Base

Permanent / LearningHistoryは独立して復旧を試みる。

片方のSave破損で、
もう片方の正常Saveを捨てない。

### 15.22 Save失敗時

Repository write失敗でもアプリ全体をクラッシュさせない。

最低限:

- errorを捕捉
- dev warning
- 直前の正常checkpointを消さない
- 失敗writeを理由に既存正常Saveをclearしない
- PermanentState等を初期化しない

### 15.23 保存しない状態

保存不要:

- React component stateそのもの
- UI animation進捗
- hover
- CSS状態
- 描画キャッシュ
- LearningHistory集計結果
- derive可能な恒久ステータス計算値
- 問題中Memo
- Calculator状態
- 回答確定前の単なる選択UI

保存対象は
「復帰に必要なゲーム上の確定状態」に限定する。

### 15.24 StrictMode

autosaveを「stateが変わったらuseEffectで保存」という構造にしない。

確定イベントガード後に保存する。

最低限:

- 回答履歴二重保存なし
- Permanent reward二重確定なし
- Reward apply二重保存なし
- Stage開始RunSave二重生成による破壊なし

を保証する。

restore用のEngineは初期化時点からsnapshotを使って構築し、
新規初期stateを一瞬生成してlive checkpointへ上書きしない。

### 15.25 クラウド将来対応

MVP-9ではクラウド通信を実装しない。

SaveSystemはSaveRepository抽象へ依存する。

将来:

- `IndexedDbSaveRepository`
- `CloudSaveRepository`

を差し替え可能な構造にする。

Envelopeの`savedAt`は将来の競合比較へ利用可能。


---

## 16. オフライン

- 必要データが端末にあればステージ攻略をオフラインで完結可能。
- オフライン進行は端末へ保存。
- 通信復帰後にクラウド同期可能な構造にする。

問題ダウンロード:
- ユーザー操作は教科単位。
- 内部は分野/単元単位まで差分更新可能。
- 軽量テキストデータは教科単位で保存。
- 大容量資料はオンデマンドを基本。
- 完全オフライン用一括取得を将来用意可能。

---

## 17. MVP

MVP-1〜MVP-10は完了。
MVP完成版では、第1エリア《ハルカ》を新規開始からAreaクリアまで一通りプレイ可能とする。

### 17.1 MVP完成条件

以下の一連の流れを実ブラウザで完走できること。

`新規起動 → 拠点 → 3人確認 → 装備/持ち物 → 出撃 → 第七管理圏《ハルカ》 → Stage1 → Stage2 → Stage3 → Areaクリア → reload → 恒久状態/学習履歴/クリア状態維持`

各Stageでは:

`出題範囲設定 → 10Zone → Zone報酬 → Zone10 Boss → 周回継続/帰還 → Stage Result → 恒久報酬 → 次Stage解放`

を行う。

MVP-9の中断復帰機能も、MVP-10正式コンテンツ上で利用可能であること。

### 17.2 正式MVPコンテンツ量

MVP-10完成時点:

- Area: 1
- Stage: 3
- Zone: 30（各Stage 10Zone）
- Boss: 3
- プレイアブル: 3人
- 通常敵: 8種
- 強敵: 2種
- 敵Definition総数: 13種
- 教科: 2（数学・英語）
- 問題: 50問（MVP-10完成時点の履歴値。現行正式問題バンクは§19.2を参照）
- EquipmentDefinition: 6
- Consumable Item: 1
- Spell: 3
- GrowthProfile: POWER / GUARD / SPEED（MVPキャラクターへの割当でGUARD未使用可）

### 17.3 第1エリア

正式名称:

`第七管理圏《ハルカ》`

既存安定ID `area_sample_placeholder` はSave V1互換性のため維持する。

かつて教育・研究・居住・水循環設備を一体管理していた管理圏。
大固定後も保全機構によって維持され続けているが、人間の立ち入りを拒絶している。

MVPではStage1→Stage2→Stage3の直線進行。

### 17.4 Stage構成

全Stageは10Zone固定とする。
Zone 10がBoss / Lap Finalであり、撃破後はRunを終了せず次周へ進める。
既存Story資料で名称が確定しているZone 1〜3はその名称を維持し、Zone 4〜9は現時点ではゲームプレイ用中間Zoneとして扱う。

#### Stage 1

- ID: `stage_sample_placeholder`
- 表示名: `閉ざされた連絡路`
- 初期解放済み
- Zone 1: ランナー ×2
- Zone 2: ランナー ×1 + ウォッチャー ×1
- Zone 3: クランプ ×1 + リレー ×1 + センチネル ×1 / Rare
- Zone 4: ランナー ×1 + クランプ ×1 + リレー ×1
- Zone 5: ウォッチャー ×1 + センチネル ×1
- Zone 6: ランナー ×1 + ウォッチャー ×1 + クランプ ×1
- Zone 7: リレー ×1 + センチネル ×1 + ウォッチャー ×1 / Rare
- Zone 8: クランプ ×1 + センチネル ×1 + リレー ×1
- Zone 9: センチネル ×2 + クランプ ×1
- Zone 10 Final: 門衛機《JANUS》 ×1

Stage1を1周以上踏破したRunを確定するとStage2を解放する。

#### Stage 2

- ID: `stage_haruka_02`
- 表示名: `沈黙した循環区`
- Zone 1: ドレイナー ×2 + パージャー ×1
- Zone 2: シールダー ×1 + ドレイナー ×1 + リレー ×1
- Zone 3: センチネル ×1 + シールダー ×1 + パージャー ×1 / Rare
- Zone 4: ドレイナー ×1 + パージャー ×1 + リレー ×1
- Zone 5: シールダー ×2
- Zone 6: センチネル ×1 + ドレイナー ×1 + パージャー ×1
- Zone 7: シールダー ×1 + リレー ×1 + パージャー ×1 / Rare
- Zone 8: センチネル ×1 + シールダー ×1 + ドレイナー ×1
- Zone 9: シールダー ×1 + パージャー ×1 + センチネル ×1
- Zone 10 Final: 保全核《NEREID》 ×1

Stage2を1周以上踏破したRunを確定するとStage3を解放する。

#### Stage 3

- ID: `stage_haruka_03`
- 表示名: `記録塔`
- Zone 1: スクリブ ×2 + ウォッチャー ×1
- Zone 2: オーディター ×1 + スクリブ ×1 + リレー ×1
- Zone 3: オーディター ×1 + シールダー ×1 + スクリブ ×1 / Rare
- Zone 4: スクリブ ×2 + リレー ×1
- Zone 5: オーディター ×1 + ウォッチャー ×1 + スクリブ ×1
- Zone 6: オーディター ×1 + シールダー ×1 + リレー ×1
- Zone 7: オーディター ×2 + スクリブ ×1 / Rare
- Zone 8: シールダー ×1 + オーディター ×1 + ウォッチャー ×1
- Zone 9: オーディター ×2 + シールダー ×1
- Zone 10 Final: 記録管理体《MNEMOS》 ×1

Stage3を1周以上踏破したRunを確定すると第1エリアMVP完走とする。

### 17.5 Stage解放

Stage解放は `AreaDefinition.stageIds` の配列順から自動推測しない。

データ駆動の `StageUnlockRule` を使用する。

MVP正式ルール:

- Stage1: 新規ゲーム時から解放
- Stage1 `STAGE_FIRST_CLEAR` → Stage2解放
- Stage2 `STAGE_FIRST_CLEAR` → Stage3解放

`unlockedStageIds` と `clearedStageIds` は分離して保持する。

### 17.6 プレイアブルキャラクター

Save V1互換性のため既存Character IDは維持する。

#### 葉山智也

- ID: `char_hero_placeholder`
- GrowthProfile: `POWER`
- 初期スペル: `リフレクト`
- additional spell pool: `ブレイク`, `解析パルス`
- Lv1 baseStatsはMVP-1〜9の値を維持する。

戦闘方向:
万能 / 観測 / 安定。

#### 南雲彩乃

- ID: `char_mage_placeholder`
- GrowthProfile: `SPEED`
- 初期スペル: `ブレイク`
- additional spell pool: `解析パルス`, `リフレクト`
- Lv1 baseStatsは既存値を維持する。

戦闘方向:
攻撃 / 先手 / 決断。

#### 岡村駆

- ID: `char_knight_placeholder`
- GrowthProfile: `SPEED`
- 初期スペル: `解析パルス`
- additional spell pool: `ブレイク`, `リフレクト`
- Lv1 baseStatsは既存値を維持する。

戦闘方向:
サーチ / 支援 / 思考速度。

GUARD GrowthProfileをMVPキャラクターへ必ず割り当てる必要はない。

個別年齢は正式game dataへ固定しない。
ビジュアル基準では主人公世代を18〜19歳前後とする。

### 17.7 正式Spell

既存stable ID・表示名・対象・maxLevelは維持する。MP costは廃止する。各SpellDefinitionはスペルLvごとに、正答数1〜5に対応する効果データと5問の出題構成ルールを持つ。具体的な新効果値・5問構成は個別スペル設計で正式確定するまで `TODO_SPEC_DECISION` とし、旧MP版の効果値を新仕様へ暗黙流用しない。

| Stable ID | 表示名 | 対象 | maxLevel | 5問構成 |
|---|---|---|---:|---|
| `spell_firebolt_placeholder` | ブレイク | enemy | 3 | ★1 → ★2 → ★3 → ★4 → ★5 |
| `spell_ice_shard_placeholder` | 解析パルス | enemy | 3 | ★2 → ★2 → ★3 → ★3 → ★4 |
| `spell_heal_placeholder` | リフレクト | self | 3 | ★1 → ★1 → ★2 → ★2 → ★3 |

正答数による基本効果（0問は全スペル完全失敗）:

| 正答数 | ブレイク固定ダメージ | 解析パルス固定ダメージ | 解析パルスのサーチ深度 | リフレクト回復 |
|---:|---:|---:|---:|---:|
| 1 | 12 | 8 | 2行動 | 10 |
| 2 | 22 | 14 | 3行動 | 18 |
| 3 | 34 | 21 | 4行動 | 28 |
| 4 | 48 | 29 | 6行動 | 40 |
| 5 | 65 | 38 | 8行動 | 55 |

スペルLvは基本威力を直接増やさず、付属効果を解放する軸とする。

- ブレイク: Lv1=基本効果、Lv2=対象が保持するガードを発動時に解除、Lv3=発動直前HPが最大HP40%以下の対象へのダメージを30%増加。
- 解析パルス: 攻撃ダメージは常に選択した敵1体のみ。Lv1=サーチ1体、Lv2=サーチ2体、Lv3=サーチ3体。対象数が生存敵数を上回る場合は生存敵すべてをサーチする。サーチ深度は正答数で決定する。
- リフレクト: Lv1=基本回復、Lv2=回復後に次の敵攻撃1回を25%軽減するガードを付与、Lv3=そのガード軽減率を40%へ強化する。

この数値はArea 1の正式Enemy HP（24〜260）と、スペルが「準備ターン＋次回自己行動」の2行動を消費することを前提にした初期バランス値であり、設定値として調整可能とする。

世界観資料にある《アクセラレート》は、思考速度支援mechanicが未実装のためMVPでは採用しない。

### 17.8 正式Enemy

#### 通常敵

| Stable ID | 表示名 | HP | ATK | DEF | SPD |
|---|---|---:|---:|---:|---:|
| `enemy_slime_placeholder` | ランナー | 24 | 8 | 4 | 14 |
| `enemy_goblin_placeholder` | ウォッチャー | 28 | 6 | 5 | 9 |
| `enemy_clamp` | クランプ | 45 | 10 | 10 | 6 |
| `enemy_relay` | リレー | 32 | 9 | 7 | 11 |
| `enemy_drainer` | ドレイナー | 50 | 14 | 11 | 10 |
| `enemy_purger` | パージャー | 45 | 17 | 9 | 12 |
| `enemy_shielder` | シールダー | 75 | 13 | 18 | 8 |
| `enemy_scrib` | スクリブ | 55 | 13 | 12 | 13 |

#### 強敵

| Stable ID | 表示名 | HP | ATK | DEF | SPD |
|---|---|---:|---:|---:|---:|
| `enemy_sentinel` | センチネル | 60 | 12 | 10 | 9 |
| `enemy_auditor` | オーディター | 90 | 19 | 15 | 11 |

#### Boss

| Stable ID | 表示名 | HP | ATK | DEF | SPD |
|---|---|---:|---:|---:|---:|
| `enemy_boss_ogre_placeholder` | 門衛機《JANUS》 | 110 | 14 | 10 | 8 |
| `enemy_boss_nereid` | 保全核《NEREID》 | 190 | 20 | 16 | 13 |
| `enemy_boss_mnemos` | 記録管理体《MNEMOS》 | 260 | 23 | 19 | 12 |

Bossは既存MVP AIの範囲で動作する。
MVPではBoss phase / telegraph / 専用特殊AIを追加しない。

### 17.9 正式Equipment

既存Equipment ID / slot / rarity / stat / enhancement値を維持し、表示名のみ世界観へ正式化する。

正式表示名:

- 簡易出力端末
- 高出力演算端末
- 遠征ジャケット
- 耐衝撃ベスト
- 軽量識別タグ
- 発光接続インジケーター

第1エリアdrop contentはNORMAL〜EPICまでで成立させる。
LEGENDARY rarityの仕組み自体は維持するが、第1エリア正式装備を無理に追加しない。

### 17.10 正式Consumable

既存stable ID / effectを維持する。

- 表示名: `応急処置キット`
- effect: HEAL 20

新規ゲーム時の所持数は3。

### 17.11 新規ゲーム初期資源

第1エリアMVP正式初期値:

- コイン: 200
- 強化素材: 10
- 解放結晶: 0
- 応急処置キット: 3

将来の全編バランスではconfig値として調整可能。

### 17.12 正式Question bank

> この節はMVP-10完成時点の履歴仕様。2026-09-30の現行正式問題バンクは§19.2が上書きする。

MVP正式教科:

- 数学
- 英語

総問題数: 50問。

内訳:

| 教科 | ★1 | ★2 | ★3 | ★4 | ★5 | 計 |
|---|---:|---:|---:|---:|---:|---:|
| 数学 | 5 | 5 | 5 | 5 | 5 | 25 |
| 英語 | 5 | 5 | 5 | 5 | 5 | 25 |

MVP formatは `multiple_choice` のみ。

既存5問はstable questionIdを維持する。
新規45問を追加する。

全50問について以下を満たすこと:

- 正答一意
- correctAnswerIndex正当
- 条件不足なし
- 問題/選択肢/解説の整合
- 重複問題なし
- 数学計算正当
- 英文・文法・語法の一意性
- ★を思考量で判定
- ゲーム内で扱える文章量

true/false / ordering / short answerはMVP後。

### 17.13 Rare Reward Event

10Zone化後は各StageのZone3とZone7を希少報酬イベントとする。

- Stage1 Zone3 / Zone7
- Stage2 Zone3 / Zone7
- Stage3 Zone3 / Zone7

`isRareRewardEvent = true`

それ以外のZoneはfalse。

Rare Reward EventはMVP-4仕様どおり「候補4枚」を意味する。
★、装備rarity、恒久ドロップ率を上げる仕組みではない。

### 17.14 Story contentの扱い

正式story dataは以下を基礎資料とする。

- v0.2: 第1エリア全体・Stage/Zone基礎構成
- v0.2.1: 葉山智也の心理・Stage1導入等の差分修正
- v0.2.2: JANUS/NEREID/MNEMOSの鏡構造等の追加差分

MVP-10完成時点のゲームUIには、
Stage導入・Zone会話・Boss前後会話を表示する正式なStory表示枠が存在しない。

そのため:

- StoryEngineを新設しない。
- 正式story textを無理に画面へ埋め込まない。
- story dataはMVP後の表示枠実装まで保留する。

### 17.15 Assetの扱い

MVP-10では画像生成を行わない。

正式ビジュアル制作対象:

- 葉山智也
- 南雲彩乃
- 岡村駆
- 通常敵8種
- 強敵2種
- JANUS
- NEREID
- MNEMOS
- 拠点
- Stage 1〜3背景

画像ファイル未作成時は既存placeholder visualでbuildを維持する。

画風基準:

- 中密度2Dピクセルアート
- 明るい再生世界 + 旧文明の静かな傷跡
- 敵は生物性の高い旧文明保全機構

### 17.16 Content validation

MVP-10ではBattleEngineから分離したcontent validation層を持つ。

最低限検査:

- duplicate Definition ID
- duplicate instanceId
- dangling character spell
- dangling reward spell
- dangling equipment
- dangling item
- dangling enemyDefinitionId
- invalid Area stageId
- invalid Stage unlock target
- invalid Zone
- empty enemy formation
- Final Zone違反
- Boss数違反
- Boss final配置違反
- duplicate question ID
- invalid question hierarchy
- invalid correctAnswerIndex
- empty departure question pool
- reward pool不足
- unlock dead-end

MVP-10正式content bundleはvalidation issues 0件を必須とする。

### 17.17 Save V1互換性

MVP-10はMVP-9で成立したSave V1を可能な限り維持する。

既存stable IDを維持:

- Character
- Area
- Stage1
- 既存Zoneの対応可能なID
- 既存Enemy
- Spell
- Equipment
- Item
- 既存Question

表示名変更ではmigrationを要求しない。

#### 旧3Zone Stage1 RunSave

MVP-9時点のStage1は3Zone、
MVP-10正式Stage1は4Zoneである。

旧RunSaveの `currentZoneIndex = 2` は、
旧構造ではFinal JANUS、
新構造では新Zone3を指すため、
indexだけを信頼すると誤resumeが発生する。

そのためRunSave resume時に、
保存済みlive Battle snapshotのenemy definition構成と
現行currentZoneIndexのZone enemy構成の互換性を検査する。

- Zone1途中: 互換ならresume可
- Zone2途中: 互換ならresume可
- 旧Final途中: 不整合を検出し、そのcheckpointをreject
- StageResult: 互換性がある範囲でresume可

不整合時は既存checkpoint fallback:

`live → zoneStart → stageStart → Base`

を使用する。

PermanentSave / LearningHistorySaveはRunSave不整合の影響で破棄しない。

### 17.18 MVPバランス確認

実進行の基準:

| 時点 | Lv | 累積EXP |
|---|---:|---:|
| Stage1開始 | 1 | 0 |
| Stage1 1周後 | 4 | 220 |
| Stage2開始 | 4 | 220 |
| Stage2 1周後 | 5 | 440 |
| Stage3開始 | 5 | 440 |
| Stage3 1周後 | 6 | 660 |

MVP balance testでは、

- Stage1をLv1
- Stage2をLv4
- Stage3をLv5

の実効partyで確認する。

Combat formulaは変更せず、
難易度調整はEnemy Definitionのstatsで行う。

HPだけを極端に増やす調整を避ける。

### 17.19 MVP受入基準

MVP-10正式受入時の最低条件:

- Character 3
- Enemy 13
- Stage 3
- Zone 30
- Question 50
- content validation issues 0
- 全自動テストgreen
- typecheck成功
- production build成功
- 実ブラウザでArea 1完走
- Stage2またはStage3途中resume成功
- Stage解放/clear状態をreload後も保持
- LearningHistoryをreload後も保持
- Equipment drop → 装備 → 強化 → reloadで保持

### 17.20 MVP完了時点で未実装

以下はMVP完成後へ回す。

- 固有スキル本実装
- 《アクセラレート》等の新支援Effect
- 汎用Status/Buff/Debuff system
- Boss Phase
- Telegraph
- Story表示システム
- StoryEngine
- Bestiary本実装
- Quest
- Achievement
- Endgame
- 第2Area以降
- LEGENDARY正式装備content
- 3教科目
- true/false
- ordering
- short answer
- 正式Asset画像
- Cloud Save
- Login / Account
- 複数端末同期

### 17.21 MVP実装順

1. MVP-1: 1キャラ対1敵の最小戦闘 — 完了
2. MVP-2: 全基本コマンド — 完了
3. MVP-3: 3人パーティ + 複数敵 — 完了
4. MVP-4: ローグライト — 完了
5. MVP-5: 複数ゾーン + ボス + ステージ — 完了
6. MVP-6: 拠点 — 完了
7. MVP-7: 恒久成長 — 完了
8. MVP-8: 学習履歴 — 完了
9. MVP-9: セーブ/復帰 — 完了
10. MVP-10: 正式コンテンツ投入 — 完了


---

## 18. 技術構成

### 18.1 基盤

- React
- TypeScript
- Vite

新規プロジェクトとして構築する。
旧StudyRiseコード・資産は使用しない。

### 18.2 システム分離

最低限以下を分離。

- `BaseController`
- `BattleEngine`
- `QuestionEngine`
- `RogueliteEngine`
- `StageEngine`
- `ProgressionSystem`
- `LearningHistorySystem`
- `SaveSystem`

### 18.3 BattleEngine

担当:

- 行動タイムライン
- 思考速度
- アタック
- ガード
- MP
- スペル
- スキル
- アイテム効果
- 状態異常
- バフ/デバフ
- KO
- 敵AIとの接続
- サーチ
- クリティカル
- 大成功
- 勝敗

実装上の基準:

- プレイヤー・敵はいずれも複数アクターとして扱える構造にする。
- コンテンツ定義IDと、同一種類が複数出現する戦闘中インスタンスIDを分離する。
- コマンド・結果データは実行者 `sourceActorId` と対象 `targetId` を明示する。
- KO時は該当アクターだけをタイムラインから除外し、生存アクターのゲージ状態を保持する。
- 行動順プレビューは副作用なしで計算し、本番の乱数・タイムラインを消費しない。
- 敵の予定行動列はサーチ表示と実際の実行で同一データ源を使う。

UI描画を担当しない。

### 18.4 BaseController / StageSessionScreen

BaseController担当:

- 拠点・Area・Stage・出撃準備の画面遷移
- DepartureDraftの保持
- PartySelection
- QuestionScopeSelection
- BattleItemSlots
- StageLaunchConfigの確定

担当しないもの:

- 戦闘計算
- Zone進行
- ローグライト報酬計算
- 恒久成長計算
- 永久Inventory管理
- セーブ

StageSessionScreenはBaseとStageのUI境界とする。

- `StageLaunchConfig` を必須入力で受け取る。
- Stage用Hookをコンポーネント内部で無条件に呼ぶ。
- BaseController内でStage用Hookを条件付き呼び出ししない。

### 18.5 QuestionEngine

担当:

- 教科/分野/単元/★の候補生成
- 問題抽選
- 直近問題/単元/形式の軽い分散
- 0件判定
- 問題データ検証

戦闘ロジックを担当しない。

### 18.6 RogueliteEngine

担当:

- 対象キャラクター固定の報酬候補生成
- レアリティ抽選
- 報酬カテゴリ抽選
- 軽いシナジー補正
- 最大強化除外
- 3スペル時の新規スペル除外
- キャラクター固有追加スペルプールの参照
- キャラクターごとの無料リロール
- 報酬適用
- RewardSession / RewardPhaseSession の状態遷移
- RunBuildへのローグライト強化反映

キャラクター自体の報酬候補抽選や、キャラクター出現率の偏り補正は行わない。

### 18.7 StageEngine

担当:

- StageDefinition / ZoneDefinitionの読み取り
- 現在ゾーン管理
- Zone BattleとZone Rewardの接続
- Final Zone判定
- Stage Clear / Defeat / Self Return
- Zone間の状態引き継ぎ
- KO復帰
- StageResult生成

担当しないもの:

- 戦闘計算
- 問題抽選
- ローグライト候補生成
- 恒久成長
- セーブ

BattleEngineは1ゾーン戦闘、RogueliteEngineはゾーン報酬、StageEngineはそれらの進行接続という境界を維持する。

### 18.8 ProgressionSystem

担当:

- PermanentStateの更新
- EXP / Level計算
- GrowthProfileによる恒久成長
- 装備の所持・装備・解除
- 装備強化・分解
- 装備ドロップ
- 通貨・素材・希少解放資源
- Character unlock
- Stage unlock
- 消費アイテムInventory
- `resolveCharacterForBattle`
- `reconcileStageResult`

担当しないもの:

- Battleの戦闘計算
- Stage進行
- Roguelite報酬候補生成
- 学習履歴
- 永続保存

原則として純粋関数で構成し、
`RunState / RunBuild / PermanentState` の境界を維持する。

### 18.9 LearningHistorySystem

担当:

- LearningHistoryStateの更新
- 回答結果の履歴化
- 正答/不正答/UNKNOWN分類
- 教科/分野/単元/★別集計
- 正答率計算
- 履歴フィルター
- 履歴並び替え

担当しないもの:

- Battle計算
- Question抽選
- Stage進行
- 恒久成長
- Save永続化

LearningHistoryStateはPermanentStateおよびRunStateから独立させる。

回答確定イベントのみを入口とし、
React Effectや画面再描画を記録トリガーにしない。

ID生成とClockは注入可能とし、
ゲーム乱数へ影響させない。

### 18.10 データ駆動

以下は原則データ追加だけで増やせる構造にする。

- キャラクター
- 敵
- スキル
- スペル
- 装備
- アイテム
- エリア
- ステージ
- ゾーン
- 問題

通常コンテンツ追加のたびにBattleEngineを変更しない。

### 18.11 効果システム

共通Effectで組み合わせ可能にする。

例:

- DAMAGE
- HEAL
- BUFF
- DEBUFF
- STATUS
- MP_GAIN
- MP_LOSS
- SPEED_MODIFY
- GUARD
- ACTION_ADVANCE

### 18.12 セーブ

MVP-9では以下を独立させる。

- `PermanentSave`
- `LearningHistorySave`
- `RunSave`

各Saveは:

- `schemaVersion`
- `savedAt`
- `payload`

を持つEnvelope形式。

SaveSystemはSaveRepository interfaceへ依存し、
productionではIndexedDB、
testではInMemory repositoryを使用可能。

IndexedDB store:

- permanent
- learningHistory
- run

Run checkpoint:

- live
- zoneStart
- stageStart

回答確定時のHistory + Run、
Stage終了時のPermanent + History + Run clear等、
複数storeを跨ぐ更新はatomic transactionでcommitする。

Run中はBattleEngineSnapshot / RewardPhaseSnapshotを保存し、
確定済み状態をreloadで再抽選させない。


### 18.13 レスポンシブ

- スマートフォン
- iPad横画面

を最初から想定。

共通コンポーネントを基本にし、必要箇所のみブレークポイントで調整。


### 18.14 乱数とプレビュー

- ゲーム内乱数は中央のRandomServiceへ集約する。
- 同一条件のテスト・デバッグで再現できるよう、シード可能にする。
- RandomServiceは内部stateをsnapshot / restore可能にする。
- reload時に別seedへ再シードせず、保存済みstateから乱数系列を完全継続する。
- Battle main RNG / Timeline RNG / Reward RNGなど、実際に存在するstateful streamを個別に保存する。
- QuestionEngineの`lastPicked`等、候補集合を変化させるmutable stateもsnapshot対象とする。
- UI表示用の未来行動プレビューは、本番RandomServiceを消費しない。
- 完全同値時のタイブレークを含め、プレビュー表示と実際の行動順が一致するよう、必要な乱数状態を複製・スナップショットして計算する。
- UIの再描画回数、reload有無、プレビュー呼び出し回数だけを理由にゲーム結果が変化してはならない。



### 18.15 RunState / RunBuild

- RunBuildはローグライト一時強化だけを保持する。
- RunStateは現在HP、RunBuild、報酬フェーズ状態など、ステージ挑戦中の状態を保持する。
- BattleEngineは報酬画面を担当しない。
- 戦闘勝利後はRunController相当の上位層が `Battle → Reward → 次Battle` を接続する。
- BattleEngineにREWARDフェーズを追加しない。
- 次Battle生成時にRunState/RunBuildを入力へ解決し、HP・スペル・コマンド強化・一時ステータスを反映する。
- RunSaveではStageRunStateに加えて、live BattleEngineSnapshot / RewardPhaseSnapshotを保持できる。
- Stage開始時に確定したparty statsはRunSave側へ保持し、resume時に現在のPermanentStateで勝手に再計算しない。



### 18.16 Stage Run乱数

- ステージ挑戦開始時に `runSeed` を1つ持つ。
- 同一 `runSeed` では同一条件を再現可能にする。
- Battle用・Reward用の乱数は `runSeed` から用途別に派生させる。
- 例: `derive(runSeed, zoneId, "battle")` / `derive(runSeed, zoneId, "reward")`
- 同じStageでも別runSeedなら異なる乱数系列になり得る。
- UI再描画、プレビュー表示回数、画面遷移回数によってrunSeedや派生seedを変化させない。



### 18.17 Departure data flow

出撃準備からStage開始までのデータフロー:

`Base UI → DepartureDraft → validation → StageLaunchConfig → StageSessionScreen → StageController`

原則:

- `StageLaunchConfig` は必須値を持つ。
- 本番環境でsample値へ暗黙fallbackしない。
- テスト/開発用sample起動は専用factoryで構築してよい。
- 出題範囲はStage開始前に問題プールを絞り込んで渡す。
- 持ち込みアイテム3枠もStage開始入力へ含める。
- Base側状態は恒久セーブデータではなく、MVP-6では一時UI状態として扱う。



---

## 19. 現行バランス値の扱い

MVP-10の正式コンテンツは、現行Combat formulaを変更せず、Enemy Definition側のstats調整でArea 1完走可能なバランスへ合わせる。

以下は「現時点の基準値」であり、ゲーム仕様そのものではなく設定値として調整可能。

- ダメージ乱数: 0.90〜1.10
- クリティカル: 4%
- クリティカル倍率: 1.5
- ガード★補正: 20/30/40/50/60%
- ガード大成功: 5%
- ガード大成功時: 通常軽減率に+20 percentage points
- ガード最終軽減率上限: 90%
- ローグライトレアリティ: 50/28/14/6/2%
- スペル3枠満杯時の既存スペル強化カテゴリ補正: ×1.20
- ローグライトシナジー補正上限: ×1.15
- MVPサンプルスペル最大Lv: 3
- 基本コマンド一時強化上限: 3段階
- アタック強化: +10% / 段階
- ガード強化: +5 percentage points / 段階（最終90%上限）
- サーチ表示数強化: +1 / 段階
- 一時ステータス強化上限: 3段階
- HP一時強化: +10 / 段階
- 学力・忍耐力・思考速度一時強化: +5 / 段階
- MVPサンプル回復報酬: 最大HPの30%
- KOゾーン間復帰HP: effectiveMaxHpの30%、切り上げ、最低1HP
- 1StageあたりBoss: ちょうど1体、Final Zone内
- パーティ人数: 1〜3人
- 持ち込みアイテム枠: 3枠、空欄可
- 出題範囲: 最低2教科、選択各教科で最低1単元
- 装備強化上限例: +5/+7/+10/+12/+15

これらは設定ファイルへ集約し、コードへ散在させない。

---

## 19.1 2026-09-30 スペル仕様改訂

本改訂により、プレイヤーMPおよびチャージを廃止し、スペルを「基本5問の準備 → 次回自己行動時の自動発動」方式へ変更する。

旧MP/チャージ仕様と本改訂が文書内で競合する場合、本改訂を優先する。実装移行時は残存するMP/チャージ参照を監査し、ゲーム挙動として残さない。

確定事項:
- 正答数は基本効果の威力・サーチ深度を決定する。
- スペルLvは付属効果を解放・拡張する。
- 解析パルスの攻撃対象は常に1体で、Lv上昇はサーチ対象数のみを1→2→3体へ増やす。

### 19.2 2026-09-30 正式問題バンク改訂

本改訂は§17.2の問題数および§17.12のMVP-10問題バンク仕様を、現行production contentについて上書きする。

現行production QuestionPoolは、2026-09-30改訂の4問題集を正本として合計9,573問とする。

- 数学IA: 945問
- 数学II・B: 941問
- 数学III・C: 937問
- 英語: 6,750問
- 数学合計: 2,823問
- 英語合計: 6,750問

形式内訳:

| format | 問題数 |
|---|---:|
| multiple_choice | 8,617 |
| true_false | 335 |
| ordering | 175 |
| short_answer | 446 |
| 合計 | 9,573 |

現行の教科→分野→単元はQuestionDefinitionに格納された問題集の値をそのまま使用し、旧MVP-10の仮分類をproduction出題範囲へ混在させない。

数学:
- 数学I: 数と式 / 集合・命題 / 2次関数 / 図形と計量 / データの分析
- 数学A: 場合の数 / 確率 / 図形の性質 / 数学と人間の活動
- 数学II: 式と証明 / 複素数と方程式 / 図形と方程式 / 三角関数 / 指数関数・対数関数 / 微分法・積分法
- 数学B: 数列 / 統計的な推測
- 数学III: 分数・無理関数 / 数列の極限・無限級数 / 関数の極限・連続 / 微分法 / 積分法
- 数学C: ベクトル / 平面上の曲線 / 複素数平面

英語:
- 語彙: 基本語彙 / 文脈語彙 / 語法・類義語
- 文法・語法: 品詞・語順・文型 / 時制・完了 / 不定詞 / 動名詞 / 受動態 / 前置詞・接続詞・節 / 仮定法 / 分詞 / 分詞構文 / 助動詞 / 関係詞 / 比較 / 冠詞・代名詞 / 形容詞・副詞・語法
- 英文解釈: 文型・SV把握 / 名詞節・同格 / 名詞構文 / 強調・倒置 / 因果・論理構文 / 関係詞・修飾 / 情報構造・否定・比較 / 複数文構造比較
- 英作文: 基本文型・和文英訳 / 語順・整序 / 接続・論理表現 / 自由英作文・論証 / 資料統合・論証
- 読解: 論理関係 / 内容把握・要旨 / 推論・仮説更新 / 批判的読解・評価 / 複数資料統合

旧ID `q_math_*` / `q_eng_*` の50問はproduction QuestionPoolから除外する。回帰テストおよび既存LearningHistoryの表示互換用fixtureとして保持してよいが、出題範囲catalog・出撃validation・StageLaunchConfigへは渡さない。

既存RunSaveのquestionScopeが現行QuestionDefinitionの教科・分野・単元に存在しない場合、そのRunSaveはcontent-incompatibleとして再開しない。既存LearningHistoryはquestionIdを保持し、旧fixtureで解決可能な記録は表示互換を維持する。

短答採点は問題集に定義されたacceptedAnswersを使用し、入力はUnicode NFKC正規化・前後空白除去・連続空白の単一化・英字小文字化を行って比較する。問題集にない別解を推測で追加しない。

スペルの5問構成は各SpellDefinitionのquestionStarsを維持する。出撃範囲を狭くした結果、選択教科に必要★が存在しない場合は、その教科をスペル準備用候補として扱わず、存在しない★へ自動フォールバックしない。

---

---

## 20. 正本ルール

本書が新StudyRiseのゲーム仕様の正本である。

優先順位:

1. 本書
2. 本書に基づいて後日承認された追補仕様
3. StudyRiseストーリー・世界観仕様書（基礎v0.2 + 差分v0.2.1/v0.2.2）
4. StudyRiseビジュアルデザイン基準
5. StudyRiseゲーム用問題集制作ルール
6. 実装上の内部設計

ストーリー資料は完全置換関係ではなく、
v0.2を基礎とし、v0.2.1 / v0.2.2の明示的な差分だけを上書きとして扱う。

以下は仕様判断の根拠にしない。

- 旧StudyRise
- 過去のChemical Magicarize
- 過去HTML
- 過去タイル/画像
- 過去ステータス
- 一般的なゲーム慣習だけを根拠とした推測

不明点がゲーム性に影響する場合は、独自に仕様を作らず確認する。
