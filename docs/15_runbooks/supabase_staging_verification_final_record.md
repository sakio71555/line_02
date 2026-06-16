# Supabase Staging Verification Final Record

> Do not write secrets, `.env` values, Supabase project refs, production logs, LINE userId, or real customer information in this file.

## Summary

- Date: 2026-06-16
- Target environment: staging only
- Result: **Success after Loop 079.1 grants recovery**
- Production readiness: **No-Go**

## Schema Apply Status

- `packages/db/migrations/0001_initial_schema.sql`: applied to staging in Loop 078.
- Schema verification: passed.
- Required tables, columns, and indexes were confirmed.
- RLS enabled tables: `0/12`.
- Policies count: `0`.

## Dummy Seed

- Seed script: `scripts/dev-loop/seed-staging-dummy-data.mjs`
- Verification script: `scripts/dev-loop/verify-staging-dummy-data.mjs`
- Seed result:
  - tenant upserted: 1
  - customers upserted: 2
  - messages upserted: 5
  - knowledge pages upserted: 10
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
- Staging smoke uses an explicit injected Supabase customer/message runtime bundle.
- Runtime switch is scoped to customers/messages only.
- Alerts, knowledge, staff/auth, Auth/JWT, RLS, LINE, and OpenAI are not switched in this record.

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

## Persistence Confirmation

- dummy customers/messages are present in staging DB.
- staff reply is saved as a `staff` message.
- AI summary is saved as an `ai` `summary` message.
- restart-equivalent API app instance can read the persisted timeline from Supabase.

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

- RLS SQL is still not implemented.
- Supabase Auth/JWT is still not connected.
- production dev header rejection is still not implemented.
- selectedTenantId transport and production membership revalidation are still not connected.
- alerts/knowledge/staff/auth runtime switch remains future work.
- staging uses dummy data only.

## Loop 080 Production Readiness Plan

Loop 080 records production readiness as No-Go even after staging customers/messages smoke passed. The production gate requires RLS SQL, Supabase Auth/JWT, selectedTenantId membership revalidation, production dev_header rejection, and separate LINE/OpenAI provider gates. See [Loop 080 task doc](../11_codex_tasks/080_rls_auth_production_readiness_plan.md) and [RLS/Auth Production Readiness](rls_auth_production_readiness.md).

## Next Conditions

Before production:

- plan and implement RLS policies.
- add RLS tests against local/staging test DB.
- connect Supabase Auth/JWT and staff tenant context.
- implement selectedTenantId transport and membership revalidation.
- reject dev_header in production.
- keep service role key server-side only.
- confirm rollback/backup policy.

## Next Loop Candidates

```text
Loop 080: RLS/Auth production readiness plan
Loop 081: Supabase alerts/knowledge staging runtime plan
Loop 082: staging manual verification checklist update
```
