# StudyRise Asset Manifest v0.1

状態: 監査結果 + 実装計画（未実装）
対象: post-MVP 正式ビジュアルアセット投入フェーズの事前準備
基準仕様: StudyRise_Spec_v0.11.md §17.15 / ストーリー・世界観仕様書 v0.2/v0.2.1/v0.2.2 / ビジュアルデザイン基準 v0.1

> このドキュメントは監査と計画のみ。画像ファイルの追加、コード変更、Save
> schema変更、Definition ID変更は一切行っていない。

---

## 1. 現状監査サマリー

リポジトリ全体を検索した結果、**画像を表示する仕組みは現時点で一切存在しない**。

確認した事実:

- `<img>` タグ: 0件
- `background-image` / CSS `url()`: 0件
- `public/` ディレクトリ: 存在しない
- `src/assets/`: 存在しない
- 画像ファイル（png/webp/jpg/svg/gif）: リポジトリ内に0件
- `CharacterDefinition` / `EnemyDefinition` / `EquipmentDefinition` /
  `ItemDefinition` / `StageDefinition` / `AreaDefinition`
  のいずれにも `image` / `icon` / `sprite` / `portrait` フィールドは存在しない

現在の「ビジュアル」はすべてテキスト/CSSのプレースホルダー:

- 拠点背景: `BaseHomeScreen.tsx` の `<div className="base-home__background">`
  （`aria-label="拠点ホーム背景（PLACEHOLDER）"`、実体は
  `linear-gradient` のCSSグラデーションのみ、画像なし）
- キャラクター/敵: `CharacterListView` / `BattleScreen` とも名前テキスト +
  HPバーのみ
- コマンド演出: `CommandAnimationView.tsx` はテキストのみ（コメントで
  「MVP-1/2has no real animation art yet」と明記）

### 1.1 項目別の現状

| # | 項目 | 現状 |
|---|---|---|
| 1 | 使用中の画像/placeholder画像 | なし（テキスト/CSSのみ） |
| 2 | Character画像の参照方法 | 存在しない |
| 3 | Enemy画像の参照方法 | 存在しない |
| 4 | Stage背景画像の参照方法 | 存在しない（戦闘画面に背景要素自体がない） |
| 5 | Base背景画像の参照方法 | 存在しない（CSSグラデーションのみ） |
| 6 | アイコン類の参照方法 | 存在しない |
| 7 | 画像ファイルの保存ディレクトリ | 存在しない（`public/` 未作成） |
| 8 | Definition IDと画像の紐付け方法 | 存在しない（該当フィールドなし） |
| 9 | 画像なし時のfallback処理 | 存在しない（そもそも画像読み込み処理がない） |
| 10 | 推奨画像サイズ/アスペクト比 | 未定義（§3で新規提案） |
| 11 | 現在のCSS上の表示サイズ | 拠点背景のみ定義あり（§2.5参照） |
| 12 | スマホ/iPad表示差 | 拠点背景のみ `@media (min-width:768px)` で分岐 |
| 13 | Save V1への影響 | 影響なし（§4で根拠を示す） |
| 14 | asset manifest | 本書§5〜§7 |

---

## 2. Definition ID → 画像の紐付け方法（調査結果）

### 2.1 Stable ID の実態

すべてのcontentはstable IDで一元管理されている（CLAUDE.md §15準拠）。

- Character: `sampleParty` (3件、`CharacterDefinition.id`)
- Enemy: `enemyDefinitionsById`（`src/data/enemies/enemyDefinitionsById.ts`、
  13件を一つのRecordに集約済み）
- Stage: `StageDefinition.id`（`sampleStagesById`、3件）
- Area: `AreaDefinition.id`（1件）

いずれも**表示名（日本語名）ではなくIDで参照**されており、CLAUDE.md §15
（「日本語表示名をpersistence keyに使わない」）に違反していない。画像を
IDで紐付けても、この既存原則と衝突しない。

