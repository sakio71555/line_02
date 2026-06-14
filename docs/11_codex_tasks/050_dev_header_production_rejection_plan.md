# Loop 050: Dev Header Production Rejection Plan

## Goal

現在local MVP確認のために使っている `x-tenant-id` / `AdminTenantContext(source: dev_header)` を、将来productionで安全に拒否するための方針をdocs-onlyで整理する。

今回は拒否実装、Admin API route変更、tenant context guard変更、JWT/session extraction、Supabase Auth接続、`.env` 追加・変更は行わない。

## Scope

- 現在の `x-tenant-id` / `dev_header` runtimeを実ファイルに基づいて整理する。
- productionで `dev_header` を拒否する理由を整理する。
- まだ拒否してはいけない理由を整理する。
- local / test / staging / production のruntime mode matrixを整理する。
- environment detection候補を整理する。
- rejection error response方針を整理する。
- staging migration方針を整理する。
- local/test互換維持方針を整理する。
- Admin API role guard、Admin UI、RLSとの関係を整理する。
- 後続Loop候補を整理する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- `dev_header` rejection実装
- `x-tenant-id`拒否実装
- Admin API route変更
- tenant context guard変更
- role guard変更
- authenticated_staff runtime接続
- JWT署名検証実装
- session取得実装
- Authorization header parsing実装
- Supabase Auth `getUser` 実装
- StaffAuthLookup runtime注入実装
- Admin UI login submit実装
- Admin UI token forwarding実装
- cookie / localStorage / sessionStorage保存
- `.env` 作成・変更
- 環境変数追加
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- Supabase本番接続
- `supabase link`
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール

## Current `x-tenant-id` / `dev_header` Runtime

Current flow:

```text
Admin UI
-> apps/admin/src/admin-api.ts
-> x-tenant-id header
-> Admin API route
-> apps/api/src/admin/tenant-context.ts
-> AdminTenantContext(source: dev_header)
-> role guard compatibility skip
-> tenant-scoped repository/service
```

### Admin UI side

File:

- `apps/admin/src/admin-api.ts`

Current behavior:

- `getAdminApiConfig` reads `API_BASE_URL`, `TENANT_ID`, and `STAFF_ID` from env/defaults.
- `DEFAULT_TENANT_ID = tenant_amamihome`.
- `adminApiFetch` sets `x-tenant-id` on every Admin API request.
- `sendStaffReply` also sets dev-only `x-staff-id`.

Meaning:

- These headers are local/dev/test compatibility inputs.
- They are not authenticated identity, tenant authorization, or role authorization.

### Admin API side

Files:

- `apps/api/src/index.ts`
- `apps/api/src/admin/tenant-context.ts`

Current behavior:

- Current Admin routes read `c.req.header("x-tenant-id")`.
- `resolveAdminTenant` delegates to `resolveAdminTenantContext`.
- `resolveAdminTenantContext` trims the header and compares it with `loadAppConfig(env).tenant.id`.
- Missing tenant header returns `missing_tenant_context`, mapped to legacy `401 { ok:false, error:"missing_tenant_id" }`.
- Unknown tenant returns `unknown_tenant`, mapped to legacy `403 { ok:false, error:"unknown_tenant_id" }`.
- Known tenant creates:

```ts
{
  tenantId,
  source: "dev_header"
}
```

### Role guard compatibility

File:

- `apps/api/src/admin/role-guarded-handler.ts`

Current behavior:

- `source: authenticated_staff` enforces role guard with `AdminAction`.
- `source: dev_header` returns `mode: "skipped_dev_header"`.

Meaning:

- `dev_header` skip exists only to keep existing local MVP flows working before Auth/JWT is connected.
- It must not be treated as production authorization.

### Dev seed route

File:

- `apps/api/src/index.ts`

Current behavior:

- `POST /api/dev/seed-demo-data` is disabled when `APP_ENV=production` or `NODE_ENV=production`.
- Non-production still requires `x-tenant-id` and uses the same dev tenant guard.

Meaning:

- Dev seed is local/test support only.
- It should remain outside production role-granted operations.

## Why Production Must Reject `dev_header`

Production must not treat `x-tenant-id` / `dev_header` as tenant authorization because:

