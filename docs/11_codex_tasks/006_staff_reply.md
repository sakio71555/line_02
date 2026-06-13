# Loop 006: Staff Reply

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

## Files likely affected

- `apps/api/**`
- `apps/admin/**`
- `packages/line/**`
- `packages/domain/**`
- `packages/db/**`
- `tests/integration/**`
- `docs/04_line_flows.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 006: staff replyを実装してください。管理画面からの担当者返信とLineClient mock境界だけを対象にし、LINE本番APIは呼ばないでください。
