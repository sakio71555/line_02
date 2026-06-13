# Loop 008: Staff Notification

## Status

API/domain portion implemented in Loop 008. Real LINE sending, scheduler, UI, and Supabase persistence remain out of scope for this loop.

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
- `POST /api/admin/alerts/notify-open` が存在する。
- 開発用に `x-tenant-id` headerでtenantを判定する。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- known tenantの `status = open` alertだけを通知対象にする。
- `notified` / `resolved` / `dismissed` alertは通知対象外にする。
- 通知成功したalertは `status = notified` になり、`notified_at` が入る。
- 通知失敗したalertは `status = open` のままにする。
- 通知メッセージにalert type、severity、customer_id、alert message、管理画面URL placeholderを含める。

## Implementation Notes

- Loop 008ではAPI/domain部分だけ実装済み。
- `StaffNotifier` と `MockStaffNotifier` を追加。
- `notifyOpenAlerts` でtenant scopedなopen alertを通知し、成功したalertだけ `notified` に更新する。
- 実LINE API送信、LINE group id本番利用、scheduler、Next.js管理画面UI、Supabase接続は未実装。

## Files likely affected

- `packages/line/**`
- `packages/domain/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/04_line_flows.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 008: staff notificationを実装してください。担当者通知用interfaceとmockだけを作り、LINE本番API送信は実装しないでください。
