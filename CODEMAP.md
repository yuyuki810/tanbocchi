# CODEMAP
最終更新:フェーズ2A / 2026-11-04

## 概要
田んぼの生き物を個体で育てる箱庭シミュレーションゲーム。
半年（春夏・秋冬）の進行が時間駆動（1年=約15分、1季節=225秒）となり、時計が自動で進む。
途中で判断場面や農作業の節目で停止し、収穫・解放を行う。

## ファイル一覧
- `index.html` — アプリ全体のHTMLシェル / SVGステージ / UIコンテナ
- `vite.config.ts` — Vite設定 / __BUILD_DATE__ 注入
- `package.json` — 依存・スクリプト定義 / vitest
- `tsconfig.json` — TypeScript厳格設定 (strict: true)
- `src/main.ts` — エントリポイント / イベント委譲 / visibilitychange監視 / initState
- `src/style.css` — 全体スタイル / 季節バー / 時計操作ボタングループ / アニメーション
- `src/types.ts` — 全データ型定義 / ClockState, ScheduledEvent, SeasonName, GameState(v3)
- `src/feedback.ts` — フィードバックURL / 状況コード生成・クリップボード
- `src/data/timing.ts` — 季節の秒数設定 (SEASON_SECONDS) / 倍速 (SPEEDS) / MAX_FRAME_MS
- `src/data/sky.ts` — 季節ごとの空色パレット (SKY) / 滑らかな空色ブレンド (getInterpolatedSky)
- `src/data/species.ts` — 種の基礎パラメータ (SP: メダカ, カエル, ドジョウ)
- `src/data/traits.ts` — 特性データ (GOOD, BAD) / 生き物の名前リスト (NM)
- `src/data/shop.ts` — 解放アイテム定義 (UNLOCK_ITEMS, SHOP) / buyUnlockItem
- `src/data/scenes.ts` — 場面データ定義 (SCENE_DEFS: sign, meet, wx, wish)
- `src/data/evolution.ts` — 進化・成長ルール定義 (EVO_RULES) / 判定関数 checkEvolution
- `src/game/calc.ts` — 数値計算 (dodge, yo, surf, cap) / 乱数管理 (setRng, getRng, random)
- `src/game/clock.ts` — 時計ロジック (advanceClock, initClockState, getSeasonInfo, 割合マッピング)
- `src/game/state.ts` — 状態変数管理 (S, PREV, busy) / セーブv3 (migrations[2]: clock対応)
- `src/game/scenes.ts` — 場面共通実行 (executeScene, play) / 年次計画 (plan) / めあて (goalScene)
- `src/game/flow.ts` — 時間駆動半期進行 (startHalf, tickClock, finishHalf) / 一時停止・倍速 / 収穫 / 年明け
- `src/view/scene.ts` — SVGステージ描画 (paint: 空色補間) / アニメーションループ (loop: tickClock連携)
- `src/view/ui.ts` — UI生成 (季節バー, 一時停止/再開, 倍速ボタン, winterH, logH) / モーダル
- `tests/clock.test.ts` — 時計ロジック・時間駆動・発火・一時停止・巨大差分切り詰めの単体テスト
- `tests/dodge.test.ts` — 回避率計算 (dodge) の単体テスト
- `tests/harvest.test.ts` — 収穫計算 (harvest) の単体テスト
- `tests/plan.test.ts` — 場面計画 (plan) および choices: [] 場面の単体テスト
- `tests/evolution.test.ts` — 進化判定 (checkEvolution) の単体テスト
- `tests/save.test.ts` — セーブデータv3マイグレーション、clock補完、再開時二重適用防止の単体テスト
- `tests/goldenMaster.test.ts` — フェーズ1基準データとの挙動完全一致検証テスト
- `tests/goldenMasterData.json` — ゴールデンマスター基準データ (20半期分)

## データの流れ
1. **生成**: `src/game/state.ts` の `fresh()` または `load()` で `S` (GameState v3, clock含む) を生成。
2. **時間進行**: `src/view/scene.ts` の `loop()` から毎フレーム `tickClock(dtMs)` を呼び出し、`clock.ts` の `advanceClock` で経過秒を進める。
3. **場面発火**: 予定時刻割合に達すると時計が自動停止し、`executeScene` で場面を実行。解決後に時計再開。
4. **半期終了**: 半期合計秒に達すると `finishHalf` で変身チェックや収穫（秋冬）を行い、停止。
5. **描画**: `loop` 内で生き物の泳ぎを描画。`paint` で空色の滑らかな変化や稲を描画、`ui` で季節バーやコントローラーを描画。
6. **セーブ**: 半期開始時、場面解決後、一時停止時、タブ非表示時、10秒ごとに `save()` で localStorage に保存。

## 定義データの場所と足し方
- **時間の秒数・速度**: `src/data/timing.ts` の `SEASON_SECONDS` や `SPEEDS` を変更。
- **場面**: `src/data/scenes.ts` の `SCENE_DEFS` に `SceneDef` を1件追加。
- **解放アイテム**: `src/data/shop.ts` の `UNLOCK_ITEMS` に `UnlockItemDef` を1件追加。
- **進化・成長**: `src/data/evolution.ts` の `EVO_RULES` に `EvoRule` を1件追加。
- **種**: `src/data/species.ts` の `SP` に追加。

## セーブデータ
- スキーマバージョン: v3 (`schemaVersion: 3`, `ver: 3`)
- 移行処理: `src/game/state.ts` の `migrations[2]`。v2（clockなし）から clock 構造を安全に自動補完。
- 再開仕様: 読み込み後は常に `paused: true` で復帰。未消化イベントは保持され二重適用なし。

## テスト
- テスト実行: `npm test` (Vitest, 全7ファイル・32テスト)
  - `clock.test.ts`: 時計進行、一時停止、倍速、MAX_FRAME_MS切り詰め、場面自動発火、完了停止
  - `dodge.test.ts`: 回避率計算の上下限、各補正加算
  - `harvest.test.ts`: 収穫基本式、品種倍率、目標ボーナス、端数処理
  - `plan.test.ts`: 季節ごとの配置、条件外場面の除外、増やすめあて優先、choices: [] 動作
  - `evolution.test.ts`: 変身・年次成長、隠し→通常→既定の優先順位
  - `save.test.ts`: v1→v2→v3移行、clock補完、再開安全性、破損データ保護
  - `goldenMaster.test.ts`: 固定シード(42)による20半期シミュレーションの完全一致

## 既知の注意点・将来の余地
- **フェーズ2B以降の余地**:
  - 場面に季節（春/夏/秋/冬）を個別指定する余地: `src/types.ts` の `SceneDef.seasons` に `SeasonName` を許容可能。
  - 眺める出来事 (`choices: []`) の時間駆動への差し込み余地: `src/data/scenes.ts` および `src/game/scenes.ts` の `executeScene` が既に対応済み。
- prefers-reduced-motion 時の挙動や旅立ち個体の記録の拡張はフェーズ4・6で対応予定。