### 2.2 `BattleActor.definitionId` は利用できるか → **利用できる**

`src/engine/battle/BattleEngine.types.ts:138`:

```ts
export interface BattleActor {
  id: string;               // battle-local instance id（画像キーには不適）
  definitionId?: string;    // stable content id（画像キーに使える）
  name: string;
  kind: 'player' | 'enemy';
  ...
}
```

`BattleEngine.ts` 内の実際のactor生成箇所（プレイヤー生成/敵生成の両方）で
必ず `definitionId: def.id` が設定されている（`?` は手書きテストfixture用の
余地であり、本番のBattleEngineが作るactorは常に設定済み）。

したがって:

- `state.players[].definitionId` → `char_hero_placeholder` 等
- `state.enemies[].definitionId` → `enemy_slime_placeholder` 等

を画像解決キーとしてそのまま使える。ただし型上 `optional` なので、UI側の
解決関数は `definitionId` が `undefined` の場合のfallback処理を必ず持つ
必要がある（テストfixtureや将来の想定外ケースに対する安全策）。

`isBoss` はBattleActorには伝播していない（`EnemyDefinition.isBoss` にのみ
存在）。ただし画像解決は「IDごとに個別ファイルを紐付ける」方式にするため、
ボス演出を画像の切り分けだけで表現するなら `isBoss` を参照する必要はない
（JANUSは`enemy_boss_ogre_placeholder`という個別IDに個別画像を割り当てる
だけで済む）。

### 2.3 画像参照はどこに置くべきか

`CharacterDefinition` / `EnemyDefinition` 等の型に `imageId` フィールドを
追加する案は**採用しない**。理由:

- CLAUDE.md §1「実装都合でゲームデータ構造を変えない」に抵触しうる
- 型を変えると既存のcontent定義ファイル全件に手を入れる必要が生じ、
  「最小差分」の要求に反する
- Save V1のcontent定義には影響しないが、diffが不必要に大きくなる

代わりに、**UI層だけで完結する「ID→パス」解決関数**を新設する
（既存の型・データ・エンジンには一切手を入れない）。

```ts
// 新規ファイル（実装フェーズで追加、今回は作成しない）
// src/ui/assets/imagePaths.ts
export function characterImagePath(characterId: string): string {
  return `/assets/studyrise/characters/${characterId}.png`;
}
export function enemyImagePath(enemyDefinitionId: string): string {
  return `/assets/studyrise/enemies/${enemyDefinitionId}.png`;
}
export function stageBackgroundPath(stageId: string): string {
  return `/assets/studyrise/backgrounds/${stageId}.png`;
}
export const BASE_HOME_BACKGROUND_PATH = '/assets/studyrise/backgrounds/base_home.png';
```

ファイル名 = Definition IDという機械的な1:1変換なので、対応表を別途保守
する必要がなく、IDが変わらない限り新規enemy/characterを追加しても関数は
無改修で済む。

---

## 3. `public/assets/studyrise/` 推奨構成

Vite設定 (`vite.config.ts`) は `publicDir` を上書きしていないため、既定の
`public/` がそのままビルド時に静的コピーされ、`/xxx` のルート絶対パスで
参照できる。`src/` 側の `import img from './x.png'` 方式は**採用しない**
（下記4.1で理由を説明）。

```
public/
  assets/
    studyrise/
      characters/
        char_hero_placeholder.png     # 葉山智也
        char_mage_placeholder.png     # 南雲彩乃
        char_knight_placeholder.png   # 岡村駆
      enemies/
        enemy_slime_placeholder.png   # ランナー
        enemy_goblin_placeholder.png  # ウォッチャー
        enemy_clamp.png               # クランプ
        enemy_relay.png               # リレー
        enemy_drainer.png             # ドレイナー
        enemy_purger.png              # パージャー
        enemy_shielder.png            # シールダー
        enemy_scrib.png               # スクリブ
        enemy_sentinel.png            # センチネル（強敵）
        enemy_auditor.png             # オーディター（強敵）
        enemy_boss_ogre_placeholder.png  # 門衛機《JANUS》
        enemy_boss_nereid.png            # 保全核《NEREID》
        enemy_boss_mnemos.png            # 記録管理体《MNEMOS》
      backgrounds/
        base_home.png                 # 拠点
        stage_sample_placeholder.png  # Stage1《閉ざされた連絡路》
        stage_haruka_02.png           # Stage2《沈黙した循環区》
        stage_haruka_03.png           # Stage3《記録塔》
```

