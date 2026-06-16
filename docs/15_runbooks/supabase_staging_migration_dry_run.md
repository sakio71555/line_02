# Supabase Staging Migration Dry-run

## Purpose

Supabase stagingへmigrationを適用する前に、現在のmigration SQL、domain/repository期待値、tenant境界、RLS状態を静的に確認した記録です。

これは実DBへの適用手順ではありません。このdry-runではSupabase接続、`.env` 作成、migration apply、RLS SQL実装、API runtime switch、git pushは行いません。

## Confirmation Record

| Item | Value |
| --- | --- |
| Confirmation date | 2026-06-16 |
| Repository path | `/Users/sakio/Desktop/PROJECT/amami-line-crm` |
| Confirmation target commit | `a3f59b7 docs: add codex development kit scaffold` |
| Migration source | `packages/db/migrations/0001_initial_schema.sql` |
| Seed files checked | `packages/db/seed/tenant_amamihome.sql`, `packages/db/seed/tenant_amamihome_knowledge.sql` |
| Supabase connection | Not executed |
| Migration apply | Not executed |
| RLS SQL | Not implemented |
| Runtime switch | Not executed |
| Push | Not executed |

## Schema Inventory

`tenant_settings` という単体tableはありません。tenant設定は `tenant_line_settings` と `tenant_ai_settings` に分かれています。

| Table | `tenant_id` | Purpose | Staging apply note |
| --- | --- | --- | --- |
| `tenants` | No | tenant master | `id` primary key、`slug` unique |
| `tenant_line_settings` | Yes | LINE tenant settings | `tenant_id` primary key |
| `tenant_ai_settings` | Yes | AI tenant settings | `tenant_id` primary key |
| `staff_users` | Yes | staff identity/profile | `auth_user_id` nullable unique indexあり |
| `staff_tenant_memberships` | Yes | staff tenant membership | `tenant_id + staff_user_id` unique |
| `customers` | Yes | customer chart | `last_customer_message_at` included |
| `consultations` | Yes | consultation grouping | tenant + customer indexあり |
| `messages` | Yes | timeline/message log | tenant + customer + created_at indexあり |
| `alerts` | Yes | unreplied/stale/emergency alerts | tenant + status + severity indexあり |
| `knowledge_pages` | Yes | RAG knowledge | tenant and allowed_for_ai indexesあり |
| `construction_cases` | Yes | construction case source | tenant and recommendation indexesあり |
| `reservations` | Yes | reservation request | tenant + customer/status indexesあり |

## Tenant Isolation Checks

- All tenant-owned tables include `tenant_id` with a reference to `tenants(id)`.
- `customers` has a partial unique index on `(tenant_id, line_user_id)` where `line_user_id is not null`.
- `messages` has a partial unique index on `(tenant_id, line_message_id)` where `line_message_id is not null`.
- `staff_users` has `unique (tenant_id, email)`.
- `staff_tenant_memberships` has `unique (tenant_id, staff_user_id)`.
- `knowledge_pages` can be filtered by `tenant_id` and by `(tenant_id, allowed_for_ai)`.
- `alerts` can be filtered by `(tenant_id, status, severity)`.

## Repository Mapping Expectations

| Repository | Table(s) | Static expectation |
| --- | --- | --- |
| `SupabaseCustomerRepository` | `customers` | all reads use `tenant_id`; writes include `tenant_id`, `last_message_at`, `last_customer_message_at`, `last_staff_reply_at` |
| `SupabaseMessageRepository` | `messages` | inserts include `tenant_id`; timeline reads use `tenant_id + customer_id`; latest reads use `tenant_id + customer_id in (...)` |
| `SupabaseAlertRepository` | `alerts` | list/open/update paths use `tenant_id`; active alert lookup uses `tenant_id + customer_id + alert_type + status` |
| `SupabaseKnowledgePageRepository` | `knowledge_pages` | reads use `tenant_id` and `allowed_for_ai = true` |
| `SupabaseStaffAuthLookupRepository` | `staff_users`, `staff_tenant_memberships` | staff lookup is based on active auth user and active membership; runtime/API guard connection remains separate |

## RLS State

The current initial migration intentionally does not include RLS SQL.

Confirmed absent:

- `alter table ... enable row level security`
- `alter table ... force row level security`
- `create policy`

This is acceptable only for staging dry-run planning. RLS SQL and local/staging RLS tests must be handled in a later loop before production.

## Apply Conditions Before Staging

Do not apply the migration until these are true:

- The [Supabase Staging Migration Apply Plan](supabase_staging_migration_apply_plan.md) is reviewed.
- Staging Supabase project is confirmed by a human.
- Production project is not selected.
- No real customer data, LINE userId, API key, `.env`, or production log is present in seed or docs.
- `git status --short` is clean before apply.
- `git diff --check`, lint, typecheck, test, and test:integration pass.
- RLS absence is accepted as staging-only and not production-ready.
- Rollback / reset approach is decided for the staging project.
- Any actual `supabase link`, `db push`, `psql`, or dashboard apply step is split into its own explicit loop.

## Why No Apply In This Loop

Loop 070 records a static dry-run only. Applying migration, linking a project, creating `.env`, and switching API runtime would mix environment risk, secret risk, and runtime risk in one step. The next apply loop must be explicit, small, and staging-only.

## Related Docs

- [Loop 020: Supabase Persistence Planning](../11_codex_tasks/020_supabase_persistence_planning.md)
- [Loop 025: Supabase RLS Policy Plan](../11_codex_tasks/025_supabase_rls_policy_plan.md)
- [Loop 026: Supabase Local Migration Test](../11_codex_tasks/026_supabase_local_migration_test.md)
- [Loop 065: Supabase Persistence Staging Plan](../11_codex_tasks/065_supabase_persistence_staging_plan.md)
- [Loop 066: Supabase Staging Env Readiness Checklist](../11_codex_tasks/066_supabase_staging_env_readiness_checklist.md)
- [Loop 067: Supabase Runtime Switch Boundary for Customers/Messages](../11_codex_tasks/067_supabase_runtime_switch_boundary_customers_messages.md)
- [Loop 068: Supabase Repository Integration Tests with Fake Client](../11_codex_tasks/068_supabase_repository_integration_tests_fake_client.md)
- [Loop 070: Staging Migration Dry-run Record](../11_codex_tasks/070_staging_migration_dry_run_record.md)
- [Loop 071: Supabase Staging Migration Apply Plan](../11_codex_tasks/071_supabase_staging_migration_apply_plan.md)
- [Supabase Staging Migration Apply Plan](supabase_staging_migration_apply_plan.md)
- [Supabase Staging Migration Apply Result Template](supabase_staging_migration_apply_result_template.md)
