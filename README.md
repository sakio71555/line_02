# amami-line-crm

アマミホーム向けの「AI顧客カルテ付きLINE相談CRM」です。LINE公式アカウント、Webhook、Web管理画面、LIFFフォーム、AI要約・返信下書きをつなぎ、顧客ごとの相談履歴をカルテとして管理します。

## 初期tenant

- `tenant_id`: `tenant_amamihome`
- `tenant_slug`: `amamihome`
- `official_domain`: `amamihome.net`

初期導入先はアマミホーム1社ですが、将来ほかの工務店にも販売できるように、Phase 0からすべての主要データを `tenant_id` で分離します。

## 技術構成

- package manager: pnpm
- monorepo: pnpm workspace + Turborepo
- 管理画面: `apps/admin` Next.js
- API: `apps/api` Hono
- LIFF: `apps/liff` Next.js
- DB想定: Supabase PostgreSQL
- Storage想定: Supabase Storage
- AI: OpenAI API、Responses API前提の `AiProvider` 抽象化
- LINE: LINE Messaging API、Webhook、LIFF
- Test: Vitest
- E2E: 後続PhaseでPlaywright導入予定
- Lint/format: ESLint + Prettier

## セットアップ予定

Phase 0では開発レールと雛形だけを作ります。Supabase、LINE、OpenAIの本番接続はまだ行いません。

```bash
npx pnpm@10.12.1 install
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
```

この環境ではdirect `pnpm` や `corepack` が使えない可能性があるため、当面は `npx pnpm@10.12.1 ...` を標準コマンドとします。将来的に `corepack enable` などでpnpmが直接使える環境になった場合は、同じscriptを `pnpm install` や `pnpm lint` のようなdirect `pnpm` コマンドへ置き換えて構いません。

## 開発コマンド

- `npx pnpm@10.12.1 dev`: 各アプリのdev serverを起動
- `npx pnpm@10.12.1 build`: monorepo全体のbuild
- `npx pnpm@10.12.1 lint`: ESLint
- `npx pnpm@10.12.1 typecheck`: TypeScript typecheck
- `npx pnpm@10.12.1 test`: Vitest
- `npx pnpm@10.12.1 test:integration`: integration test
- `npx pnpm@10.12.1 format`: Prettier

## ローカル管理画面確認

Loop 015時点の管理画面はread-onlyです。ローカル確認ではAPIを先に起動し、開発専用のin-memory demo seedを投入してからadmin画面を開きます。

API server:

```bash
TENANT_ID=tenant_amamihome TENANT_SLUG=amamihome npx pnpm@10.12.1 --filter @amami-line-crm/api dev
```

Admin server:

```bash
API_BASE_URL=http://localhost:4000 TENANT_ID=tenant_amamihome npx pnpm@10.12.1 --filter @amami-line-crm/admin dev
```

Demo data seed:

```bash
curl -X POST http://localhost:4000/api/dev/seed-demo-data \
  -H "x-tenant-id: tenant_amamihome"
```

その後、以下を確認します。

- `http://localhost:3000/customers`: デモ顧客一覧
- `http://localhost:3000/customers/customer_demo_yamada_taro`: 未返信っぽいデモ顧客の詳細・タイムライン
- `http://localhost:3000/customers/customer_demo_sato_hanako`: 返信済みっぽいデモ顧客の詳細・タイムライン

`API_BASE_URL` はadminが参照するAPIのURL、`TENANT_ID` はadmin APIへ送る開発用tenantです。demo seedはin-memoryの開発確認専用で、API processを再起動すると消えます。`APP_ENV=production` または `NODE_ENV=production` では使えません。

詳しいローカル手動確認は [docs/15_runbooks/local_manual_test_checklist.md](docs/15_runbooks/local_manual_test_checklist.md) を参照してください。demo seedはin-memoryであり、API process再起動で消えます。本物のLINE API、OpenAI API、Supabaseはまだ呼びません。

## Codex開発ループ

このプロジェクトはループエンジニアリングで開発します。広範囲の機能を一度に実装せず、`docs/11_codex_tasks/` の小さいタスクを1つずつ完了し、テストを通してから次へ進みます。

1. `docs/11_codex_tasks/` の対象タスクを読む。
2. Scopeに書かれた範囲だけ実装する。
3. Out of scopeに書かれたものは実装しない。
4. 必要なテストを追加する。
5. `npx pnpm@10.12.1 lint` を実行する。
6. `npx pnpm@10.12.1 typecheck` を実行する。
7. `npx pnpm@10.12.1 test` を実行する。
8. 失敗した場合は原因を修正して再実行する。
9. READMEまたはdocsを必要に応じて更新する。
10. 変更ファイル、実行コマンド、残リスク、次タスクを報告する。

理想サイズは、DBテーブル定義だけ、LINE Webhook署名検証だけ、メッセージ保存だけ、顧客一覧APIだけ、AI要約Providerだけのような単位です。LINE BOT全体、管理画面、AI、RAG、LIFFをまとめて作る進め方は禁止です。

## 本番接続について

Phase 0では以下を行いません。

- LINE本番API呼び出し
- OpenAI APIの実呼び出し
- Supabase本番接続
- 本番ドメイン設定
- LIFF本番登録
- Webスクレイピング
- RAG embedding生成

LINE実機テストが必要になったら、開発段階では本番ドメインを用意せず、ngrokまたはCloudflare TunnelでWebhook URLを一時公開します。

## Supabase永続化について

Supabase PostgreSQLはDB想定ですが、現時点ではin-memory repositoryで動作しており、Supabase永続化は未実装です。Loop 020では実装前の導入計画だけを追加しました。詳細は [docs/11_codex_tasks/020_supabase_persistence_planning.md](docs/11_codex_tasks/020_supabase_persistence_planning.md) を参照してください。

Loop 021では `packages/db` にserver-side Supabase client boundaryを追加しました。ただし、まだrepository、API route、admin UI、LIFFには接続していません。詳細は [docs/11_codex_tasks/021_supabase_client_boundary.md](docs/11_codex_tasks/021_supabase_client_boundary.md) を参照してください。

## Secrets

APIキーやトークンはコミットしません。ローカル値は `.env` に置く想定ですが、`.env` は `.gitignore` で除外しています。共有するのは `.env.example` だけです。
