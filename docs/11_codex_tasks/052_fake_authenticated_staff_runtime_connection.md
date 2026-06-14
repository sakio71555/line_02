# Loop 052: Fake Authenticated Staff Runtime Connection

## Goal

本物のSupabase Authや本物DBへ接続する前に、fake `AuthSessionVerifier` とfake `StaffAuthLookup` を注入して、`authenticated_staff` runtimeの接続順を検証できるAPI境界を追加する。

今回も既存Admin API routeには接続しない。現在のruntimeは引き続き `dev_header` のまま維持する。

## Scope

- `apps/api/src/admin/authenticated-runtime.ts` を追加。
- Loop 051のauth-session boundaryを使い、`Authorization: Bearer <token>` から `AuthUserIdentity` を取得する。
- `StaffAuthLookup` をdependency injectionし、`AdminTenantContext(source: authenticated_staff)` を作る。
- `selectedTenantId` をinputで受け、active membershipで再検証する。
- 任意の `AdminAction` を受け取り、role guardで許可/拒否を検証できるようにする。
- fake verifier / fake `StaffAuthLookup` によるintegration testを追加する。
- token、secret、env値をerror resultへ含めないことをtestする。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth `getUser` 本接続
- JWT署名検証の本実装
- Admin API routeへの接続
- 既存Admin routeの `dev_header` 動作変更
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

## Boundary Location

Implemented in:

```text
apps/api/src/admin/authenticated-runtime.ts
```

Reason:

- HTTP `Authorization` headerの解釈に近いAPI runtime境界である。
- `AdminTenantContext` はAPI境界の型であり、`packages/domain` へHTTP/header依存を持ち込まない。
- Supabase clientやenvを直接生成せず、`AuthSessionVerifier` と `StaffAuthLookup` を注入できる。
- 後続LoopでAdmin API routeから呼びやすい。

## Connected Existing Parts

This boundary connects:

```text
Authorization header
-> auth-session boundary
-> AuthSessionVerifier
-> AuthUserIdentity
-> authenticated staff tenant guard
-> StaffAuthLookup
-> AdminTenantContext(source=authenticated_staff)
-> optional AdminAction role guard
```

Existing parts used:

- `apps/api/src/admin/auth-session.ts`
- `apps/api/src/admin/authenticated-staff-tenant-context.ts`
- `apps/api/src/admin/role-guard.ts`
- `apps/api/src/admin/auth-error-response.ts`
- `packages/domain/src/auth-context.ts`
- `packages/domain/src/admin-permissions.ts`

## Main API

Added:

- `resolveAuthenticatedAdminRuntimeContext(input, dependencies)`

Input:

- `authorizationHeader?: string | null`
- `selectedTenantId?: string | null`
- `action?: AdminAction`

Dependencies:

- `sessionVerifier: AuthSessionVerifier`
- `staffAuthLookup: StaffAuthLookup`

Success:

- `tenantId`
- `context: AdminTenantContext(source=authenticated_staff)`
- optional `action` when role guard is requested and allowed

Failure:

- code-only `AdminAuthError`
- optional permission denial detail from role guard

The function does not create HTTP responses directly. Route connection can later use `mapAdminAuthErrorToHttp`.

## Fake Verifier Policy

Tests use fake tokens only:

- `fake-valid-owner`
- `fake-valid-manager`
- `fake-valid-staff`
- `fake-valid-multi`
- `fake-valid-no-membership`
- `fake-expired-token`

Rules:

- No real JWT-like token is used.
- No Supabase Auth API is called.
- Token values are not included in result errors.
- Token verification is dependency-injected.

## Fake StaffAuthLookup Policy

Tests use fake staff/membership data:

- owner staff
- manager staff
- staff staff
- disabled staff
- multi-tenant staff
- no-membership staff

The fake lookup mirrors the production direction:

- staff is found by `auth_user_id`.
- memberships are found by `staff_user_id`.
- active membership decides tenant and role.
- `staff_users.tenant_id` / `staff_users.role` are not treated as the production tenant/role authority.

## selectedTenantId Policy

`selectedTenantId` is a selector only.

Verified behavior:

- single active membership succeeds without selected tenant.
- multiple active memberships without selected tenant returns `tenant_selection_required`.
- selected tenant succeeds only when it matches an active membership.
- selected tenant outside memberships returns `tenant_membership_denied`.

No cookie, localStorage, sessionStorage, URL query, or persistence mechanism is implemented in this Loop.

## Error Policy

Session extraction failures:

- missing/malformed/invalid token -> `authenticated_staff_required`
- expired fake token -> `session_expired`

Staff/membership failures:

- use existing `resolveAuthenticatedStaffAdminTenantContext` error mapping.
- HTTP collapse remains the responsibility of `mapAdminAuthErrorToHttp`.

Role guard failures:

- denied `AdminAction` -> `permission_denied`

Error results do not include token strings, secrets, env values, or `auth_user_id`.

## Relationship To `dev_header`

Current Admin API runtime remains unchanged:

```text
Admin UI
-> x-tenant-id
-> Admin API
-> AdminTenantContext(source=dev_header)
-> role guard compatibility skip
```

Loop 052 adds a separate fake authenticated runtime boundary only. It is not connected to live Admin API routes.

Production `dev_header` rejection remains deferred until authenticated runtime can replace the local/test path safely.

## Tests

Added:

```text
tests/integration/fake-authenticated-staff-runtime.test.ts
```

Covered:

- import has no env validation or network access.
- owner token creates `authenticated_staff` context and allows `view_customers`.
- staff token creates `authenticated_staff` context and allows `view_customers`.
- staff token is denied for `create_ai_summary`.
- multi-tenant staff without selected tenant returns `tenant_selection_required`.
- selected tenant inside membership succeeds.
- selected tenant outside membership returns `tenant_membership_denied`.
- missing Authorization header returns `authenticated_staff_required`.
- invalid fake token returns `authenticated_staff_required`.
- expired fake token returns `session_expired`.
- no-membership staff remains compatible with the existing auth error mapper.
- existing `dev_header` tenant guard path remains unchanged.

## Not Connected Yet

Not implemented in this Loop:

- Admin API route runtime switch
- Supabase Auth `getUser`
- JWT signature verification
- Admin UI token forwarding
- production `dev_header` rejection

## Risks

- Existing Admin API routes still run through `dev_header`.
- Real Supabase Auth verifier is still missing.
- Admin UI still does not forward tokens.
- Route connection needs a separate representative route Loop before full rollout.

## Next Loop Candidates

- Loop 053: representative Admin API route authenticated runtime wiring
- Loop 054: Admin UI token forwarding placeholder
- Loop 055: dev_header production rejection implementation

## Status

Implemented in Loop 052.
