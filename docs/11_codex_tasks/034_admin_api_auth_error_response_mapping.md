# Loop 034: Admin API Auth Error Response Mapping

## Goal

将来のSupabase Auth / JWT / authenticated staff guard導入前に、Admin API側のauth / tenant / permission errorを一貫したHTTP responseへ変換する境界を追加する。

今回はSupabase Auth、JWT/session検証、Admin UI redirect、authenticated_staff guard接続、RLS SQLは実装しない。

## Scope

- Admin API auth / tenant / permission error codeを整理する。
- Admin API error response mapperを追加する。
- 既存Admin tenant context guard errorを新しいmapperへ委譲する。
- 既存 `missing_tenant_id` / `unknown_tenant_id` のstatus/body互換を維持する。
- 将来用error codeのHTTP statusとplaceholder route対応を整理する。
- Tests、README、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth implementation
- JWT signature/session verification
- middleware implementation
- Admin login UI integration
- Admin UI API error redirect handling
- Admin API authenticated_staff guard connection
- role-based action guard
- repository changes
- Supabase repository runtime connection
- migration SQL changes
- RLS SQL implementation
- `.env` creation or update
- Supabase production connection
- OpenAI API calls
- LINE API calls
- Web crawling
- runtime switch from in-memory to Supabase

## Mapper Location

Implemented in:

- `apps/api/src/admin/auth-error-response.ts`

Reason:

- HTTP status and response body are API/Hono boundary concerns.
- `packages/domain/src/auth-context.ts` stays a pure resolver without HTTP concepts.
- The mapper imports no Supabase client, reads no env, and has no network side effects.
- Admin UI, LIFF, and Next client components do not import this server-side API boundary.

The existing guard in `apps/api/src/admin/tenant-context.ts` now delegates `mapAdminTenantGuardErrorToHttp` to the new mapper.

## Error Code List

Mapped internal codes:

- `missing_tenant_context`
- `unknown_tenant`
- `dev_tenant_header_not_allowed`
- `authenticated_staff_required`
- `missing_auth_user`
- `staff_not_found`
- `staff_inactive`
- `membership_not_found`
- `tenant_membership_denied`
- `tenant_selection_required`
- `session_expired`
- `permission_denied`

Only `missing_tenant_context` and `unknown_tenant` are currently produced by the dev-header runtime path. The rest are reserved for future Auth/JWT/staff membership loops.

## Legacy-compatible Responses

Existing Admin API behavior is preserved:

| Internal code | HTTP | Response body |
| --- | --- | --- |
| `missing_tenant_context` | 401 | `{ "ok": false, "error": "missing_tenant_id" }` |
| `unknown_tenant` | 403 | `{ "ok": false, "error": "unknown_tenant_id" }` |

The legacy response body is preserved because existing Admin UI helper tests, API tests, and local MVP scripts already depend on it.

## HTTP Status Mapping

| Internal code | HTTP | Response error | Placeholder route |
| --- | --- | --- | --- |
| `missing_tenant_context` | 401 | `missing_tenant_id` | `/login` |
| `unknown_tenant` | 403 | `unknown_tenant_id` | `/permission-denied` |
| `dev_tenant_header_not_allowed` | 403 | `dev_tenant_header_not_allowed` | `/permission-denied` |
| `authenticated_staff_required` | 401 | `authenticated_staff_required` | `/login` |
| `missing_auth_user` | 401 | `authenticated_staff_required` | `/login` |
| `staff_not_found` | 401 | `authenticated_staff_required` | `/login` |
| `session_expired` | 401 | `session_expired` | `/session-expired` |
| `staff_inactive` | 403 | `tenant_membership_denied` | `/permission-denied` |
| `membership_not_found` | 403 | `tenant_membership_denied` | `/permission-denied` |
| `tenant_membership_denied` | 403 | `tenant_membership_denied` | `/permission-denied` |
| `permission_denied` | 403 | `permission_denied` | `/permission-denied` |
| `tenant_selection_required` | 409 | `tenant_selection_required` | `/select-tenant` |

`staff_not_found`, `missing_auth_user`, `staff_inactive`, and `membership_not_found` are deliberately collapsed to response codes that do not return `auth_user_id`, tokens, secrets, env values, or verbose identifiers.

## UI Placeholder Route Connection

Loop 033 added placeholder screens:

- `/login`
- `/select-tenant`
- `/permission-denied`
- `/session-expired`

Loop 034 records the response-to-placeholder relationship in the mapper result as `placeholderRoute`, but Admin UI redirect handling is not connected yet.

Future connection examples:

- 401 `authenticated_staff_required` -> `/login`
- 401 `session_expired` -> `/session-expired`
- 403 `permission_denied` / `tenant_membership_denied` -> `/permission-denied`
- 409 `tenant_selection_required` -> `/select-tenant`

## Admin Tenant Context Guard Relationship

Loop 031 added:

- `apps/api/src/admin/tenant-context.ts`

Loop 034 changes:

- `mapAdminTenantGuardErrorToHttp` now delegates to `mapAdminAuthErrorToHttp`.
- Existing dev-only `x-tenant-id` guard behavior remains unchanged.
- Current Admin routes return mapper-derived legacy status/body for missing and unknown tenants.
- LINE webhook tenant resolution remains separate and unchanged.

Current runtime remains:

```text
Admin UI
-> dev-only x-tenant-id
-> Admin API tenant context guard
-> source: dev_header
```

## Loop 030 Auth Context Boundary Relationship

Loop 030 added:

- `packages/domain/src/auth-context.ts`
- `resolveAuthenticatedTenantContext`

That resolver stays pure:

- no Hono response
- no HTTP status
- no Supabase client
- no env reads

Loop 034 is the HTTP/API response mapping boundary that future authenticated staff guard code can use after it calls the pure resolver.

## Tests

Added:

- `tests/integration/admin-auth-error-response.test.ts`

Updated:

- `tests/integration/admin-tenant-context-guard.test.ts`

Verified:

- `missing_tenant_context` maps to legacy 401 / `missing_tenant_id`.
- `unknown_tenant` maps to legacy 403 / `unknown_tenant_id`.
- future `authenticated_staff_required`, `session_expired`, `tenant_selection_required`, `tenant_membership_denied`, and `permission_denied` mappings are defined.
- sensitive internal codes do not return token, secret, env, or auth user identifiers.
- existing representative Admin route and dev seed behavior remains unchanged.

## Risks

- Admin UI does not yet redirect based on these responses.
- Supabase Auth / JWT/session verification is still not implemented.
- authenticated_staff guard path is still not connected.
- role-based action guard is still not implemented.
- Existing dev-only `x-tenant-id` path remains active for local/test.

## Next Loop Candidates

```text
Loop 035: Supabase Auth client boundary
Loop 036: staff auth lookup repository
Loop 037: authenticated staff tenant guard
Loop 038: admin login UI integration
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
