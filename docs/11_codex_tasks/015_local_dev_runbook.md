# Loop 015: Local Dev Runbook and Demo Seed

## Goal

Loop 014のread-only管理画面をローカルで確認しやすくするため、開発専用のin-memory demo seedと確認手順を整備する。

## Status

Implemented in Loop 015. Demo seed is development-only and does not connect to Supabase, LINE, OpenAI, or external websites.

## Scope

- `POST /api/dev/seed-demo-data`
- production-like runtimeでのdev seed無効化
- `x-tenant-id` による開発用tenant確認
- `tenant_amamihome` 用のデモ顧客2件
- デモメッセージ4件
- READMEのローカル確認runbook
- dev loop docsのUI確認方針
- integration tests

## Out of scope

- 本番用seed
- Supabase接続
- LINE API送信
- OpenAI API実呼び出し
- RAG回答UI
- AI要約UI
- AI下書きUI
- staff reply送信UI
- 認証本実装
- JWT
- RLS
- LIFF
- Webクロール

## Acceptance Criteria

- `APP_ENV=production` または `NODE_ENV=production` ではdev seedを使えない。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- `tenant_amamihome` でデモ顧客とデモメッセージが作成される。
- 作成されたcustomerとmessageには `tenant_id` が入る。
- `GET /api/admin/customers` でデモ顧客が見える。
- `GET /api/admin/customers/:customerId/timeline` でデモメッセージが見える。
- 外部LINE API、OpenAI API、Supabaseに接続しない。

## Implementation Notes

- デモ顧客は `customer_demo_yamada_taro` と `customer_demo_sato_hanako`。
- `customer_demo_yamada_taro` は未返信確認用に `response_mode = human_required`、`last_staff_reply_at = null`。
- `customer_demo_sato_hanako` は返信済み確認用に `response_mode = human_active`、`last_staff_reply_at` あり。
- デモseedは既存のin-memory repositoryへ保存するため、API processを再起動すると消える。
- apps/adminは変更せず、既存のread-only UIから確認する。

## Files likely affected

- `apps/api/**`
- `tests/integration/**`
- `README.md`
- `docs/08_dev_loop.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 015: local dev runbook and demo seedを実装してください。開発専用のin-memory demo seedとREADMEの確認手順だけに集中し、本番seed、外部API接続、UIアクション追加は実装しないでください。
