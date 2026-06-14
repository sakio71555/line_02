# Loop 037: Authenticated Staff Tenant Guard

## Goal

将来の本番Admin APIで使う `authenticated_staff` tenant context guard境界を追加する。

Loop 030のpure resolverとLoop 036の `StaffAuthLookup` repositoryをつなぐためのAPI境界であり、今回はJWT/session検証、Admin API route接続、dev-header runtime置き換え、RLS SQL、本番Supabase接続は実装しない。

## Scope

- Admin API用authenticated staff tenant guard境界を追加する。
- `AuthUserIdentity + optional selectedTenantId + StaffAuthLookup` から `AdminTenantContext(source: authenticated_staff)` を作る。
- `selectedTenantId` をmembershipで再検証する。
- 複数active membership時に `tenant_selection_required` を返せるようにする。
- domain auth context errorをAdmin auth error mapperへ接続できる形にする。
- fake `StaffAuthLookup` でtestを追加する。
- 既存dev-only `x-tenant-id` guardを維持する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- JWT signature verification
- Supabase Auth session retrieval
- cookie/session/localStorage/sessionStorage handling
- Admin API route authenticated_staff runtime connection
- Admin API route replacement
- dev-only `x-tenant-id` removal
- Admin UI login integration
- Admin UI redirect handling
- middleware implementation
- RLS SQL
- migration SQL changes
- repository runtime switch
- `.env` creation or update
- Supabase production connection
- OpenAI API calls
- LINE API calls
- Web crawling

## Guard Location

Implemented in:

- `apps/api/src/admin/authenticated-staff-tenant-context.ts`

Reason:

- The guard produces `AdminTenantContext`, which is an API boundary concept.
- The pure resolver remains in `packages/domain`.
- The Supabase lookup repository remains in `packages/db`.
- The guard accepts `StaffAuthLookup` by injection and does not import Supabase clients.
- The guard reads no env, creates no client, and is not wired into Hono routes in this loop.

## Input / Output

Input:

```ts
type AuthenticatedStaffTenantContextInput = {
  authUser: AuthUserIdentity;
  selectedTenantId?: string | null;
};
```

Success:

```ts
{
  ok: true,
  tenantId: string,
  context: {
    tenantId: string,
    source: "authenticated_staff",
    staffUserId: string,
    authUserId: string,
    role: "owner" | "manager" | "staff"
  }
}
```

Failure:

```ts
{
  ok: false,
  error: AdminAuthError
}
```

## `AdminTenantContext(source: authenticated_staff)`

The guard returns:

- `tenantId`: membership-derived tenant id.
- `source`: `authenticated_staff`.
- `staffUserId`: resolved staff id.
- `authUserId`: verified identity id passed into the guard.
- `role`: membership-derived role.

Important rules:

- `staff_users.tenant_id` is not used to decide production tenant context.
- `staff_users.role` is not used to decide production role.
- `selectedTenantId` is only a selector and must match active membership.
- active membership is required.

## Loop 030 Resolver Connection

The guard delegates to:

- `resolveAuthenticatedTenantContext(input, lookup)`

Flow remains:

1. reject empty `authUserId`;
2. lookup staff by `authUserId`;
3. reject missing staff;
4. reject disabled / archived / inactive staff;
5. list memberships;
6. keep only active memberships;
7. require tenant selection if multiple active memberships exist;
8. verify selected tenant against active memberships;
9. return membership-derived tenant context.

## Loop 036 StaffAuthLookup Relationship

The guard accepts any `StaffAuthLookup`.

Current concrete implementation available for future wiring:

- `SupabaseStaffAuthLookupRepository`

Loop 037 does not instantiate it, does not create Supabase clients, and does not connect it to runtime routes.

## Error Mapping Policy

Added:

- `mapAuthContextErrorToAdminAuthError(error)`

Current behavior:

- Domain `AuthContextErrorCode` is preserved as `AdminAuthError.code`.
- `mapAdminAuthErrorToHttp` from Loop 034 remains the HTTP response mapper.

Examples:

| Domain error | Admin HTTP response via existing mapper |
| --- | --- |
| `missing_auth_user` | `401 authenticated_staff_required` |
| `staff_not_found` | `401 authenticated_staff_required` |
| `staff_inactive` | `403 tenant_membership_denied` |
| `membership_not_found` | `403 tenant_membership_denied` |
| `tenant_selection_required` | `409 tenant_selection_required` |
| `tenant_membership_denied` | `403 tenant_membership_denied` |

Existing dev-header response compatibility is unchanged:

- missing dev tenant still maps to `401 missing_tenant_id`.
- unknown dev tenant still maps to `403 unknown_tenant_id`.

## Dev-only `x-tenant-id` Path

Loop 037 does not change runtime route behavior.

Current runtime remains:

```text
Admin API route
-> dev-only x-tenant-id
-> AdminTenantContext(source: dev_header)
```

Future runtime remains deferred:

```text
Admin API route
-> JWT/session verification
-> auth_user_id
-> authenticated staff tenant guard
-> AdminTenantContext(source: authenticated_staff)
```

## Tests

Added:

- `tests/integration/authenticated-staff-tenant-guard.test.ts`

Verified:

- active staff + one active membership returns `AdminTenantContext(source: authenticated_staff)`.
- context includes `tenantId`, `staffUserId`, `authUserId`, and membership-derived `role`.
- staff legacy role and tenant are not used for production tenant/role decision.
- multiple active memberships without selected tenant returns `tenant_selection_required`.
- selected tenant succeeds only when it is an active membership.
- selected tenant outside memberships is rejected.
- disabled and archived staff are rejected.
- invited / disabled / archived memberships are rejected.
- staff not found and membership missing are rejected.
- domain auth errors can be passed to Admin auth HTTP mapper.
- existing dev-only `x-tenant-id` guard remains unchanged.
- importing the guard does not validate env or access network.

## Risks

- Admin API routes are not yet connected to the authenticated staff guard.
- JWT/session verification is still not implemented.
- Supabase Auth session retrieval is still not implemented.
- dev-only `x-tenant-id` runtime remains active for local/test.
- RLS SQL is still not implemented.

## Next Loop Candidates

```text
Loop 038: admin login UI integration
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
