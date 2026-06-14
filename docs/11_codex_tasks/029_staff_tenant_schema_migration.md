# Loop 029: Staff Tenant Schema Migration

## Goal

Loop 028で設計したstaff/admin tenant context用schemaを、初期migration、domain型、static validation test、docsへ最小限反映する。

今回はSupabase Auth、JWT検証、middleware、API route差し替え、Admin login UI、RLS SQL、runtime Supabase切替は行わない。

## Scope

- `staff_users` に本番認証準備用columnを追加する。
- `staff_tenant_memberships` tableを追加する。
- 必要最小限のindex / unique制約 / foreign keyを追加する。
- `staff_invites` を今回実装するか判断する。
- database schema validation testを更新する。
- staff関連のdomain type / status validationを最小限更新する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth implementation
- JWT verification
- middleware implementation
- API route changes
- repository changes
- UI changes
- Admin login screen
- LIFF auth implementation
- RLS SQL implementation
- `.env` creation or update
- Supabase production connection
- `supabase link`
- OpenAI API calls
- LINE API calls
- Web crawling
- runtime switch from in-memory to Supabase
- `staff_invites` invite token / email delivery implementation

## Migration Strategy

Chosen strategy: update `packages/db/migrations/0001_initial_schema.sql`.

Reason:

- Loop 026 recorded that local migration apply has not been executed.
- Docker daemon was unavailable, `psql` was missing, and no `supabase/` config existed.
- No production/staging Supabase DB is connected from this repo.
- The project is still in initial schema preparation, so keeping the initial migration as the schema source of truth is simpler and testable.

If a shared/staging/production DB applies this migration later, subsequent schema changes should use additive migrations rather than rewriting `0001`.

## `staff_users` Changes

Added columns:

| Column | Type | Nullability | Purpose |
| --- | --- | --- | --- |
| `auth_user_id` | `text` | nullable | future Supabase Auth `auth.users.id` binding |
| `status` | `text` | not null default `active` | staff identity status |
| `disabled_at` | `timestamptz` | nullable | global staff disable timestamp |
| `archived_at` | `timestamptz` | nullable | staff archive timestamp |

Kept for compatibility:

- `tenant_id`
- `role`
- `line_user_id`
- `is_active`
- `last_login_at`
- `unique (tenant_id, email)`

Indexes:

- partial unique index on `auth_user_id` where `auth_user_id is not null`
- index on `email`
- index on `status`

Notes:

- `auth_user_id` is nullable because Supabase Auth is not implemented yet.
- `tenant_id` is not removed in this loop to avoid a destructive migration.
- `role` and `is_active` stay for current compatibility, but future production tenant access should use active membership.

## `staff_tenant_memberships` Table

Added table:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `text primary key` | membership id |
| `tenant_id` | `text not null references tenants(id) on delete cascade` | target tenant |
| `staff_user_id` | `text not null references staff_users(id) on delete cascade` | staff identity |
| `role` | `text not null default 'staff'` | tenant-specific role |
| `status` | `text not null default 'active'` | membership state |
| `invited_at` | `timestamptz` | invite timestamp |
| `accepted_at` | `timestamptz` | acceptance timestamp |
| `disabled_at` | `timestamptz` | tenant access stop timestamp |
| `archived_at` | `timestamptz` | archive timestamp |
| `created_at` / `updated_at` | `timestamptz` | timestamps |

Constraints / indexes:

- `unique (tenant_id, staff_user_id)`
- index on `tenant_id`
- index on `staff_user_id`
- index on `tenant_id + status`
- index on `staff_user_id + status`

This table is the future source for Admin API tenant access. Active identity plus active membership is required before calling tenant-owned repositories.

## `staff_invites`

Not implemented in Loop 029.

Reason:

- Initial Amami Home operation does not require invitation workflow.
- Invite token, email delivery, expiry handling, and acceptance flow would expand scope.
- Auth/JWT is still not implemented.

Invite workflow remains a later loop after Auth context and Admin UI login direction are clearer.

## Role / Status Policy

Roles implemented in check constraints:

- `owner`
- `manager`
- `staff`

Not included:

- `viewer`: deferred until read-only staff needs are concrete.
- `platform_admin`: kept separate from ordinary tenant membership because it requires cross-tenant audit and support policy.

Statuses:

- `staff_users.status`: `active` / `disabled` / `archived`
- `staff_tenant_memberships.status`: `invited` / `active` / `disabled` / `archived`

`active` is the only status that should allow production Admin API access in later auth/guard loops.

## Seed Impact

`packages/db/seed/tenant_amamihome.sql` currently seeds only the tenant record. It does not seed `staff_users`.

No seed change was needed in Loop 029.

Future seed policy:

- Do not seed real staff email addresses, Supabase Auth IDs, LINE user IDs, or secrets.
- If dev/staging staff seed is needed, use dummy data and mark it as non-production.

## Domain / Validation Impact

Updated `packages/domain/src/index.ts` minimally:

- added `staffRoles` and `StaffRole` from the same role list used by SQL.
- added `staffStatuses` / `StaffStatus`.
- added `staffMembershipStatuses` / `StaffMembershipStatus`.
- added `StaffTenantMembership` interface.
- added Zod schemas for staff role/status validation.

No API route, repository implementation, or runtime wiring uses these new types yet.

## RLS Plan Connection

Loop 025 planned RLS around authenticated tenant context. Loop 029 adds the schema pieces needed before RLS SQL:

- `staff_users.auth_user_id` for future `auth.uid()` lookup.
- `staff_tenant_memberships` for active tenant membership checks.
- `tenant_id + status` indexes to support membership lookup.

RLS SQL is still intentionally deferred. Service role repositories must still keep explicit `tenant_id` filters.

## Test Updates

Updated `tests/integration/database-schema.test.ts` to verify:

- `staff_users.auth_user_id` exists.
- `staff_users.status`, `disabled_at`, `archived_at` exist.
- `staff_users_auth_user_id_unique` partial unique index exists.
- `staff_tenant_memberships` exists.
- membership `tenant_id`, `staff_user_id`, `role`, `status`, lifecycle timestamps exist.
- membership has `unique (tenant_id, staff_user_id)`.
- membership lookup indexes exist.
- staff role/status schemas accept expected values and reject `platform_admin`.
- RLS SQL remains absent from the initial migration.

Tests do not connect to Supabase or any external DB.

## Risks

- Current `staff_users` still has `tenant_id`, so it is a compatibility bridge rather than a fully normalized identity table.
- No Auth/JWT middleware exists yet.
- Admin API still uses dev-only `x-tenant-id`.
- RLS SQL is still not implemented.
- `staff_invites` remains a future design/implementation task.
- No real local DB migration apply has been executed yet.

## Next Loop Candidates

Recommended safe order:

```text
Loop 030: auth context boundary
Loop 031: admin API tenant context guard
Loop 032: admin auth placeholder UI plan
Loop 033: RLS SQL draft
Loop 034: local auth/RLS test harness
Loop 035: Supabase repository runtime switch plan
```
