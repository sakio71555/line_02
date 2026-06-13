# Loop 006: Staff Reply

## Status

API portion implemented in Loop 006. Admin UI and real LINE API sending remain out of scope for this loop.

## Goal

管理画面から担当者が返信し、LineClient mockで送信境界をテストできるようにする。

## Scope

- staff reply API
- `LineClient` interface利用
- `MockLineClient` によるテスト
- outbound message保存
- response_mode確認

## Out of scope

- LINE本番API呼び出し
- rich message
- 画像送信
- 担当者通知LINE

## Acceptance Criteria

- staff userのtenant_idとcustomerのtenant_idを照合する。
- 返信内容はoutbound messageとして保存される。
- テストではLINE APIを直接叩かない。
- `human_active` 中でも担当者操作の返信は許可される。
- `POST /api/admin/customers/:customerId/reply` が存在する。
- 開発用に `x-tenant-id` headerでtenantを判定する。
- 可能な範囲で `x-staff-id` headerをstaff messageに保存する。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- 存在しないcustomerと別tenantのcustomerは404を返す。
- request bodyの `body` が空文字、空白のみ、不正型の場合は400を返す。
- `line_user_id` がないcustomerには409を返す。
- MockLineClient送信成功時だけstaff messageを保存し、`response_mode` を `human_active` にする。
- MockLineClient送信失敗時はstaff messageを保存しない。

## Implementation Notes

- Loop 006ではAPI部分だけ実装済み。
- `LineClient.pushMessage` 境界を使い、デフォルトは `MockLineClient` を使う。
- `recordStaffTextReply` でstaff message保存、`last_staff_reply_at` 更新、`response_mode = human_active` 更新を行う。
- 本格認証、Next.js管理画面UI、Supabase接続、本番LINE API送信は未実装。

## Files likely affected

- `apps/api/**`
- `apps/admin/**`
- `packages/line/**`
- `packages/domain/**`
- `packages/db/**`
- `tests/integration/**`
- `docs/04_line_flows.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 006: staff replyを実装してください。管理画面からの担当者返信とLineClient mock境界だけを対象にし、LINE本番APIは呼ばないでください。
