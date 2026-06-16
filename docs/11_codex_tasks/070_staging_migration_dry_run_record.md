# Loop 070: Staging Migration Dry-run Record

## Goal

Supabase stagingへmigrationを適用する前に、現在の初期migration SQLとrepository期待値を静的に確認し、dry-run記録として残す。

今回のLoopではSupabase接続、`.env` 作成、migration apply、RLS SQL、API runtime switch、git pushは行わない。

## Initial Git State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Initial `git status --short`: clean
- Initial branch: `main...origin/main [ahead 1]`
- Latest unpushed commit before Loop 070: `a3f59b7 docs: add codex development kit scaffold`

Loop 069は未pushのため、Loop 070もpushしない。

## Scope

- `packages/db/migrations/0001_initial_schema.sql` のtable/column/index/FK/check制約を確認する。
- customers/messages repository expectationsとmigration schemaの整合を確認する。
- staff/auth schema、knowledge/alert schema、tenant_id分離を確認する。
- RLS SQLがまだ入っていないことを確認する。
- static migration testsを追加する。
- staging migration dry-run runbookを追加する。
- README、dev loop、staging runbooks、dev logを更新する。
- commitする。

## Out of Scope

- Supabase接続
- `supabase link`
- `supabase db push`
- migration apply
- migration SQL変更
- RLS SQL実装
- `.env` 作成・変更
- API runtime switch
- API route変更
- repository実装変更
- Admin UI / LIFF UI変更
- LINE API / OpenAI API呼び出し
- Web crawl
- git push

## Migration Source

- Source of truth: `packages/db/migrations/0001_initial_schema.sql`
- Seed files:
  - `packages/db/seed/tenant_amamihome.sql`
  - `packages/db/seed/tenant_amamihome_knowledge.sql`

No migration SQL change was made in this loop.

## Schema Inventory

| Table | `tenant_id` | Static check |
| --- | --- | --- |
| `tenants` | No | primary key `id`, unique `slug` |
| `tenant_line_settings` | Yes | `tenant_id` primary key |
| `tenant_ai_settings` | Yes | `tenant_id` primary key |
| `staff_users` | Yes | `auth_user_id`, status columns, tenant email uniqueness |
| `staff_tenant_memberships` | Yes | tenant/staff membership and status columns |
| `customers` | Yes | LINE unique partial index, response mode check, customer timestamps |
| `consultations` | Yes | tenant/customer index |
| `messages` | Yes | LINE message unique partial index, tenant/customer timeline index |
| `alerts` | Yes | alert type/status/severity checks, tenant/status/severity index |
| `knowledge_pages` | Yes | `allowed_for_ai`, tenant indexes |
| `construction_cases` | Yes | tenant and recommendation indexes |
| `reservations` | Yes | tenant/customer and tenant/status indexes |

`tenant_settings` table is not present by design; tenant settings are split into `tenant_line_settings` and `tenant_ai_settings`.

## Customer / Message Expectations

- `customers.last_customer_message_at` exists and remains nullable.
- `SupabaseCustomerRepository` write mapping includes `last_customer_message_at`.
- `messages` supports tenant-scoped timeline reads with `(tenant_id, customer_id, created_at)`.
- `SupabaseMessageRepository` writes include `tenant_id` and reads filter by `tenant_id`.
- AI summary messages continue to use `messages.role = ai` and `message_type = summary`; reply drafts are still response-only.

## RLS State

RLS SQL is intentionally absent from the initial migration. Static tests confirm the migration does not contain:

- `enable row level security`
- `force row level security`
- `create policy`

This means staging migration apply can only be considered a staging/dummy-data validation step. It is not production-ready.

## Static Tests Added

Added:

- `tests/integration/supabase-migration-static-checks.test.ts`

The tests verify:

- migration file location
- no `supabase/migrations` drift
- schema inventory and no standalone `tenant_settings`
- tenant-scoped FK expectations
- customers/messages unique partial indexes
- core tenant indexes
- staff/auth readiness columns
- knowledge `allowed_for_ai`
- repository schema expectations for customers/messages
- RLS SQL absence
- README/runbook links for Loop 070

## Verification Result

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 45 files / 311 tests passed
- `npx pnpm@10.12.1 test:integration`: success, 45 files / 311 tests passed
- build: not run because this loop changes docs and static tests only

## Remaining Risks

- Migration has still not been applied to a real Supabase/local PostgreSQL database.
- RLS SQL is still not implemented.
- Supabase staging project, project ref, `.env`, and keys are not configured in this repository.
- API runtime remains in-memory.
- Loop 069 and Loop 070 remain unpushed until the user explicitly asks to push.

## Next Loop Candidates

```text
Loop 071: Supabase staging migration apply plan
Loop 072: Supabase customer/message API runtime switch plan
Loop 073: Supabase alerts/knowledge runtime switch plan
```
