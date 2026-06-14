# Loop 053: Representative Admin API Authenticated Runtime Wiring

## Goal

Admin API全体を `authenticated_staff` runtimeへ切り替える前に、代表route 1本で fake authenticated runtime wiring を検証する。

今回の代表routeは `GET /api/admin/customers` とする。読み取り系で影響が小さく、`view_customers` は `owner` / `manager` / `staff` すべてで許可されるため、最初のroute wiringとして安全に扱える。

## Scope

- `GET /api/admin/customers` にだけ authenticated_staff runtime wiring を追加する。
- `Authorization` headerがある場合だけ、Loop 052の `resolveAuthenticatedAdminRuntimeContext` を呼ぶ。
- fake `AuthSessionVerifier` とfake `StaffAuthLookup` を `createApiApp` から注入できるようにする。
- `authenticated_staff` contextでは `view_customers` role guardをenforceする。
- `dev_header` contextでは既存MVP互換を維持する。
- `selectedTenantId` はtest-only dependency inputとして扱う。
- route-level testを追加する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- 全Admin API routeへのauthenticated runtime展開
- Supabase Auth `getUser` 本接続
- JWT署名検証の本実装
- production `dev_header` rejection実装
- Admin UI token forwarding / login submit
- cookie / localStorage / sessionStorage保存
- `.env` 作成・変更
- 環境変数追加
- middleware実装
- RLS SQL / migration変更
- repository変更
- Supabase本番接続
- LINE API / OpenAI API / Webクロール

## Representative Route

Adopted route:

```text
GET /api/admin/customers
AdminAction: view_customers
```

Reason:

- read-only route
- central to local MVP manual checks
- returns tenant-scoped customer list
- `view_customers` is allowed for `owner`, `manager`, and `staff`
- no mutation, LINE send, AI call, or Supabase connection is involved

## Wiring Policy

Current dev path remains:

```text
GET /api/admin/customers
-> no Authorization header
-> x-tenant-id
-> resolveAdminTenantContext
-> AdminTenantContext(source=dev_header)
-> role guard compatibility skip
-> listCustomerListItems
```

New representative authenticated path:

```text
GET /api/admin/customers
-> Authorization: Bearer fake-valid-*
-> resolveAuthenticatedAdminRuntimeContext
-> AuthSessionVerifier(fake)
-> StaffAuthLookup(fake)
-> AdminTenantContext(source=authenticated_staff)
-> role guard enforce view_customers
-> listCustomerListItems
```

Only this representative route is wired. Other Admin routes are unchanged.

## Dependency Injection

Added optional `createApiApp` dependencies:

- `adminAuthRuntime`
- `authenticatedSelectedTenantId`

`adminAuthRuntime` provides:

- `sessionVerifier`
- `staffAuthLookup`

These are intentionally dependency-injected so tests can use fake boundaries and production code does not accidentally connect to Supabase Auth.

If an `Authorization` header is present but `adminAuthRuntime` is not provided, the representative route returns `authenticated_staff_required`.

## Fake Verifier / Fake StaffAuthLookup

Tests use fake tokens only:

- `fake-valid-owner`
- `fake-valid-manager`
- `fake-valid-staff`
- `fake-valid-multi`
- `fake-expired`
- `fake-invalid`

No real JWT-like token is used. No Supabase Auth API is called.

Fake `StaffAuthLookup` maps:

- owner staff
- manager staff
- staff staff
- multi-tenant staff

Membership-derived tenant and role remain the source of truth.

## selectedTenantId Policy

For Loop 053, selected tenant is not transported through a public HTTP header, cookie, query parameter, localStorage, or sessionStorage.

Instead, tests pass a test-only `authenticatedSelectedTenantId` to `createApiApp`.

Reason:

- selected tenant transport is not finalized yet.
- this Loop only verifies route wiring.
- adding a public header now could look like production contract too early.

Future Loops should decide whether selected tenant travels via server-side session, cookie, header, or another boundary.

## Error Response Policy

Representative route maps auth/runtime errors through `mapAdminAuthErrorToHttp`.

Expected response bodies:

- `401 { ok:false, error:"authenticated_staff_required" }`
- `401 { ok:false, error:"session_expired" }`
- `409 { ok:false, error:"tenant_selection_required" }`
- `403 { ok:false, error:"tenant_membership_denied" }`

Responses do not include token values, `auth_user_id`, secrets, env values, or production logs.

## permission_denied Policy

Route-level `permission_denied` is not tested in Loop 053.

Reason:

- representative route uses `view_customers`.
- `view_customers` is allowed for `owner`, `manager`, and `staff`.
- forcing `permission_denied` here would require action override or a second route, which would make this Loop broader than intended.

`permission_denied` remains covered by existing role guard boundary and fake authenticated runtime tests.

## Tested Cases

Added:

```text
tests/integration/admin-api-authenticated-runtime-representative-route.test.ts
```

Covered:

- `GET /api/admin/customers` with `x-tenant-id` still succeeds through `dev_header`.
- missing `x-tenant-id` and no Authorization returns legacy `missing_tenant_id`.
- unknown `x-tenant-id` and no Authorization returns legacy `unknown_tenant_id`.
- `fake-valid-owner` succeeds through authenticated route.
- `fake-valid-manager` succeeds through authenticated route.
- `fake-valid-staff` succeeds through authenticated route.
- Authorization present without runtime deps returns `authenticated_staff_required`.
- `fake-invalid` returns `authenticated_staff_required` without leaking token values.
- `fake-expired` returns `session_expired`.
- multi-tenant fake staff without selected tenant returns `tenant_selection_required`.
- selected tenant outside memberships returns `tenant_membership_denied`.
- selected tenant inside memberships scopes returned customers to that tenant.

## Existing MVP Preservation

Existing non-representative Admin routes, dev seed, health, LINE webhook, AI/RAG routes, alert routes, and staff reply routes are unchanged.

The existing `x-tenant-id` local/test flow remains supported.

## Not Implemented Yet

- full Admin route rollout
- Supabase Auth verifier / `getUser`
- real JWT signature verification
- Admin UI token forwarding
- selected tenant persistence
- production `dev_header` rejection

## Risks

- The authenticated runtime is only wired to one route.
- Test-only `authenticatedSelectedTenantId` is not a production transport contract.
- Production still requires real Supabase Auth verifier and real StaffAuthLookup runtime wiring.

## Next Loop Candidates

- Loop 054: Admin API authenticated runtime full route rollout plan
- Loop 055: Admin UI token forwarding placeholder
- Loop 056: production dev_header rejection implementation

## Status

Implemented in Loop 053.
