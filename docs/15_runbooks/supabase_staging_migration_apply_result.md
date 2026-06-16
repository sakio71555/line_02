# Supabase Staging Migration Apply Result

> Do not write secrets, `.env` values, Supabase project refs, production logs, LINE userId, or real customer information in this file.

## Summary

- Date: 2026-06-16
- Target environment: staging only
- Target migration: `packages/db/migrations/0001_initial_schema.sql`
- Result: **Success**
- Migration apply executed: yes
- Apply method: `psql` via `scripts/dev-loop/apply-staging-migration.mjs`

Loop 076 previously recorded No-Go because `psql` was unavailable. Loop 078 retried after confirming an absolute `psql` path.

## Git State

- Start `git status --short`: clean
- Start branch state for the retry: `main...origin/main`
- Push result: the previously unpushed Loop 076 / Loop 077 commits had already been pushed before this retry resumed.
- Loop 078 result commit: local only, not pushed.

## Approval

- Human approval received for staging migration apply: yes.
- Confirmation that target should be staging: yes, per user instruction.
- Project ref / DB URL / key values recorded here: no.

## Env Verification

- `.env.staging` git ignore check: passed.
- `verify-staging-env`: passed without printing values.
- Required Supabase values: present.
- LINE real push: disabled.
- AI provider: mock.
- Repository runtime: in_memory.

## Tool Readiness

| Tool | Result |
| --- | --- |
| `command -v psql` | no path returned in Codex shell |
| `/usr/local/opt/libpq/bin/psql --version` | available: `psql (PostgreSQL) 18.4` |
| `/opt/homebrew/opt/libpq/bin/psql --version` | not found |
| `supabase --version` | available: `2.90.0` |

Supabase CLI was checked for version only. `supabase link`, `supabase db push`, `supabase db reset`, and `supabase start` were not executed.

## Migration Apply

- Apply command executed: yes, through the safe helper.
- Apply result: success.
- `psql` path used: `/usr/local/opt/libpq/bin/psql`
- Supabase DB URL printed: no.
- Supabase project ref printed: no.
- Database password printed: no.
- Migration SQL changed: no.
- Runtime/API/UI changed: no.

## Table Checks

All expected tables were confirmed:

- `tenants`
- `tenant_line_settings`
- `tenant_ai_settings`
- `customers`
- `messages`
- `alerts`
- `knowledge_pages`
- `staff_users`
- `staff_tenant_memberships`

## Column Checks

All expected columns were confirmed:

- `customers.tenant_id`
- `customers.last_customer_message_at`
- `messages.tenant_id`
- `messages.customer_id`
- `knowledge_pages.allowed_for_ai`
- `staff_users.auth_user_id`
- `staff_tenant_memberships.tenant_id`
- `staff_tenant_memberships.staff_user_id`

## Index Checks

All expected indexes were confirmed:

- `customers_tenant_line_user_id_unique`
- `messages_tenant_line_message_id_unique`
- `messages_tenant_customer_created_at_idx`
- `alerts_tenant_status_severity_idx`
- `knowledge_pages_tenant_allowed_for_ai_idx`
- `staff_tenant_memberships_tenant_status_idx`

## RLS State

- RLS enabled tables: `0/12`
- Policies count: `0`
- Current repo state: RLS SQL is not implemented yet.
- Production readiness: No-Go until RLS/Auth/JWT are planned, implemented, and verified in later Loops.

## Issues

| Issue | Impact | Response |
| --- | --- | --- |
| RLS is not enabled | Staging schema exists, but production readiness is not met | Keep runtime in-memory and plan RLS/Auth/JWT before production |

## Rollback

- Rollback needed: no.
- Reason: migration apply and schema verification succeeded.
- Rollback executed: no.

## Go / No-Go After This Loop

- Can proceed to runtime switch: customers/messages only, staging dummy verification only.
- Can proceed to runtime switch planning/preflight: yes.
- Can proceed to production: no.
- Next requirement: keep runtime switch scoped, then plan RLS/Auth/JWT before any production data.

## Loop 079 Follow-up

- Staging dummy seed was applied with fake customer/message/knowledge data only.
- Dummy data verification passed without printing secret values.
- Initial customers/messages API smoke failed with PostgREST `42501` on `customers.listByTenant`.
- Loop 079.1 applied `packages/db/migrations/0002_service_role_postgrest_grants.sql`.
- The grants are limited to `service_role` for public schema/core tables/sequences.
- Broad `anon` / `authenticated` table DML grants were not added.
- Grant verification passed with `scripts/dev-loop/verify-staging-postgrest-grants.mjs`.
- Customers/messages were then verified through an injected Supabase runtime bundle for Admin API list/detail/timeline, staff reply, and AI summary.
- A restart-equivalent app instance could read the persisted timeline.
- Default runtime remains `in_memory`.
- LINE/OpenAI remain mock/disabled.
- RLS remains disabled with zero policies, so production readiness remains No-Go.

## Secret Safety Confirmation

- `.env.staging` raw content was not printed.
- DB URL was not printed.
- Supabase URL/key/project ref were not printed.
- Database password was not printed.
- LINE/OpenAI tokens were not printed.
- No real customer information, LINE userId, or production log was recorded.
