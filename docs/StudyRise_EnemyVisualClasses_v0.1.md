# StudyRise Enemy Visual Classes v0.1

敵画像を追加しても個別CSSを増殖させないための、Presentation層専用の表示分類。
戦闘ステータス・★・報酬・EnemyDefinition・Saveには影響させない。

## サイズ区分

| class | 用途 | 基準 |
|---|---|---|
| small | 小型・細身 | 標準より明確に小さく見せる |
| standard | 通常敵 | 現行Runner相当を基準 |
| large | 大型敵 | 標準より一段大きいシルエット |
| extra-large | 超大型・ボス・セットピース | 通常敵の枠を超えて威圧感を出す。ただしHUD・行動順・下部UIのsafe areaには侵入させない |

displayScale は各class内の微調整専用。ゲーム上の強さには使用しない。

## 基準線

- ground: 脚・爪・接地部を共通の地面基準線へ合わせる。
- hover: 飛行・浮遊・遊泳型。画像下端ではなく胴体の見かけ上の基準線を合わせる。
- 待機モーションで ground の接地点を上下移動させない。

## モーション型

ground / quadruped / crawler / hover / flying / swimming

## 今回受領した12体の暫定分類

| No. | モチーフ | size | baseline | motion |
|---:|---|---|---|---|
| 01 | 機械甲殻類 | standard | ground | crawler |
| 02 | 機械蛾・飛翔昆虫 | standard | hover | flying |
| 03 | 機械鹿 | large | ground | quadruped |
| 04 | 機械狐 | standard | ground | quadruped |
| 05 | 機械カマキリ | standard | ground | crawler |
| 06 | 重装甲カメ | large | ground | quadruped |
| 07 | 機械魚 | standard | hover | swimming |
| 08 | 機械トカゲ | standard | ground | crawler |
| 09 | 機械フクロウ | standard | ground | flying |
| 10 | 大型重装四足機械獣 | extra-large | ground | quadruped |
| 11 | 浮遊型魔術機械体 | large | hover | hover |
| 12 | 水属性大型飛翔・遊泳体 | extra-large | hover | swimming |

## 超大型の表示原則

extra-large は単なる画像拡大ではなく専用の構図区分とする。

- 原則1体で敵側の主役になる。
- 横長個体と縦長個体で同じ固定widthを強制しない。
- 接地型は足元基準を維持し、上方向へ大きくする。
- 浮遊型はbody baselineを維持して上下の余白を確保する。
- HP HUD、Turn Order、問題/コマンドUIを覆わない。
- 複数敵編成時は必要に応じて自動縮小する。
- 撃破・被弾・待機の移動量は画像サイズに比例させすぎない。
- 超大型であることを戦闘計算の強さへ自動変換しない。


## 実装済み安全領域（2026-09-29）

- 1〜2体編成では各visualSizeを優先する。
- 3体以上では敵側46vw内へ自動縮小し、HP HUD・Turn Order・下部コマンド領域を保護する。
- ground型の待機変形はtransform-originを足元(50% 100%)へ固定する。
- hover型は接地型とは別のbody baselineと影位置を使う。
- extra-largeは単体時に最大表示し、複数編成時には自動縮小する。
- damage pop / KO / battle-end UIはvisualSizeに依存せず前面表示する。
- displayScaleは見た目だけに作用し、BattleEngineのHP/攻撃/防御/報酬には影響しない。

## 新規敵追加チェック

新しい敵画像を正式採用するときは、EnemyDefinitionを変更する前にAsset Manifest側で
runtimeFilename / visualSize / motionType / baseline / 必要時のみdisplayScale を決定する。
画像が未配置の敵IDを先にregistryへ追加しない。