`base_home` はDefinition IDではない（拠点は`AreaDefinition`/`StageDefinition`
のような独立IDを持たない単一画面のため）。既存コードに存在しない固定文字列
キーとして新設する必要がある — ここだけがIDの機械変換で賄えない例外。

---

## 4. Save V1・ゲームロジックへの影響

### 4.1 Save V1への影響: なし

`SaveEnvelope<T>`（`schemaVersion` + `savedAt` + `payload`）を確認した結果、
`PermanentSave` / `RunSave` の payload は stable ID
（`characterId` / `definitionId` / `instanceId` 等）のみを保持しており、
表示名・画像・見た目情報は一切保存していない。

画像解決を「IDから静的パスを機械的に導出する関数」として実装する限り:

- 画像はDBやSaveに一切書き込まれない（常にIDから都度導出）
- Definition IDを変更しない限り、画像ファイルの追加/差し替え/削除は
  SaveEnvelopeのpayload構造に一切触れない
- `schemaVersion` を上げる必要がない

### 4.2 ゲームロジックへの影響: なし（設計上の保証）

画像解決関数はUI層（`src/ui/`）だけに置き、`BattleEngine` /
`RogueliteEngine` / `StageEngine` / `ProgressionSystem` / `SaveSystem`
のいずれからも呼び出さない。CLAUDE.md §9（UI/ロジック分離）と同じ境界を
そのまま流用するだけなので、新しい設計判断は不要。

正式画像を後から1枚ずつ `public/assets/studyrise/...` に配置する行為は
**ファイルの追加のみ**であり、対応するコードは（Phase B/C完了後は）
一切変更不要になる。

---

## 5. 画像欠損・読み込み失敗時のfallback

現状、画像読み込みという概念自体が存在しないため、fallback処理も存在しない。
実装フェーズでは以下を新設する（CLAUDE.md §19: 1件の不良アセットで
アプリ全体を止めない）。

```tsx
// 新規（実装フェーズで追加）: src/ui/assets/GameImage.tsx
function GameImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`${className ?? ''} game-image--fallback`} aria-label={alt} />;
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
```

- `public/` 配下の欠損ファイルはビルドを失敗させない（Viteは存在チェック
  をしない、単なる静的コピー）。
- ブラウザの `<img onError>` でCSSプレースホルダー（現行の
  `base-home__background` と同じグラデーション/枠線パターン）へ自動的に
  切り替える。
- 1体の敵/1人のキャラクターの画像が壊れていても他の画面・他のアセットに
  波及しない（コンポーネント単位でstateが閉じているため）。

---

## 6. iPhone / iPad レスポンシブへの影響

既存の唯一の前例は拠点背景:

```css
.base-home__background {
  aspect-ratio: 3 / 4;              /* スマホ縦 */
}
@media (min-width: 768px) {
  .base-home__background {
    aspect-ratio: 16 / 9;           /* iPad横 */
  }
}
```

これは「アスペクト比が変わる」パターン。背景画像を1枚（横長）用意し、
`object-fit: cover` で両アスペクト比に対応させるのが最小差分（ファイルを
アスペクト比ごとに2枚用意する方式は採用しない — 画像制作コストが単純に
倍になり、CLAUDE.md §23「不要な拡張をしない」に反する）。

Stage背景・キャラクター/敵アートも同じ `object-fit: cover`
戦略を踏襲する前提で推奨サイズを決める（§7参照）。

