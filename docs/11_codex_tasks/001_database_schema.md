# Loop 001: Database Schema

## Status

Implemented in Loop 001.

## Goal

Supabase PostgreSQL想定のtenant前提DBスキーマとTypeScript型を定義する。

## Scope

- `tenants`
- `tenant_line_settings`
- `tenant_ai_settings`
- `staff_users`
- `customers`
- `messages`
- `consultations`
- `alerts`
- `knowledge_pages`
- `construction_cases`
- `reservations`
- tenant_id必須ルールの型・テスト

## Out of scope

- Supabase本番接続
- migrationの本番適用
- 管理画面UI
- LINE Webhook実装

## Acceptance Criteria

- `tenants` 以外の主要テーブルに `tenant_id` がある。
- TypeScript型で主要recordがtenant scopedになっている。
- tenant_id漏れを検出するテストがある。
- docsのDB設計が実装と一致している。
- `packages/db/migrations/0001_initial_schema.sql` が存在する。
- `packages/db/seed/tenant_amamihome.sql` が存在する。
- Zod validation schemaが存在する。
- 外部DBに接続しないVitestがある。

## Implementation Notes

- SQL migrationとseedは作成済み。ただしSupabase CLI実行・実DB適用は未実施。
- `customers` と `messages` はnullableなLINE IDを許容しつつ、値がある場合だけtenant scoped partial unique indexで一意にする。
- `knowledge_pages`、`construction_cases`、`alerts` にはtenant scoped access path用indexを追加済み。
- TypeScript型とZod validationは `packages/domain/src/index.ts` に集約。

## Files likely affected

- `packages/db/**`
- `packages/domain/**`
- `docs/03_database.md`
- `tests/integration/**`

## Test requirements

- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Codex Prompt

Loop 001: database schemaを実装してください。Scopeのテーブルだけを対象に、tenant_id分離を最優先にした型とschema案を追加してください。Supabase本番接続は行わないでください。
