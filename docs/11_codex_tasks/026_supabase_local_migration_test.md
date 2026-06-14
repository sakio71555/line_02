# Loop 026: Supabase Local Migration Test

## Goal

Supabase永続化をruntimeへ接続する前に、現在の初期migrationがローカル環境で検証可能か確認し、検証手順と現在の制約をrunbook化する。

対象migration:

- `packages/db/migrations/0001_initial_schema.sql`

## Scope

- 既存migration SQL確認
- local tool availability確認
- ローカルmigration適用可否の判断
- SQL validation test強化
- local / staging / production分離方針のdocs化
- README、database docs、runbook、dev log更新

## Out of Scope

- Supabase本番接続
- `supabase link`
- Supabase cloud projectへの接続
- `.env` 作成・変更
- API routeのSupabase repository差し替え
- runtimeをin-memoryからSupabaseへ切り替える
- RLS policy SQL実装
- migrationの大規模変更
- repository実装変更
- UI変更
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール
- pgvector / embedding実装
- 認証/JWT実装

## Checked Local Tools

Executed from `/Users/sakio/Desktop/PROJECT/amami-line-crm`.

| Tool | Result | Notes |
| --- | --- | --- |
| `supabase` | available: `2.90.0` | CLI exists, but no local `supabase/` project config exists in this repo. |
| `docker` | CLI available: `29.4.3`; daemon unavailable | `docker info` cannot connect to Docker daemon at the local socket. |
| `psql` | not found | `command -v psql` returned no path. |
| existing `supabase/` directory | not found | No existing local Supabase config to reuse. |

## Migration Verification Result

Local migration apply was not executed in this loop.

Reason:

- Supabase CLI is installed, but the repository has no existing `supabase/` config.
- Docker daemon is not running, so `supabase status` cannot inspect local containers.
- `psql` is not installed, so there is no safe direct local PostgreSQL apply path.
- This loop must not run `supabase init`, `supabase link`, install tools, create `.env`, or connect to a cloud project.

Instead, the SQL validation test was strengthened to keep the initial migration aligned until a safe local Supabase/PostgreSQL target is available.

## Migration SQL Changes

No migration SQL changes were made.

`packages/db/migrations/0001_initial_schema.sql` remains the schema source of truth. RLS SQL remains intentionally deferred to a later loop.

## SQL Validation Test Updates

Updated:

- `tests/integration/database-schema.test.ts`

Additional checks:

- tenant settings tables use `tenant_id` as primary key.
- major tenant-scoped indexes exist:
  - `customers_tenant_id_idx`
  - `customers_tenant_response_mode_idx`
  - `messages_tenant_customer_created_at_idx`
  - `messages_tenant_consultation_created_at_idx`
  - `knowledge_pages_tenant_allowed_for_ai_idx`
  - `construction_cases_tenant_recommendation_idx`
  - `reservations_tenant_customer_idx`
  - `reservations_tenant_status_idx`
- initial migration explicitly defers RLS policy definitions.
- initial migration does not contain `enable row level security`, `force row level security`, or `create policy`.

## Production Safety

- No Supabase production project was connected.
- No `supabase link` was executed.
- No `.env` was created or changed.
- No DB connection string or credential was written to docs.
- Runtime remains in-memory.

## Local / Staging / Production Separation

- local: use local Supabase or a disposable local PostgreSQL test database only.
- staging: use a separate Supabase project from production.
- production: run migration only after local/staging verification, backup/rollback planning, and RLS/auth checks.
- automated tests must not target production DB.

## Runbook

Detailed future steps are in:

- `docs/15_runbooks/supabase_local_migration_test.md`

## Risks

- Migration has not yet been applied to a real local database in this repo.
- Supabase CLI local workflow needs either a checked local config or a dedicated setup loop.
- Docker daemon must be running, or a safe local PostgreSQL path with `psql` must be available.
- RLS SQL is still not implemented.

## Next Loop Candidates

```text
Loop 027: Supabase auth/staff tenant context plan
Loop 028: Supabase RLS SQL draft
Loop 029: Supabase RLS local tests
Loop 030: Runtime Supabase repository wiring plan
```
