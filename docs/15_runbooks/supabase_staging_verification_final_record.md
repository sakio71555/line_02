# Supabase Staging Verification Final Record

> Do not write secrets, `.env` values, Supabase project refs, production logs, LINE userId, or real customer information in this file.

## Summary

- Date: 2026-06-16
- Target environment: staging only
- Result: **Staging extension verification 100%相当 after Loop 085**
- Production readiness: **No-Go**

## Schema Apply Status

- `packages/db/migrations/0001_initial_schema.sql`: applied to staging in Loop 078.
- `packages/db/migrations/0002_service_role_postgrest_grants.sql`: applied to staging in Loop 079.1.
- `packages/db/migrations/0003_rls_core_tables.sql`: applied to staging in Loop 095B.
- Schema verification: passed.
- Required tables, columns, and indexes were confirmed.
- RLS enabled target tables: `9/9`.
- FORCE RLS target tables: `9/9`.
- Policies verified: `14/14`.

## Dummy Seed

- Seed script: `scripts/dev-loop/seed-staging-dummy-data.mjs`
- Verification script: `scripts/dev-loop/verify-staging-dummy-data.mjs`
- Seed result:
  - tenants upserted: 2
  - customers upserted: 2
  - messages upserted: 5
  - knowledge pages upserted: 12
- Loop 085 adds one `allowed_for_ai=false` dummy knowledge row and one wrong-tenant dummy knowledge row for exclusion checks.
- Dummy data only. No real customer data, real LINE userId, phone, email, production logs, or secrets are recorded.

## PostgREST Grants Recovery

Initial API smoke failed after the dummy seed because Supabase REST / PostgREST returned `42501` for `customers.listByTenant`.

Direct `psql` migration, seed, and verification had already succeeded. The issue was treated as a service role grants gap for PostgREST/Data API access.

Recovery migration:

```text
packages/db/migrations/0002_service_role_postgrest_grants.sql
```

Recovery scope:

- grant `usage` on `public` schema to `service_role`
- grant `select, insert, update, delete` on the core staging tables to `service_role`
- grant sequence `usage, select` in `public` to `service_role`
- no broad grant to `anon`
- no broad grant to `authenticated`
- no RLS SQL or policy changes

Grant verification script:

```text
scripts/dev-loop/verify-staging-postgrest-grants.mjs
```

Grant verification result:

- `service_role` can use `public`.
- `service_role` can select/insert/update/delete the core staging tables.
- broad `anon` table DML grant was not detected.
- broad `authenticated` table DML grant was not detected.

## Customers / Messages Runtime Status

- Default runtime remains `in_memory`.
- `.env.staging` remains `REPOSITORY_RUNTIME=in_memory` as the safe default.
- Staging smoke uses explicit injected Supabase runtime bundles.
- Customers/messages smoke passed in Loop 079.1.
- Alerts runtime boundary/staging smoke passed in Loop 084.
- Knowledge/RAG runtime boundary/staging smoke passed in Loop 085.
- Staff/auth, Auth/JWT, RLS, LINE, and OpenAI are not switched in this record.

## API Smoke

Smoke command:

```text
node scripts/dev-loop/smoke-staging-customer-message-api.mjs --env .env.staging
```

Smoke result:

- dummy data verification passed.
- `GET /api/admin/customers`: success.
- `GET /api/admin/customers/customer_demo_yamada_taro`: success.
- `GET /api/admin/customers/customer_demo_yamada_taro/timeline`: success.
- `POST /api/admin/customers/customer_demo_yamada_taro/reply`: success.
- `POST /api/admin/customers/customer_demo_yamada_taro/ai-summary`: success.
- restart-equivalent app instance can read the persisted timeline.

Alerts smoke command:

```text
node scripts/dev-loop/smoke-staging-alerts-api.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql
```

Alerts smoke result:

- staging env verification passed.
- schema verification passed.
- service_role grants verification passed.
- dummy data verification passed.
- `POST /api/admin/alerts/check-unreplied`: success for dummy unreplied customer.
- `GET /api/admin/alerts?status=open`: success.
- `POST /api/admin/alerts/notify-open`: success with `MockStaffNotifier`.
- restart-equivalent app instance can read the persisted `notified` alert.

Knowledge/RAG smoke command:

```text
node scripts/dev-loop/smoke-staging-knowledge-rag-api.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql
```

Knowledge/RAG smoke result:

- staging env verification passed.
- schema verification passed.
- service_role grants verification passed.
- dummy data verification passed.
- `POST /api/admin/rag/search`: returned tenant-scoped `allowed_for_ai=true` dummy knowledge.
- `allowed_for_ai=false` dummy knowledge was excluded.
- wrong-tenant dummy knowledge was excluded.
- `POST /api/admin/rag/answer-draft`: returned source付き mock answer draft.
- restart-equivalent app instance can read the persisted knowledge source.

## Persistence Confirmation

- dummy customers/messages are present in staging DB.
- staff reply is saved as a `staff` message.
- AI summary is saved as an `ai` `summary` message.
- restart-equivalent API app instance can read the persisted timeline from Supabase.
- dummy unreplied alert can be saved as `open`, updated to `notified`, and reread from Supabase.
- dummy knowledge_pages can be searched from Supabase-backed RAG runtime and reread by a restart-equivalent app instance.

## LINE / OpenAI State

- LINE real push remains disabled.
- OpenAI remains mock.
- No real LINE API send was performed.
- No OpenAI API call was performed.

