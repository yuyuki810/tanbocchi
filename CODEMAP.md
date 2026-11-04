# CODEMAP
最終更新:フェーズ1 / 2026-11-04

## 概要
田んぼの生き物を個体で育てる箱庭シミュレーションゲーム。
半年（春夏・秋冬）ごとに時間が進み、判断場面（手入れ/野生）を経て収穫・解放を行う。
見た目と遊びはベータ3を維持し、場面・解放・進化をデータ定義として分離。

## ファイル一覧
- `index.html` — アプリ全体のHTMLシェル / SVGステージ / UIコンテナ
- `vite.config.ts` — Vite設定 / __BUILD_DATE__ 注入
- `package.json` — 依存・スクリプト定義 / vitest追加
- `tsconfig.json` — TypeScript厳格設定 (strict: true)
- `src/main.ts` — エントリポイント / イベントリスナー委譲 / UIとデータ連携 / initState
- `src/style.css` — 全体スタイル / カラー変数 / ダークモード / SVGアニメーション
- `src/types.ts` — 全データ型定義 / Creature, GameState, SceneDef, ChoiceDef, EvoRule, UnlockItemDef
- `src/feedback.ts` — フィードバックURL / 状況コード生成・クリップボード
- `src/data/species.ts` — 種の基礎パラメータ (SP: メダカ, カエル, ドジョウ)
- `src/data/traits.ts` — 特性データ (GOOD, BAD) / 生き物の名前リスト (NM)
- `src/data/shop.ts` — 解放アイテム定義 (UNLOCK_ITEMS, SHOP) / 購入共通関数 buyUnlockItem
- `src/data/sky.ts` — 季節ごとの空色パレット (SKY)
- `src/data/scenes.ts` — 場面定義 (SCENE_DEFS: sign, meet, wx, wish)
- `src/data/evolution.ts` — 進化・成長ルール定義 (EVO_RULES) / 判定関数 checkEvolution
- `src/game/calc.ts` — 数値計算 (dodge, yo, surf, cap) / 乱数管理 (setRng, getRng, random, R, pick)
- `src/game/state.ts` — 状態変数管理 (S, PREV, busy, rsf) / セーブv2 (save, load, migrate) / fresh / add
- `src/game/scenes.ts` — 場面共通実行 (executeScene, play) / 年次計画 (plan) / めあて (goalScene)
- `src/game/flow.ts` — 半年進行 (half) / 収穫計算 (harvest) / 年明け処理 (spring)
- `src/view/scene.ts` — SVGステージ描画 (paint, sync, loop) / 演出 (heron, strike, party, ripple)
- `src/view/ui.ts` — UI生成 (ui, refresh) / シートモーダル (sheet, closeSheet, ask, choose, crH, winterH, logH)
- `tests/dodge.test.ts` — 回避率計算 (dodge) の単体テスト
- `tests/harvest.test.ts` — 収穫計算 (harvest) の単体テスト
- `tests/plan.test.ts` — 場面計画 (plan) および choices: [] 場面の単体テスト
- `tests/evolution.test.ts` — 進化判定 (checkEvolution) の単体テスト
- `tests/save.test.ts` — セーブデータv2マイグレーションの単体テスト
- `tests/goldenMaster.test.ts` — 変更前コードとの挙動完全一致検証テスト
- `tests/goldenMasterData.json` — ゴールデンマスター基準データ (20半期分)

## データの流れ
1. **生成**: `src/game/state.ts` の `fresh()` または `load()` で `S` (GameState) を生成。
2. **更新**: ユーザー操作や半年進行 (`flow.ts` の `half`, `spring`, `scenes.ts` の `executeScene`) で `S` を更新。
3. **セーブ**: 節目（半期末・年明け・買い物）ごとに `state.ts` の `save()` で localStorage に保存。
4. **描画**: 状態変化に応じて `view/scene.ts` (`paint`, `sync`) でSVG描画、`view/ui.ts` (`ui`, `refresh`) でDOM描画。

## 定義データの場所と足し方
- **場面**: `src/data/scenes.ts` の `SCENE_DEFS` に `SceneDef` を1件追加（choices: [] の眺める出来事も可）。ロジックの変更は不要。
- **解放アイテム**: `src/data/shop.ts` の `UNLOCK_ITEMS` に `UnlockItemDef` を1件追加。価格・効果・条件・将来の種別を設定可能。
- **進化・成長**: `src/data/evolution.ts` の `EVO_RULES` に `EvoRule` を1件追加（priority: 'hidden' | 'normal' | 'default'）。判定ロジックの変更は不要。
- **種**: `src/data/species.ts` の `SP` に種名と基礎値（y, d）を追加。

## セーブデータ
- スキーマバージョン: v2 (`schemaVersion: 2`, `ver: 2`)
- 移行処理: `src/game/state.ts` の `migrations` 連鎖辞書。v1から全データを欠落なく引き継ぎ。
- 項目を足す手順:
  1. `src/types.ts` の `GameState` 型に項目を追加
  2. `src/game/state.ts` の `migrations` に移行関数 `N: (vN) => ({ ...vN, schemaVersion: N+1, ... })` を追加
  3. `CURRENT_SCHEMA_VERSION` をインクリメント
  4. `tests/save.test.ts` に移行テストを追加

## テスト
- テスト実行: `npm test` (Vitest)
- テストファイル: `tests/*.test.ts`
  - `dodge.test.ts`: 基本式、上下限(5〜95%)、各補正の加減算
  - `harvest.test.ts`: 基本式、倍率補正、端数処理、目標ボーナス
  - `plan.test.ts`: 季節ごとの配置、条件外場面の除外、増やすめあて優先、choices: [] 動作
  - `evolution.test.ts`: 変身・年次成長、隠し→通常→既定の優先順位、境界値
  - `save.test.ts`: v1見本データ移行、未知項目保持、破損・空データ保護
  - `goldenMaster.test.ts`: 固定シード(42)による20半期シミュレーションの完全一致

## 既知の注意点
- 未使用変数 `ids` はフェーズ1で削除済み。
- 乱数は `src/game/calc.ts` の `setRng` / `random` 経由で差し替え可能。本番は `Math.random`、テスト時は固定PRNGを使用。
- prefers-reduced-motion 時の挙動や旅立ち個体の記録の拡張はフェーズ4・6で対応予定。
