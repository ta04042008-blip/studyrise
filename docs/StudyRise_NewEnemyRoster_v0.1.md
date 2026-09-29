# StudyRise 新規敵12体 実装台帳 v0.1

2026-09-29受領素材を、画像ファイル正式配置前に固定する実装台帳。
既存の `StudyRise_EnemyVisualClasses_v0.1.md` の No.01〜12 と同じ順序を使う。

> 重要: 画像バイナリが `public/assets/studyrise/enemies/` に存在するまで
> `enemyArtById` / EnemyDefinition へ未配置ファイルを登録しない。

| No. | stable ID（予約） | runtime filename（予約） | 仮称 | size | baseline | motion |
|---:|---|---|---|---|---|---|
| 01 | enemy_mech_crustacean | mech_crustacean.png | 機械甲殻類 | standard | ground | crawler |
| 02 | enemy_mech_moth | mech_moth.png | 機械蛾 | standard | hover | flying |
| 03 | enemy_mech_deer | mech_deer.png | 機械鹿 | large | ground | quadruped |
| 04 | enemy_mech_fox | mech_fox.png | 機械狐 | standard | ground | quadruped |
| 05 | enemy_mech_mantis | mech_mantis.png | 機械カマキリ | standard | ground | crawler |
| 06 | enemy_armored_turtle | armored_turtle.png | 重装甲カメ | large | ground | quadruped |
| 07 | enemy_mech_fish | mech_fish.png | 機械魚 | standard | hover | swimming |
| 08 | enemy_mech_lizard | mech_lizard.png | 機械トカゲ | standard | ground | crawler |
| 09 | enemy_mech_owl | mech_owl.png | 機械フクロウ | standard | ground | flying |
| 10 | enemy_heavy_quadruped | heavy_quadruped.png | 大型重装四足機械獣 | extra-large | ground | quadruped |
| 11 | enemy_arcane_orbiter | arcane_orbiter.png | 浮遊型魔術機械体 | large | hover | hover |
| 12 | enemy_aqua_manta | aqua_manta.png | 水属性大型飛翔・遊泳体 | extra-large | hover | swimming |

## 実装順序

1. 受領PNGを上表のruntime filenameへ対応付け、透過・余白・左向き・破損を確認する。
2. `public/assets/studyrise/enemies/` へ配置する。
3. 配置済みファイルだけ `enemyArtById` へ登録する。
4. EnemyDefinitionを追加し、既存ステージの戦闘バランスとは独立してステータスを監査する。
5. BattleScreenで size / baseline / motion / shadow / hit / KO / Turn Order を確認する。
6. asset resolver と BattleScreen の自動テストを追加する。
7. Stage2以降への配置は、世界観仕様書の敵役割とステージ構成を照合して別コミットで行う。

## 命名ルール

- stable IDはSave・Engineから参照され得るため、正式採用後は変更しない。
- runtime filenameはPresentation専用で、画像差し替え時もstable IDを維持する。
- 上表の日本語名は現時点ではデザイン識別用の仮称。ゲーム内正式名称は世界観・敵役割確定時に別途決定する。
- visualSizeは強さを意味しない。extra-largeでも戦闘数値はEnemyDefinition側で独立決定する。

## 画像受領状況

12デザインの素材受領を確認済み。チャット添付素材とNo.01〜12の最終対応は、
リポジトリへのバイナリ配置時に目視照合して固定する。