---

## 7. 推奨画像サイズ・ファイル名・紐付け先ID

画風基準（ビジュアルデザイン基準v0.1 §31: 中密度2Dピクセルアート）に基づく。

| カテゴリ | 推奨サイズ | 比率 | 背景 | 形式 |
|---|---|---|---|---|
| Character | 512×512px | 1:1 | 透過 | PNG |
| 通常敵/強敵 | 512×512px | 1:1 | 透過 | PNG |
| Boss | 768×768px | 1:1 | 透過 | PNG |
| 拠点/Stage背景 | 1600×900px | 16:9 | 不透過 | PNG または WebP |

※ 仕様書§12.10のWebP標準は「資料問題の画像」専用の基準であり、
キャラクター/敵/背景アートには適用されない（範囲外）。背景アートは
容量が大きくなりやすいためWebPを推奨するが、PNGでも動作上問題はない
（デザイン担当の判断に委ねる実装詳細）。

### 7.1 対象アセット一覧（Definition ID / 表示名 / ファイル名）

**プレイアブル**

| Definition ID | 表示名 | ファイル名 |
|---|---|---|
| `char_hero_placeholder` | 葉山智也 | `characters/char_hero_placeholder.png` |
| `char_mage_placeholder` | 南雲彩乃 | `characters/char_mage_placeholder.png` |
| `char_knight_placeholder` | 岡村駆 | `characters/char_knight_placeholder.png` |

**通常敵**

| Definition ID | 表示名 | ファイル名 |
|---|---|---|
| `enemy_slime_placeholder` | ランナー | `enemies/enemy_slime_placeholder.png` |
| `enemy_goblin_placeholder` | ウォッチャー | `enemies/enemy_goblin_placeholder.png` |
| `enemy_clamp` | クランプ | `enemies/enemy_clamp.png` |
| `enemy_relay` | リレー | `enemies/enemy_relay.png` |
| `enemy_drainer` | ドレイナー | `enemies/enemy_drainer.png` |
| `enemy_purger` | パージャー | `enemies/enemy_purger.png` |
| `enemy_shielder` | シールダー | `enemies/enemy_shielder.png` |
| `enemy_scrib` | スクリブ | `enemies/enemy_scrib.png` |

**強敵**

| Definition ID | 表示名 | ファイル名 |
|---|---|---|
| `enemy_sentinel` | センチネル | `enemies/enemy_sentinel.png` |
| `enemy_auditor` | オーディター | `enemies/enemy_auditor.png` |

**Boss**

| Definition ID | 表示名 | ファイル名 |
|---|---|---|
| `enemy_boss_ogre_placeholder` | 門衛機《JANUS》 | `enemies/enemy_boss_ogre_placeholder.png` |
| `enemy_boss_nereid` | 保全核《NEREID》 | `enemies/enemy_boss_nereid.png` |
| `enemy_boss_mnemos` | 記録管理体《MNEMOS》 | `enemies/enemy_boss_mnemos.png` |

**背景**

| キー | 表示名 | ファイル名 |
|---|---|---|
| `base_home`（固定キー、Definition IDではない） | 拠点 | `backgrounds/base_home.png` |
| `stage_sample_placeholder` | 閉ざされた連絡路（Stage1） | `backgrounds/stage_sample_placeholder.png` |
| `stage_haruka_02` | 沈黙した循環区（Stage2） | `backgrounds/stage_haruka_02.png` |
| `stage_haruka_03` | 記録塔（Stage3） | `backgrounds/stage_haruka_03.png` |

合計20アセット（spec §17.15の対象リストと一致）。

---

## 8. 実際に変更が必要になるファイル一覧（実装フェーズ用、未着手）

新規追加のみ、既存ロジック・型・Save構造には触れない。

