# Loop 017: Staff Reply UI Foundation

## Goal

管理画面の顧客詳細画面から、担当者が返信文を入力し、既存のstaff reply APIを開発確認できるようにする。

## Status

Implemented in Loop 017. The UI calls the existing staff reply API through a Server Action and admin API helper. Production LINE sending, production auth, and persistence remain out of scope.

## Scope

- `sendStaffReply` admin API helper
- staff reply Server Action
- 顧客詳細画面の担当者返信フォーム
- success/error表示
- timeline refresh
- helper tests
- docs and dev log update

## Out of scope

- 本物のLINE API送信
- LINE channel access token利用
- LINE group通知の本番実装
- OpenAI API実呼び出し
- Supabase接続
- Supabase Auth
- JWT認証
- RLS実装
- LIFF
- 画像処理
- 予約フォーム
- Webクロール
- embedding生成
- 新規依存追加
- 本番認証

## Acceptance Criteria

- 顧客詳細画面に担当者返信フォームがある。
- textareaに返信文を入力できる。
- Server Action経由でstaff reply APIを呼ぶ。
- admin API helperに `sendStaffReply` がある。
- `x-tenant-id` headerが付く。
- `x-staff-id` headerが付く。
- 成功/失敗がUIに表示される。
- 送信後にtimeline更新を試みる。
- LINE API、OpenAI API、Supabaseに直接接続しない。
- staff reply helper testsがある。
- dev logにLoop 017が追記されている。

## Implementation Notes

- UIには開発用Mock送信であることを表示する。
- `sendStaffReply` は `POST /api/admin/customers/:customerId/reply` へ `{ body }` をJSONで送る。
- `x-staff-id` のdefaultは `dev_staff`。
- apps/apiは変更せず、既存APIを利用する。

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build` if possible
