# Loop 008: Staff Notification

## Goal

担当者通知LINE用のNotifier interfaceとmockを作る。

## Scope

- StaffNotifier interface
- LINE group通知用payload型
- MockStaffNotifier
- alert発生時に通知候補を作る境界

## Out of scope

- LINE本番push API呼び出し
- 通知テンプレートの本格運用
- scheduler
- 管理画面通知UI

## Acceptance Criteria

- 通知payloadに `tenant_id`、customer_id、alert_idが入る。
- テストではLINE APIを直接叩かない。
- tenant mismatchの通知は作成されない。

## Files likely affected

- `packages/line/**`
- `packages/domain/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/04_line_flows.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 008: staff notificationを実装してください。担当者通知用interfaceとmockだけを作り、LINE本番API送信は実装しないでください。
