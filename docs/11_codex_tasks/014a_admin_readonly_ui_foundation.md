# Loop 014: Admin Read-only UI Foundation

## Goal

既存の管理APIをブラウザで確認できる、読み取り専用のNext.js管理画面土台を作る。

## Status

Read-only UI foundation implemented in Loop 014. Mutation UI, AI execution UI, RAG execution UI, auth, Supabase, LINE sending, and production API connection remain out of scope for this loop.

## Scope

- 管理画面トップ
- `/customers` 顧客一覧ページ
- `/customers/[customerId]` 顧客詳細・タイムラインページ
- admin API client helper
- helper単体テスト
- 最小CSS

## Out of scope

- staff reply送信UI
- AI要約ボタン
- AI返信下書きボタン
- RAG回答案テストUI
- 未返信アラートUI
- 担当者通知UI
- Supabase Auth
- JWT認証
- LINE API送信
- OpenAI API実呼び出し
- LIFF
- Tailwind導入
- Playwright導入

## Acceptance Criteria

- `apps/admin` にトップページがある。
- `/customers` ページがある。
- `/customers/[customerId]` ページがある。
- API client helperがある。
- API clientが `API_BASE_URL` defaultを持つ。
- API clientが `TENANT_ID` defaultを持つ。
- API clientが `x-tenant-id` headerを付ける。
- 顧客一覧、顧客詳細、タイムラインを表示できる構造になっている。
- UIはread-onlyで、mutation UIはない。
- OpenAI API、LINE API、Supabaseに接続しない。

## Implementation Notes

- Loop 014ではServer Componentsでread-onlyページだけを追加済み。
- `API_BASE_URL` defaultは `http://localhost:4000`。
- `TENANT_ID` defaultは `tenant_amamihome`。
- API fetchは `cache: "no-store"` と `x-tenant-id` headerを使う。
- buildは使用量節約のため未実行。typecheck/test中心で検証する。

## Files likely affected

- `apps/admin/**`
- `tests/integration/**`
- `docs/02_architecture.md`
- `docs/08_dev_loop.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 014: admin read-only UI foundationを実装してください。顧客一覧、顧客詳細、タイムラインを表示するread-only UIだけに集中し、送信UI、AI実行UI、RAG実行UI、本番認証、本番接続は実装しないでください。
