# AGENTS.md

このプロジェクトは、アマミホーム向けの「AI顧客カルテ付きLINE相談CRM」です。Codexは毎回このファイルを読み、以下の制約を守って作業してください。

## Most Important Policy: Loop Engineering

This project must be built by loop engineering. Never implement broad features in one pass. Always complete one small documented task with tests before moving to the next task.

このプロジェクトはループエンジニアリングで開発する。広範囲の機能を一度に実装してはいけない。必ず `docs/11_codex_tasks/` の小さいタスクを1つずつ完了し、テストを通してから次へ進むこと。

1ループは以下で完了とします。

1. `docs/11_codex_tasks/` の対象タスクを読む。
2. Scopeに書かれた範囲だけ実装する。
3. Out of scopeに書かれたものは実装しない。
4. 必要なテストを追加する。
5. `npx pnpm@10.12.1 lint` を実行する。
6. `npx pnpm@10.12.1 typecheck` を実行する。
7. `npx pnpm@10.12.1 test` を実行する。
8. 失敗した場合は原因を修正して再実行する。
9. 実装内容をREADMEまたはdocsに反映する必要があれば更新する。
10. 必要に応じて `docs/14_dev_logs/YYYY-MM-DD.md` に作業ログを追記する。
11. 最後に変更ファイル、実行コマンド、残リスク、次タスクを報告する。

## Standard Commands

この環境ではdirect `pnpm` や `corepack` が使えない可能性があるため、当面は以下を標準コマンドとします。

- `npx pnpm@10.12.1 install`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

将来的に `corepack enable` などでpnpmが直接使える環境になった場合は、同じscriptを `pnpm lint` のようなdirect `pnpm` コマンドへ置き換えて構いません。

## Project Rules

- 初期tenantは `tenant_amamihome`、tenant slugは `amamihome`、公式ドメインは `amamihome.net`。
- 初期導入先はアマミホーム1社だが、将来ほかの工務店にも販売できるように最初からマルチテナント前提で設計する。
- `customers`、`messages`、`consultations`、`alerts`、`knowledge_pages`、`construction_cases`、`reservations`、`staff_users` など、すべての主要データに `tenant_id` を持たせる。
- API、DB、RAG検索、AI入力のすべてで `tenant_id` 分離を壊さない。AIに会社やテナントを選ばせない。
- AIはOpenAI APIを使う。実装はResponses API前提の抽象化にし、モデル名は `OPENAI_MODEL` から読む。
- OpenAI APIキー、LINE channel secret、LINE access token、Supabase service role keyなどのsecretsをコミットしない。`.env` は作らず `.env.example` だけを管理する。
- テストでは外部APIを直接呼ばない。LINE API、OpenAI API、Supabase本番環境は必ずinterface化してmockする。
- LINE webhookでは署名検証を必ず行う。署名検証前にイベントを信頼しない。
- 人間対応中にBOTが勝手に返信しない。`response_mode` が `human_required`、`human_active`、`emergency` の場合は自動返信を止める。
- AIの初期役割は会話要約、返信下書き、次アクション提案。自動返信は人間確認の運用が固まるまで慎重に扱う。
- 変更後は可能な限り `npx pnpm@10.12.1 lint`、`npx pnpm@10.12.1 typecheck`、`npx pnpm@10.12.1 test` を実行する。

## Work Style

- 1タスクずつ実装し、スコープ外の本番接続やスクレイピングを足さない。
- 仕様、テスト、実装、ドキュメントを同じ変更セットで揃える。
- 不確かな住宅価格、補助金可否、土地・建売在庫、契約条件、保証判断をAIで断定しない。
- 後続Codexタスクは `docs/11_codex_tasks/` のタスクカードを起点に進める。
- Loop完了時は、必要に応じて `docs/14_dev_logs/YYYY-MM-DD.md` に作業ログを追記する。
- 作業ログはObsidianで見返すためのMarkdown記録であり、プロダクト機能ではない。
- 作業ログには実顧客情報、LINE userId、APIキー、`.env`、本番ログを書かない。
- 作業ログには完了報告の要点、テスト結果、tenant_id分離、外部API mock確認、残リスク、次Loopを書く。

## Loop Report Format

各ループ完了時は、必ず以下の形式で報告してください。

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
