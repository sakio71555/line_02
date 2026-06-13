# Loop 003: Message Logging

## Goal

LINE受信イベントからcustomer upsertとmessage保存を行うrepository境界を作る。

## Scope

- `tenant_id + line_user_id` によるcustomer upsert
- inbound text message保存
- consultationの最小作成または紐づけ
- repository interfaceとmock/in-memory実装

## Out of scope

- LINE API返信
- 管理画面UI
- 未返信アラート
- AI要約
- 画像取得

## Acceptance Criteria

- 保存されるcustomer/message/consultationに `tenant_id` が入る。
- 他tenantのcustomerへmessageが混ざらない。
- 同じLINE userでもtenantが違えば別customerとして扱う。
- テストでSupabase本番環境を呼ばない。

## Files likely affected

- `packages/db/**`
- `packages/domain/**`
- `apps/api/**`
- `tests/integration/**`
- `docs/03_database.md`
- `docs/04_line_flows.md`

## Test requirements

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Codex Prompt

Loop 003: message loggingを実装してください。customer upsertとmessage保存だけに集中し、外部API接続や返信処理は実装しないでください。tenant_id分離テストを必ず追加してください。