| ファイル | 種別 | 内容 |
|---|---|---|
| `public/assets/studyrise/**` | 新規ディレクトリ | §3の構成を作成（最初は空でも可） |
| `src/ui/assets/imagePaths.ts` | 新規 | ID→パス変換の純関数（§2.3） |
| `src/ui/assets/GameImage.tsx` | 新規 | fallback付き`<img>`ラッパー（§5） |
| `src/ui/base/BaseHomeScreen.tsx` | 小改修 | 既存の`div`背景を`GameImage`背景に差し替え |
| `src/App.css` | 小改修 | `base-home__background`にobject-fit用ルール追加、`.game-image--fallback`追加 |
| `src/ui/base/CharacterListView.tsx` | 小改修 | 各行に`GameImage(characterImagePath(character.id))`を追加 |
| `src/ui/base/CharacterDetailView.tsx` | 小改修 | 詳細画面にポートレート追加 |
| `src/ui/battle/BattleScreen.tsx` | 小改修 | players/enemies表示に`GameImage(...actor.definitionId)`を追加 |
| `src/ui/base/StageSelectScreen.tsx` | 小改修（任意） | ステージ一覧にサムネイル背景を追加 |

BattleEngine / RogueliteEngine / StageEngine / ProgressionSystem /
SaveSystem / content data（`src/data/**`）/ 型定義
（`BattleEngine.types.ts`等）は**変更対象に含まれない**。

---

## 9. 最小差分での実装計画（フェーズ分割）

1. **Phase A（今回・完了）**: 監査のみ。コード変更なし。
2. **Phase B**: `imagePaths.ts` と `GameImage.tsx` を新設するのみ。
   画像ファイルはまだ置かない → `GameImage`は常にfallback表示になるが、
   見た目は現状のプレースホルダーと実質同じなので**既存の見た目を壊さない**。
   ここでtypecheck/build/既存testが通ることを確認する。
3. **Phase C**: 各UIコンポーネントへ`GameImage`呼び出しを1箇所ずつ追加
   （BaseHomeScreen → CharacterListView → BattleScreen の順、影響範囲が
   小さい順）。画像ファイルはまだ無いため、動作確認はfallback表示で行う。
4. **Phase D（このドキュメントの対象外）**: 正式画像ファイルを
   `public/assets/studyrise/...` に1枚ずつ追加。**コード変更は不要**。
   ファイルを置いた瞬間にfallbackから実画像へ自動的に切り替わる。

Phase B/CはUI層のみの追加的変更であり、CLAUDE.md §23
（大規模リファクタ禁止）に抵触しない規模に収まる。

---

## 10. 「画像を1枚受け取ったら、どこに置き、どのIDへ紐付けるか」

具体例: 葉山智也の正式ポートレートを1枚受け取った場合。

1. ファイルを 512×512px, 背景透過PNG に整える。
2. `public/assets/studyrise/characters/char_hero_placeholder.png` として
   保存する（ファイル名は`CharacterDefinition.id`と完全一致させる — 現在
   `src/data/characters/sampleCharacter.ts`で`id: 'char_hero_placeholder'`）。
3. コードは一切変更しない（Phase B/C実装済みなら`characterImagePath('char_hero_placeholder')`
   が自動的にこのファイルを指す）。
4. ブラウザで拠点→キャラクター画面を開き、表示を目視確認する。

敵の場合も同様: 例えば「ランナー」の画像を受け取ったら、ファイル名を
`enemy_slime_placeholder.png`にして`enemies/`配下に置くだけでよい
（`src/data/enemies/sampleEnemy.ts`の`id: 'enemy_slime_placeholder'`と一致）。

拠点背景を受け取った場合は`backgrounds/base_home.png`、Stage1背景なら
`backgrounds/stage_sample_placeholder.png`（`src/data/stages/sampleStage.ts`
の`id`と一致）に置く。

いずれのケースも、**ファイル名をDefinition ID（または拠点用の固定キー
`base_home`）と一致させて正しいディレクトリに置くだけ**で表示され、
コード修正・Save影響・ID変更は一切発生しない。
