# Loop 007: Unreplied Alert

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

## Files likely affected

- `packages/domain/**`
- `packages/db/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/03_database.md`
- `docs/04_line_flows.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 007: unreplied alertを実装してください。未返信判定とalerts保存だけに集中し、担当者LINE通知やscheduler本実装は行わないでください。