- `x-tenant-id` is caller-controlled and can be freely sent by a client.
- Tenant boundaries become unsafe if the database/repository tenant is selected only by a client header.
- Production tenant context must be derived from verified staff identity and active membership.
- Role guard depends on a trusted `authenticated_staff` context with `staffUserId`, `authUserId`, and membership-derived `role`.
- `dev_header` has no trusted `staffUserId`, `authUserId`, or `role`.
- UI visibility and disabled states are only usability aids; Admin API guard remains the source of truth.

Rule:

```text
productionでは dev_header をtenant authorizationとして扱ってはいけない。
```

## Why Rejection Must Not Be Implemented Yet

Do not reject `dev_header` immediately because:

- `authenticated_staff` runtime is not connected to Admin API routes.
- JWT/session extraction is not implemented.
- Authorization header parsing is not implemented.
- Supabase Auth `getUser` / token verification is not implemented.
- `StaffAuthLookup` runtime injection is not implemented.
- Admin UI login submit and token forwarding are not implemented.
- Current local MVP manual testing depends on `x-tenant-id`.

If rejection is implemented too early, `/customers`, `/customers/[customerId]`, `/alerts`, AI actions, staff reply, demo seed, and local manual checklist flows can stop working before a replacement runtime exists.

## Runtime Mode Matrix

| Environment | dev_header allowed? | authenticated_staff required? | role guard enforce? | Expected token source | Notes |
| --- | --- | --- | --- | --- | --- |
| local | Yes | Optional later | Only for fake/authenticated_staff contexts | None at first; later fake token/session | Preserve MVP confirmation. Do not connect to production Supabase. |
| test | Yes for legacy tests | Optional fake contexts | Enforce only when fake authenticated_staff context is used | Fake identity / fake StaffAuthLookup | No real JWT verification. No production Supabase. |
| staging | Prefer no; temporary explicit allow only during migration | Yes as primary runtime | Yes for authenticated_staff | Staging Supabase Auth session/token | Dummy tenant/staff only. No real customer LINE userId. |
| production | No | Yes | Yes | Production Supabase Auth session/token | Reject dev_header. Service role server-side only. RLS planned. |

## Environment Detection Policy

Existing environment detection:

- `apps/api/src/index.ts` uses `APP_ENV=production` or `NODE_ENV=production` to disable dev seed.

Candidate future env/config names:

```text
APP_ENV=local|test|staging|production
ADMIN_AUTH_MODE=dev_header|authenticated_staff
ALLOW_DEV_TENANT_HEADER=true|false
```

Recommended direction:

- Keep `APP_ENV` as the broad runtime environment indicator.
- Introduce an explicit Admin auth mode only in a later implementation Loop.
- Require explicit opt-in for allowing dev tenant headers outside local/test.
- Default production behavior should be deny-by-default for `dev_header`.

Important:

- This Loop does not add env vars.
- Final env names must be confirmed in the implementation Loop before `.env.example` or code changes.

## Rejection Error Response Policy

Existing mapper:

- `apps/api/src/admin/auth-error-response.ts`

Existing candidate codes:

| Case | Internal code | HTTP | Response body | Placeholder |
| --- | --- | --- | --- | --- |
| production request uses `x-tenant-id` / dev path | `dev_tenant_header_not_allowed` | 403 | `{ ok:false, error:"dev_tenant_header_not_allowed" }` | `/permission-denied` |
| no valid authenticated staff context | `authenticated_staff_required` | 401 | `{ ok:false, error:"authenticated_staff_required" }` | `/login` |
| expired/invalid session recognized as expired | `session_expired` | 401 | `{ ok:false, error:"session_expired" }` | `/session-expired` |
| selected tenant missing for multi-tenant staff | `tenant_selection_required` | 409 | `{ ok:false, error:"tenant_selection_required" }` | `/select-tenant` |
| role lacks action permission | `permission_denied` | 403 | `{ ok:false, error:"permission_denied" }` | `/permission-denied` |

Rules:

- Do not include token, `auth_user_id`, staff id, secret, env values, or production logs in response bodies.
- `dev_tenant_header_not_allowed` is already represented in the mapper and can be used by a later rejection implementation.
- Existing legacy `missing_tenant_id` / `unknown_tenant_id` responses should remain for local/test compatibility until runtime switch is deliberate.

## Staging Migration Plan

Safe staging rollout:

