# Loop 030: Auth Context Boundary

## Goal

本番向けAdmin APIでdev-only `x-tenant-id` に依存しないため、認証済みstaff identityからtenant contextを解決する純粋な境界を追加する。

今回はAPI route、middleware、JWT検証、Supabase Auth、RLS SQL、runtime wiringには接続しない。

## Scope

- auth context境界の型・interfaceを追加する。
- `auth_user_id` からstaff identityとactive membershipを解決するresolverを追加する。
- selected tenantをmembershipで再検証する。
- fake lookupでresolverをテストする。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth implementation
- JWT signature verification
- middleware implementation
- API route changes
- existing Admin API tenant resolver replacement
- repository changes
- Supabase repository runtime connection
- Admin login UI
- LIFF auth implementation
- RLS SQL implementation
- migration SQL changes
- `.env` creation or update
- Supabase production connection
- `supabase link`
- OpenAI API calls
- LINE API calls
- Web crawling
- runtime switch from in-memory to Supabase

## Boundary Location

Implemented in:

- `packages/domain/src/auth-context.ts`
- exported from `packages/domain/src/index.ts`

Reason:

- The resolver is domain logic and does not depend on Hono, Next.js, Supabase client, env, or request headers.
- Keeping it in `packages/domain` avoids coupling it to `apps/api` before the Admin API guard loop.
- It can be tested with fake lookup implementations.
- Importing it has no env validation or network side effects.

## Added Types / Interfaces

- `AuthUserIdentity`
- `TenantContextResolutionInput`
- `ResolvedTenantContext`
- `AuthContextErrorCode`
- `AuthContextError`
- `TenantContextResolutionResult`
- `StaffAuthLookup`

`StaffAuthLookup` is injected:

- `findStaffByAuthUserId(authUserId)`
- `listMembershipsByStaffUserId(staffUserId)`

The boundary does not know whether lookup is backed by in-memory data, Supabase repository, or a future auth/session layer.

## Resolver

Added:

- `resolveAuthenticatedTenantContext(input, lookup)`

Flow:

1. Reject empty `authUserId`.
2. Lookup staff by `authUserId`.
3. Reject missing staff.
4. Reject staff unless `staff.status === "active"` and `staff.is_active === true`.
5. Lookup memberships for `staff.id`.
6. Keep only memberships where `staff_user_id` matches and `status === "active"`.
7. Reject when no active memberships exist.
8. If one active membership exists and no selected tenant was provided, use it.
9. If multiple active memberships exist and no selected tenant was provided, return `tenant_selection_required`.
10. If selected tenant was provided, allow it only when it matches an active membership.
11. Return tenant context with membership-derived role.

## Active Staff Rule

Active staff requires both:

- `staff_users.status = active`
- legacy compatibility flag `staff_users.is_active = true`

`disabled` and `archived` staff are rejected.

## Active Membership Rule

Only `staff_tenant_memberships.status = active` grants tenant access.

`invited`, `disabled`, and `archived` memberships are ignored and do not grant access.

## Selected Tenant Rule

`selectedTenantId` is only a requested tenant selector. It is never trusted by itself.

- If staff has one active membership, no selected tenant is required.
- If staff has multiple active memberships, selected tenant is required.
- Selected tenant must match an active membership.
- Membership role is the role returned in `ResolvedTenantContext`.

## Error Code Policy

Error codes:

- `missing_auth_user`
- `staff_not_found`
- `staff_inactive`
- `membership_not_found`
- `tenant_selection_required`
- `tenant_membership_denied`

Errors are code-only and do not include token, secret, env, password, or verbose identifiers. HTTP 401/403 mapping is intentionally deferred to the Admin API guard loop.

## Relationship To Dev-only `x-tenant-id`

Current Admin API still uses `x-tenant-id` through the existing dev resolver.

Loop 030 does not replace it.

Policy:

- `x-tenant-id` remains local/dev/test only.
- Production auth context must come from verified session/JWT and active membership.
- A future selected-tenant header/cookie may be used only as a selector and must be validated against memberships.
- Admin API tenant guard is a later loop.

## Supabase Auth / JWT Future Connection

Future flow:

1. Verify Supabase Auth session/JWT.
2. Extract `auth_user_id`.
3. Call `resolveAuthenticatedTenantContext`.
4. Map resolver errors to 401/403.
5. Pass resolved `tenantId` to repositories.

This loop does not verify JWT signatures and does not import Supabase client.

## RLS Plan Connection

Loop 025 planned RLS around authenticated tenant context. This boundary prepares the application-side context that RLS policies can mirror later:

- `auth.uid()` can map to `staff_users.auth_user_id`.
- membership lookup maps to `staff_tenant_memberships`.
- service role repositories must still keep explicit `tenant_id` filters.
- RLS SQL and local RLS tests remain deferred.

## Tests

Added:

- `tests/integration/auth-context-boundary.test.ts`

Verified:

- active staff + one active membership resolves tenant context.
- multiple active memberships require selected tenant.
- selected tenant is accepted only when active membership exists.
- selected tenant outside memberships is rejected.
- disabled / archived / inactive staff is rejected.
- invited / disabled / archived memberships do not grant access.
- empty `authUserId` is rejected without lookup.
- missing staff is rejected.
- no membership is rejected.
- role comes from membership.
- lookup is not touched until resolver is called.

Tests use fake lookup only and do not connect to Supabase, LINE, OpenAI, or external services.

## Risks

- Admin API still uses dev-only `x-tenant-id`.
- No JWT/session verification exists yet.
- No middleware or route guard is connected yet.
- RLS SQL is still not implemented.
- Runtime still uses in-memory repositories by default.

## Next Loop Candidates

```text
Loop 031: admin API tenant context guard
Loop 032: admin auth placeholder UI plan
Loop 033: RLS SQL draft
Loop 034: local auth/RLS test harness
Loop 035: Supabase repository runtime switch plan
```