## Secret Safety

- `.env.staging` raw content was not printed.
- DB URL was not printed.
- Supabase URL/key/project ref were not printed.
- Database password was not printed.
- LINE/OpenAI tokens were not printed.

## Remaining Risks

- RLS SQL is applied to staging, but authenticated role / JWT smoke is still not completed.
- Supabase Auth/JWT is still not connected.
- selectedTenantId UI保存 is still not completed.
- staff/auth runtime switch remains future work.
- staging uses dummy data only.

## Loop 085 Knowledge/RAG Runtime Smoke

Loop 085 records staging拡張検証版100%相当. Customers/messages, alerts, knowledge_pages, RAG search, and RAG answer-draft all have explicit Supabase staging smoke coverage with dummy data. Default runtime remains `in_memory`; LINE real push remains disabled; OpenAI remains mock. Production readiness remains No-Go until RLS/Auth/JWT and production tenant/auth hardening are implemented.

See [Loop 085 task doc](../11_codex_tasks/085_supabase_knowledge_rag_runtime_boundary.md) and [Supabase Alerts/Knowledge Staging Runtime Plan](supabase_alerts_knowledge_staging_runtime_plan.md).

## Loop 086 Production Hardening Split Plan

Loop 086 keeps staging拡張検証版100%相当 as the staging milestone and records production No-Go. The next work is split into selectedTenantId transport, authenticated runtime rollout, production dev_header rejection, RLS SQL review/test, LINE real push gate, and OpenAI real API gate. Loop 086 does not change migration SQL, API/runtime/UI files, or connect Supabase/LINE/OpenAI.

See [Loop 086 task doc](../11_codex_tasks/086_rls_auth_jwt_production_hardening_split_plan.md) and [Production Hardening Split Plan](production_hardening_split_plan.md).

## Loop 088 Authenticated Staff Runtime Route Rollout Plan

Loop 088 keeps production readiness as No-Go and adds the route rollout plan for expanding the Loop 087 selectedTenantId boundary. It records that only `GET /api/admin/customers` has representative authenticated_staff route coverage today, and splits customer read, customer write/AI, alerts, RAG, and production dev_header rejection into separate follow-up Loops.

Loop 088 does not change API runtime, UI, migration SQL, RLS SQL, Supabase Auth/JWT, LINE, or OpenAI connections. See [Loop 088 task doc](../11_codex_tasks/088_authenticated_staff_runtime_full_route_rollout_plan.md) and [Authenticated Staff Runtime Route Rollout](authenticated_staff_runtime_route_rollout.md).

## Loop 081 Alerts/Knowledge Runtime Plan

Loop 081 keeps production readiness as No-Go and adds the staging runtime plan for alerts and knowledge/RAG. It records that `SupabaseAlertRepository` and `SupabaseKnowledgePageRepository` already exist, but API/RAG runtime is not switched. The next work should start with fake client hardening, then explicit staging smoke with dummy data only. See [Loop 081 task doc](../11_codex_tasks/081_supabase_alerts_knowledge_staging_runtime_plan.md) and [Supabase Alerts/Knowledge Staging Runtime Plan](supabase_alerts_knowledge_staging_runtime_plan.md).

## Loop 080 Production Readiness Plan

Loop 080 records production readiness as No-Go even after staging customers/messages smoke passed. The production gate requires RLS SQL, Supabase Auth/JWT, selectedTenantId membership revalidation, production dev_header rejection, and separate LINE/OpenAI provider gates. See [Loop 080 task doc](../11_codex_tasks/080_rls_auth_production_readiness_plan.md) and [RLS/Auth Production Readiness](rls_auth_production_readiness.md).

## Next Conditions

Before production:

- keep `0003_rls_core_tables.sql` staging apply result from Loop 095B as the current RLS baseline.
- add authenticated role / JWT RLS smoke against local/staging test DB.
- connect Supabase Auth/JWT and staff tenant context.
- implement selectedTenantId transport and membership revalidation.
- reject dev_header in production.
- keep service role key server-side only.
- confirm rollback/backup policy.

RLS staging applyの前提と手順は [Loop 095A task doc](../11_codex_tasks/095a_rls_staging_apply_plan.md) と [RLS Staging Apply Plan](rls_staging_apply_plan.md) を参照する。

Loop 095Bで `0003_rls_core_tables.sql` をstaging DBへapplyした。RLS enabled/forced `9/9`、policies `14/14`、broad anon/public grants `0`、service_role grants維持を確認し、customers/messages、alerts、knowledge/RAG smokeは成功した。service_roleはRLS bypass前提のため、authenticated role/JWT smokeは後続Loopで扱う。詳細は [Loop 095B task doc](../11_codex_tasks/095b_rls_staging_apply_execution_gate.md) を参照する。

## Next Loop Candidates

```text
Loop 081: Supabase alerts/knowledge staging runtime plan
Loop 082: Supabase alert repository fake-client hardening
Loop 083: Supabase knowledge repository fake-client hardening
Loop 084: Supabase alerts runtime boundary + staging smoke
Loop 085: Supabase knowledge/RAG runtime boundary
Loop 086: RLS/Auth/JWT production hardening split plan
Loop 087: selectedTenantId transport boundary
Loop 088: authenticated staff runtime full route rollout plan
Loop 089: authenticated_staff runtime rollout for customer read routes
Loop 095A: RLS staging apply planning / dry-run checklist
Loop 095B: RLS staging apply execution gate
```
