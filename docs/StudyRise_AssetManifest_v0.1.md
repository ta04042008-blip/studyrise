# StudyRise 正式画像アセット投入マニフェスト v0.1

状態: 実装準備確定  
基準: `docs/StudyRise_Spec_v0.11.md` / `docs/StudyRise_ビジュアルデザイン基準_v0.1.txt`

## 1. 現在の画像実装監査

MVP-10完成時点のrepositoryには、PNG/JPEG/WebP/GIF/SVGの画像ファイルは存在しない。

現在の見た目はCSSと標準HTML要素だけで構成されている。

特に:

- 拠点背景: `src/App.css` の青系linear-gradientによるPLACEHOLDER
- Character: 画像参照なし
- Enemy/Boss: 画像参照なし
- Stage背景: 画像参照なし
- Equipment/Item icon: 画像参照なし
- Battle画面: HPバー/テキスト/ボタンのみ

したがって正式画像投入は、旧画像の置換ではなく「初回の正式visual asset実装」として扱う。

## 2. 現在のレスポンシブ基準

`src/App.css`:

- smartphone側 `.app`: max-width 640px
- 768px以上: max-width 900px
- 拠点背景: smartphone = 3:4
- 768px以上の拠点背景 = 16:9
- Battle HP表示: smartphone縦積み / 768px以上で横並び

画像はこの2系統を壊さないこと。

## 3. Save V1との関係

Saveはstable Definition IDを保持し、画像ファイル名や表示画像を保存しない。

そのため正式画像はpresentation層でstable IDから解決する。

画像追加を理由に以下を変更しない:

- Character ID
- Enemy ID
- Area ID
- Stage ID
- Zone ID
- Save schema

画像変更だけでSave migrationを発生させない。

## 4. 推奨画像解決方式

ゲームロジックのDefinitionへ画像URLを直接埋め込まず、presentation専用registryを新設する。

推奨:

`src/presentation/assets/studyRiseAssets.ts`

概念:

```ts
export const characterArtById: Record<string, CharacterArtDefinition>
export const enemyArtById: Record<string, EnemyArtDefinition>
export const stageBackgroundById: Record<string, BackgroundArtDefinition>
```

BattleActorには既に`definitionId`があるため、Battle UIは保存IDを変更せずに画像を解決できる。

画像が無い場合は既存テキスト/CSS表示へ安全fallbackする。

## 5. 保存ディレクトリ

runtime画像:

```text
public/assets/studyrise/
  characters/
  enemies/
  backgrounds/
    base/
    stages/
  ui/
```

master/source画像はrepositoryへ入れず、runtime用書き出し画像のみ配置する。

## 6. Character master art

正式制作対象:

| Stable ID | 表示名 | runtime filename | master canvas | 背景 |
|---|---|---|---:|---|
| `char_hero_placeholder` | 葉山智也 | `hayama_tomoya.png` | 512×768 | transparent |
| `char_mage_placeholder` | 南雲彩乃 | `nagumo_ayano.png` | 512×768 | transparent |
| `char_knight_placeholder` | 岡村駆 | `okamura_kakeru.png` | 512×768 | transparent |

共通:

- 中密度2Dピクセルアート
- 全身
- 足元位置を揃える
- シルエットで3人を識別可能
- 人間は色面を整理し、顔・髪・服を読みやすくする
- 日常着 + 共通規格の軽量遠征装備
- 主人公だけ派手にしない

方向:

- 智也: 中央型・標準 / 慎重 / 観察
- 彩乃: 軽量・前傾 / 前進 / 決断
- 駆: 縦長・装備多め / 観測 / 理性

Battle正式レイアウトではplayer側を画面左、enemy側を画面右へ置く前提とし、
Character masterは基本的に画面右方向へ意識を向けたポーズを推奨する。

## 7. 通常Enemy master art

全てtransparent PNG。
通常敵は512×512 canvasを基準とする。

| Stable ID | 表示名 | runtime filename |
|---|---|---|
| `enemy_slime_placeholder` | ランナー | `runner.png` |
| `enemy_goblin_placeholder` | ウォッチャー | `watcher.png` |
| `enemy_clamp` | クランプ | `clamp.png` |
| `enemy_relay` | リレー | `relay.png` |
| `enemy_drainer` | ドレイナー | `drainer.png` |
| `enemy_purger` | パージャー | `purger.png` |
| `enemy_shielder` | シールダー | `shielder.png` |
| `enemy_scrib` | スクリブ | `scrib.png` |

共通構成目安:

- 生物モチーフ 60%
- 本来の業務機能 30%
- アーカイブ意匠 10%
- 一目で覚えられるシルエット
- 顔が認識できる
- 小型戦闘表示でも大型パーツが読める
- 通常敵は情報量を抑える
- 完全な金属ロボットにしない

