# Loop 016: Admin Action UI Foundation

## Goal

Loop 014のread-only管理画面とLoop 015のdemo seedを使い、顧客詳細画面からAI/RAG系アクションを開発確認できるようにする。

## Status

Implemented in Loop 016. AI summary, AI reply draft, and RAG answer draft can be executed from the admin customer detail screen through Server Actions. LINE sending UI and staff reply UI remain out of scope.

## Scope

- 顧客詳細画面のAI/RAG action UI
- AI要約実行
- AI返信下書き実行
- RAG回答案フォーム
- admin API helperのmutation拡張
- helper tests
- docs更新

## Out of scope

- LINE送信UI
- staff reply送信UI
- 本物のLINE push送信
- OpenAI API実呼び出し
- Supabase接続
- Supabase Auth
- JWT認証
- RLS実装
- LIFF
- Webクロール
- embedding生成
- 新規依存追加

## Acceptance Criteria

- 顧客詳細画面にAI要約アクションがある。
- 顧客詳細画面にAI返信下書きアクションがある。
- 顧客詳細画面にRAG回答案フォームがある。
- AI要約結果を画面で確認できる。
- AI返信下書きを画面で確認できる。
- RAG回答案とsourcesを画面で確認できる。
- LINE送信UIはない。
- staff reply送信UIはない。
- admin API helper testsがある。
- 外部LINE API、OpenAI API、Supabaseに接続しない。

## Implementation Notes

- 顧客詳細画面に `CustomerActionPanel` を追加。
- Client ComponentはServer Actionを呼び、Server Actionがadmin API helper経由でHono APIへPOSTする。
- `x-tenant-id` は既存のadmin API helperで付与する。
- AI要約は既存API仕様どおりsummary messageを保存する。成功後は画面更新でtimeline再取得を試みる。
- AI返信下書きとRAG回答案は保存せず、画面に結果を表示するだけ。
- RAG回答案のlimitは固定5。

## Files likely affected

- `apps/admin/**`
- `tests/integration/admin-api-client.test.ts`
- `docs/02_architecture.md`
- `docs/08_dev_loop.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build` if usage allows

## Codex Prompt

Loop 016: admin action UI foundationを実装してください。顧客詳細画面からAI要約、AI返信下書き、RAG回答案を開発確認できるUIだけに集中し、LINE送信UI、staff reply送信UI、本番AI接続、本番DB接続は実装しないでください。
