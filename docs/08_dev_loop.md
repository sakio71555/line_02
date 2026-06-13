# Development Loop

このプロジェクトでは、ループエンジニアリングを最重要の開発方針にします。Codexでの開発は、1回に1タスクです。大きな機能を一度に実装せず、設計、実装、テスト、修正、レビュー、ドキュメント更新のループを小さく回します。

## 1ループの定義

1. `docs/11_codex_tasks/` の対象タスクを読む。
2. Scopeに書かれた範囲だけ実装する。
3. Out of scopeに書かれたものは実装しない。
4. 必要なテストを追加する。
5. `npx pnpm@10.12.1 lint` を実行する。
6. `npx pnpm@10.12.1 typecheck` を実行する。
7. `npx pnpm@10.12.1 test` を実行する。
8. 失敗した場合は原因を修正して再実行する。
9. READMEまたはdocsに反映する必要があれば更新する。
10. 最後に変更ファイル、実行コマンド、残リスク、次タスクを報告する。

## 検証コマンド方針

この環境ではdirect `pnpm` や `corepack` が使えない可能性があるため、Loop完了時の検証コマンドは当面 `npx pnpm@10.12.1` 経由で実行します。

- `npx pnpm@10.12.1 install`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

将来的に `corepack enable` などでpnpmが直接使える環境になった場合は、同じscriptをdirect `pnpm` コマンドへ置き換えて構いません。

UI loopではNext.js buildが必要になる場合があります。ただし、Loop 014のread-only UI foundationでは使用量節約のため、原則として `lint`、`typecheck`、`test`、`test:integration` を優先し、buildが必要な場合だけ理由を記録して実行します。

UI確認Loopでは、必要に応じて開発専用の `POST /api/dev/seed-demo-data` を使い、in-memoryにデモ顧客・デモメッセージを投入してread-only管理画面を確認します。このdemo seedは本番用途ではなく、`APP_ENV=production` または `NODE_ENV=production` では使えない前提です。

## 1. 仕様を書く

実装前に `docs/11_codex_tasks/` のタスクカードを確認します。必要なら `docs/` の設計書またはADRを更新します。

確認すること:

- Goal
- Scope
- Out of scope
- Acceptance Criteria
- Test requirements

## 2. 1タスクずつ実装

大きな機能を一度に作らず、DB、Webhook、管理画面、AIなどを小さく分けて進めます。

例:

1. DB schema
2. LINE webhook
3. 顧客一覧
4. 顧客タイムライン
5. 担当者返信
6. 未返信アラート
7. AI要約
8. AI返信下書き

## 3. テスト

テストでは外部APIを直接呼びません。

- LINEは `MockLineClient`
- AIは `MockAiProvider`
- Supabaseはrepository interfaceまたはtest DB

テスト観点:

- tenant_id分離
- LINE署名検証
- response_mode
- 未返信判定
- AIに渡す情報の範囲

## 4. 修正

テストやレビューで見つかった問題は、スコープ内で修正します。スコープ外の本番接続、UI本格実装、スクレイピングなどは勝手に足しません。

## 5. レビュー

レビューでは以下を確認します。

- tenant_idが抜けていないか
- AIに全tenant情報を渡していないか
- 外部APIをテストで呼んでいないか
- secretsをコミットしていないか
- 人間対応中にBOT返信しないか

## 6. commit

`npx pnpm@10.12.1 lint`、`npx pnpm@10.12.1 typecheck`、`npx pnpm@10.12.1 test` が通ったらcommitします。commit messageは機能単位で短く書きます。

## 7. 次タスク

完了後は次のCodexタスクカードへ進みます。前タスクで残ったリスクやTODOは、次タスクのScopeまたはAcceptance Criteriaへ反映します。

## 理想サイズ

良いサイズ:

- DBテーブル定義だけ
- LINE Webhook署名検証だけ
- メッセージ保存だけ
- 顧客一覧APIだけ
- 顧客詳細画面だけ
- 未返信判定だけ
- AI要約Providerだけ
- MockAiProviderだけ

避けるサイズ:

- LINE BOT全体を作る
- 管理画面もAIも全部作る
- RAGとLIFFと予約をまとめる
- とりあえず動くところまで一気に作る

## 今回の開発ループ順

1. Loop 000: scaffold
2. Loop 001: database schema
3. Loop 002: LINE webhook foundation
4. Loop 003: message logging
5. Loop 004: admin customer list
6. Loop 005: customer timeline
7. Loop 006: staff reply
8. Loop 007: unreplied alert
9. Loop 008: staff notification
10. Loop 009: AI summary
11. Loop 010: AI reply draft
12. Loop 011: RAG foundation
13. Loop 012: Amami Home knowledge import
14. Loop 013: LIFF forms
15. Loop 014: Amami-specific features
16. Loop 015: local dev runbook and demo seed
17. Loop 016: admin action UI foundation

## 完了報告フォーマット

```md
### 変更内容
- 

### 作成・変更ファイル
- 

### 実行コマンド
- npx pnpm@10.12.1 lint
- npx pnpm@10.12.1 typecheck
- npx pnpm@10.12.1 test

### テスト結果
- 

### tenant_id分離の確認
- 

### 外部API mock確認
- 

### 残リスク
- 

### 次に進むべきタスク
- 
```