1. Prepare dummy tenant and dummy staff only.
2. Ensure no real customer LINE userId or production logs exist in staging.
3. Implement Supabase Auth session extraction boundary with fake/unit tests first.
4. Connect fake or staging `StaffAuthLookup` in a controlled staging runtime.
5. Verify `authenticated_staff` runtime on a representative route.
6. Verify Admin API role guard enforces `owner` / `manager` / `staff`.
7. Move from representative route to full Admin API rollout.
8. Mark `dev_header` as warning-only in staging if a temporary bridge is needed.
9. Enable `dev_header` rejection in staging.
10. Update local manual checklist before production rollout.
11. Enable production rejection only after staging passes.

Staging data policy:

- Use dummy staff, dummy tenant, and dummy CRM data only.
- Do not use real LINE user IDs.
- Do not use real customer content.
- Do not store API keys, tokens, or production logs in docs.

## Local / Test Compatibility

Local:

- Keep `dev_header` allowed until authenticated runtime and Admin UI token forwarding are usable.
- Keep in-memory / mock-heavy MVP confirmation flows.
- Do not connect local tests to production Supabase.

Test:

- Keep legacy dev-header tests so existing MVP behavior remains covered.
- Add fake `authenticated_staff` tests for new runtime paths.
- Use fake `AuthUserIdentity`, fake `StaffAuthLookup`, and fake Supabase clients.
- Do not run tests against production DB/Auth.

## Admin API Role Guard Relationship

Current:

```text
source: dev_header
  -> role guard compatibility skip

source: authenticated_staff
  -> role guard enforce by AdminAction
```

After production rejection:

```text
production request
-> dev_header detected
-> reject before route service/repository body

authenticated_staff request
-> role guard enforce
-> route service/repository body
```

Policy:

- dev seed, health, and LINE webhook remain outside Admin role guard for their own boundaries.
- Admin API route/action mapping remains the authorization map for Admin staff operations.
- UI control cannot replace API guard.

## Admin UI Relationship

| UI / artifact | Current role | Future relationship |
| --- | --- | --- |
| `/login` | disabled placeholder | Entry point when `authenticated_staff_required` is returned. |
| `/select-tenant` | static placeholder | Used when `tenant_selection_required` is returned. |
| `/permission-denied` | static safe state | Used for `permission_denied`, `tenant_membership_denied`, and `dev_tenant_header_not_allowed`. |
| `/session-expired` | static safe state | Used for `session_expired`. |
| `RoleVisibilityNote` | explanatory placeholder | Replaced or reduced once real role visibility control is connected. |
| role visibility fixtures | test-only expected matrix | Used when disabling/hiding UI controls by role. |
| Admin API helper | currently sends `x-tenant-id` | Later forwards token/selected tenant from authenticated server/session boundary. |

## RLS Relationship

Production `dev_header` rejection helps move tenant boundaries away from caller-controlled headers.

RLS relationship:

- `authenticated_staff` runtime provides the identity/membership basis that RLS policies should mirror.
- RLS may use `auth.uid()` with `staff_users.auth_user_id` and `staff_tenant_memberships`.
- Service role repositories can bypass RLS, so API/repository tenant filters remain mandatory.
- Client direct DB access is not part of the initial production design.
- RLS SQL and local Auth/RLS test harness are later Loops.

## Why No Implementation In This Loop

Production rejection affects authentication, route entry, local manual testing, staging rollout, UI forwarding, and error mapping. Implementing it before token/session extraction and fake authenticated runtime would make the system harder to verify and could break current MVP flows.

Loop 050 fixes the policy and sequence first. Implementation should wait until authenticated runtime exists.

## Recommended Next Loops

```text
Loop 051: Supabase Auth session extraction boundary
Loop 052: authenticated staff runtime fake integration
Loop 053: authenticated staff runtime representative route
Loop 054: authenticated staff runtime Admin API rollout
Loop 055: admin UI session token forwarding plan
Loop 056: admin login submit integration
Loop 057: tenant selection selectedTenantId persistence plan
Loop 058: staging dev_header rejection test plan
Loop 059: production dev_header rejection implementation
Loop 060: RLS SQL draft
```

Implementation order:

1. Do not implement production rejection first.
2. Add session/token extraction boundary.
3. Add fake authenticated runtime tests.
4. Connect representative route.
5. Roll out Admin API authenticated runtime.
6. Add Admin UI token forwarding/session plan and implementation.
7. Test staging rejection.
8. Implement production rejection.

## Risks

- Current local runtime still accepts `x-tenant-id`.
- Current role guard still skips `dev_header`.
- Environment/auth mode names are not finalized.
- Staging/prod rejection can break operations if enabled before Auth/JWT and UI token forwarding work.
- RLS SQL is still unimplemented.