Battle配置上、enemy masterは基本的に画面左方向へ意識を向けたポーズを推奨する。

## 8. 強敵 master art

transparent PNG、640×640推奨。

| Stable ID | 表示名 | runtime filename |
|---|---|---|
| `enemy_sentinel` | センチネル | `sentinel.png` |
| `enemy_auditor` | オーディター | `auditor.png` |

通常敵より:

- 大きい
- パーツ数が多い
- 発光部分が増える
- 人工性が高い

ただし大型ロボット化しない。

## 9. Boss master art

transparent PNG、768×768推奨。

| Stable ID | 表示名 | runtime filename |
|---|---|---|
| `enemy_boss_ogre_placeholder` | 門衛機《JANUS》 | `janus.png` |
| `enemy_boss_nereid` | 保全核《NEREID》 | `nereid.png` |
| `enemy_boss_mnemos` | 記録管理体《MNEMOS》 | `mnemos.png` |

JANUS:
- 閉じる / 門 / 判断 / 二面性
- 番犬 + 甲虫 + 門
- 巨大な四脚または多脚獣
- 正面部分が門扉のように閉じる

NEREID:
- 循環 / 水 / 保全 / 美しさ
- クラゲ・魚・海洋生物を連想する流線形
- 半透明パーツ
- 水滴状コア
- 第1エリアで最も美しい敵

MNEMOS:
- 記録 / 整理 / 静けさ / 矛盾排除
- 鳥 + 書物 + 浮遊端末
- 複数リング
- 薄い板状パーツ
- 仮面のような顔
- 怖さより近寄りがたい神聖さ

## 10. 背景

背景はCharacter/Enemyの正式Battleレイアウト確定後に制作する。
先にCharacter/Enemy透明素材を確定し、表示面積を実機で確認してから最終cropを決める。

必要画像:

| 用途 | ID/対応 | filename案 |
|---|---|---|
| 拠点 | BaseHome | `base_home.png` |
| Stage1 | `stage_sample_placeholder` | `stage_closed_route.png` |
| Stage2 | `stage_haruka_02` | `stage_circulation_district.png` |
| Stage3 | `stage_haruka_03` | `stage_record_tower.png` |

背景masterは2048px以上の長辺で制作する。

単一画像を無理に全画面比率へ引き延ばさず、
`background-size: cover`でcrop可能な安全領域を中央に設ける。

正式なportrait/landscape別書き出しの要否は、
Battle/Base正式UIの実機確認後に決定する。

## 11. 拠点背景

正式基準:

- 旧施設を人間が住めるよう再利用
- 大型窓
- 美しい旧壁面
- 埋込照明
- 情報パネル
- 木製棚
- 布
- 工具
- 手書き表示
- 植物
- 補修板
- ケーブル
- 暖色照明
- 「安全な場所」「帰ってきた」と感じる

6 hotspotを載せるため、主要人物や重要オブジェクトをhotspot中央へ重ねすぎない。

## 12. Stage背景

Stage1《閉ざされた連絡路》:
- 屋外
- 青空
- 植物
- 旧道路
- ガラス屋根
- 配送レーン
- 案内板
- 閉鎖ゲート
- 空色 + 白 + 灰 + 警告黄

Stage2《沈黙した循環区》:
- 水
- ガラス
- 白い設備
- パイプ
- 水槽
- 植物
- 冷却設備
- 青 + 白 + 透明感
- 人工的な水の聖域

Stage3《記録塔》:
- 高い天井
- 書庫
- 薄い発光板
- 浮遊表示
- 白 + 濃紺 + 淡い発光色
- 非常に整理され美しい

## 13. Image fallback

正式画像投入中もゲームを壊さない。

Character/Enemy:
- registry entryなし → 現在のテキスト/HP UIを表示
- image load失敗 → image領域を隠し、name/HPは残す

Background:
- assetなし/失敗 → 現在のCSS PLACEHOLDER gradientへfallback

一枚の画像破損でApp全体を起動不能にしない。

## 14. 実装順

ビジュアル基準§35を維持する。

1. 初期3人のシルエットラフ
2. 初期3人の正式Character art
3. 通常敵8種
4. 強敵2種
5. JANUS / NEREID / MNEMOS
6. Battle正式画像表示レイアウト
7. 拠点
8. Stage1〜3背景
9. 全素材統一感監査
10. iPhone / iPad実機監査

背景より先にBattle人物/Enemy表示領域を確定する。

## 15. 次工程

最初の画像制作はCharacter 3人。

まず3人を同一シートで比較できるシルエットラフを制作し、

- 智也 = 視覚的基準点
- 彩乃 = 軽量・前傾
- 駆 = 縦長・装備多め

が画像を縮小しても区別できることを確認する。

シルエット確定後に個別の正式ピクセルアートへ進む。
