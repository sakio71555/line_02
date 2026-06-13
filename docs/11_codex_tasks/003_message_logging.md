# Loop 003: Message Logging

## Status

Implemented in Loop 003.

## Goal

LINE受信イベントからcustomer upsertとmessage保存を行うrepository境界を作る。

## Scope

- `tenant_id + line_user_id` によるcustomer upsert
- inbound text message保存
- repository interfaceとmock/in-memory実装

## Out of scope

- LINE API返信
- 管理画面UI
- 未返信アラート
- AI要約
- 画像取得
- consultation作成または紐づけ

## Acceptance Criteria

- 保存されるcustomer/message/consultationに `tenant_id` が入る。
- 他tenantのcustomerへmessageが混ざらない。
- 同じLINE userでもtenantが違えば別customerとして扱う。
- テストでSupabase本番環境を呼ばない。
- follow eventでcustomerが作成または更新される。
- text message eventでcustomerが作成または更新され、messageが保存される。

## Implementation Notes

- `packages/domain/src/index.ts` に `CustomerRepository`、`MessageRepository`、in-memory実装、customer upsert / text message insert serviceを追加。
- `apps/api/src/index.ts` のWebhook routeから、署名検証とJSON parse後にmessage logging serviceを呼ぶ。
- 対象eventはfollowとtext messageのみ。unsupported eventは保存せず無視する。
- Supabase接続、LINE返信、OpenAI、RAG、LIFF、管理画面UIは未実装のまま維持。

## Files likely affected

- `packages/db/**`
- `packages/domain/**`
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

Loop 003: message loggingを実装してください。customer upsertとmessage保存だけに集中し、外部API接続や返信処理は実装しないでください。tenant_id分離テストを必ず追加してください。
