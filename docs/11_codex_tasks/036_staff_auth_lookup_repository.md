# Loop 036: Staff Auth Lookup Repository

## Goal

Loop 030のpure auth context resolverへ渡すため、`auth_user_id` からstaff identityとtenant membershipを取得するSupabase repository境界を追加する。

今回はSupabase Auth session取得、JWT検証、Admin API guard接続、RLS SQL、本番Supabase接続は実装しない。

## Scope

- `StaffAuthLookup` に対応するSupabase repository実装を追加する。
- `auth_user_id` で `staff_users` を取得するquery境界を追加する。
- `staff_user_id` で `staff_tenant_memberships` を取得するquery境界を追加する。
- DB rowをdomain `StaffUser` / `StaffTenantMembership` にmappingする。
- Supabase query errorを `SupabaseRepositoryError` として扱う。
- fake Supabase clientでrepository testを追加する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth session retrieval
- JWT signature verification
- Admin API authenticated_staff guard connection
- Admin API route changes
- Admin UI login integration
- cookie/session/localStorage/sessionStorage persistence
- middleware implementation
- RLS SQL
- migration SQL changes
- repository runtime switch
- `.env` creation or update
- Supabase production connection
- OpenAI API calls
- LINE API calls
- Web crawling

## Repository Location

Implemented in:

- `packages/db/src/supabase/repositories/staff-auth-lookup-repository.ts`

Exported from:

- `packages/db/src/supabase/repositories/index.ts`
- `packages/db/src/supabase/index.ts` via repository re-export
- `packages/db/src/index.ts` via Supabase re-export

## Relationship To `StaffAuthLookup`

The repository implements the Loop 030 interface:

```ts
interface StaffAuthLookup {
  findStaffByAuthUserId(authUserId: string): Promise<StaffUser | null>;
  listMembershipsByStaffUserId(staffUserId: string): Promise<StaffTenantMembership[]>;
}
```

It is constructor-injected with a Supabase client-like object and does not read env or create clients on import.

Current intended future flow:

```text
verified auth_user_id
-> SupabaseStaffAuthLookupRepository
-> resolveAuthenticatedTenantContext
-> AdminTenantContext(source: authenticated_staff)
```

Loop 036 only adds the lookup repository. It is not connected to Admin API runtime yet.

## `staff_users` Mapping

Table:

- `staff_users`

Query:

- `auth_user_id = normalizedAuthUserId`
- `maybeSingle()`

Mapped fields:

- `id`
- `tenant_id`
- `auth_user_id`
- `email`
- `display_name`
- `role`
- `status`
- `line_user_id`
- `is_active`
- `last_login_at`
- `disabled_at`
- `archived_at`
- `created_at`
- `updated_at`

Notes:

- Empty `auth_user_id` returns `null` without querying.
- Returned row is defensively checked so mismatched `auth_user_id` returns `null`.
- `auth_user_id` is unique in the current schema via partial unique index.
- `tenant_id` and `role` on `staff_users` are compatibility fields. Production tenant context should use membership-derived tenant and role.

## `staff_tenant_memberships` Mapping

Table:

- `staff_tenant_memberships`

Query:

- `staff_user_id = normalizedStaffUserId`
- `order("created_at", { ascending: true })`

Mapped fields:

- `id`
- `tenant_id`
- `staff_user_id`
- `role`
- `status`
- `invited_at`
- `accepted_at`
- `disabled_at`
- `archived_at`
- `created_at`
- `updated_at`

Notes:

- Empty `staff_user_id` returns `[]` without querying.
- Returned rows are defensively filtered by `staff_user_id`.
- The repository returns all statuses. Active filtering remains the responsibility of `resolveAuthenticatedTenantContext`.
- Multiple tenant memberships are supported.

## Role / Status Mapping

Roles:

- `owner`
- `manager`
- `staff`

Staff statuses:

- `active`
- `disabled`
- `archived`

Membership statuses:

- `invited`
- `active`
- `disabled`
- `archived`

The repository maps row values into existing domain types. It does not decide whether a staff user or membership grants access; the Loop 030 resolver performs that check.

## Supabase Error Handling

- Supabase query errors are wrapped by `SupabaseRepositoryError`.
- Missing staff returns `null`.
- No memberships returns `[]`.
- Empty ids return safe not-found values without querying.
- Error messages do not include tokens, secrets, env values, or actual key values.

## Loop 030 Resolver Connection

`SupabaseStaffAuthLookupRepository` can be passed directly to `resolveAuthenticatedTenantContext`.

Test coverage verifies:

- active staff plus selected active membership resolves tenant context.
- membership role is used as the resolved role.

Still deferred:

- obtaining `auth_user_id` from Supabase Auth/JWT/session.
- connecting this repository to `apps/api/src/admin/tenant-context.ts`.
- mapping resolver result into live Admin API runtime.

## Tests

Added:

- `tests/integration/supabase-staff-auth-lookup-repository.test.ts`

Verified:

- repository exports without env validation or network access.
- `auth_user_id` query uses `staff_users.auth_user_id`.
- staff row maps to `StaffUser`.
- missing/mismatched staff returns `null`.
- empty `auth_user_id` does not query.
- disabled/inactive staff fields are returned for resolver-side checks.
- membership query uses `staff_tenant_memberships.staff_user_id`.
- owner / manager / staff roles are mapped.
- active / invited / disabled / archived statuses are mapped.
- multiple tenant memberships are returned.
- Supabase errors are wrapped as `SupabaseRepositoryError`.
- repository can be used with `resolveAuthenticatedTenantContext`.

## Risks

- Admin API runtime still uses dev-only `x-tenant-id`.
- Supabase Auth / JWT/session verification is still not implemented.
- `staff_users` remains tenant-scoped for compatibility, while production access should use memberships.
- RLS SQL is still not implemented.
- No real Supabase DB connection has been made in this loop.

## Next Loop Candidates

```text
Loop 037: authenticated staff tenant guard
Loop 038: admin login UI integration
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
