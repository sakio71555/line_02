# Loop 007: Unreplied Alert

## Status

API/domain portion implemented in Loop 007. Staff LINE notification, scheduler, UI, and Supabase persistence remain out of scope for this loop.

## Goal

未返信判定とalerts保存を実装する。

## Scope

- 最新inbound messageと最新staff/bot outbound messageの比較
- `waiting_staff` または `human_required` の未対応判定
- alert作成、解決、再オープンの最小ルール
- tenant scopedなalert repository

## Out of scope

- 担当者LINE通知
- cron/scheduler本実装
- UI本格実装
- AIリスク判定

## Acceptance Criteria

- tenant_idごとに未返信判定される。
- 他tenantのmessageでalert状態が変わらない。
- 返信後に該当alertを解決できる。
- テストで時刻条件を固定する。
- `POST /api/admin/alerts/check-unreplied` が存在する。
- 開発用に `x-tenant-id` headerでtenantを判定する。
- `x-tenant-id` なしは401、unknown tenantは403を返す。
- known tenantのcustomerだけを判定対象にする。
- `human_required` / `human_active` は最後のお客様メッセージから30分以上経過でalertを作成する。
- `emergency` は即時alertを作成する。
- `bot_auto` / `closed` / 返信済みcustomerは対象外にする。
- `tenant_id` / `customer_id` / `type` / `severity` / `status` / `message` を持つalertを返す。
- 同じcustomerのopen/notifiedな未返信alertは重複作成しない。

## Implementation Notes

- Loop 007ではAPI/domain部分だけ実装済み。
- `AlertRepository` と `InMemoryAlertRepository` を追加。
- `checkUnrepliedAlerts` でtenant scopedに未返信判定し、`unreplied_customer_message` alertを作成する。
- Loop 007.1でDB migration、domain validation、docs、schema testを `unreplied_customer_message` に同期済み。
- 担当者LINE通知、scheduler本実行、Next.js管理画面UI、Supabase接続は未実装。

## Files likely affected

- `packages/domain/**`
- `packages/db/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/03_database.md`
- `docs/04_line_flows.md`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Codex Prompt

Loop 007: unreplied alertを実装してください。未返信判定とalerts保存だけに集中し、担当者LINE通知やscheduler本実装は行わないでください。
