# Loop 049: Authenticated Runtime Connection Plan

## Goal

現在のAdmin API / Admin UI runtimeを、dev-only `x-tenant-id` / `AdminTenantContext(source: dev_header)` から、将来の `AdminTenantContext(source: authenticated_staff)` へ安全に接続するための順序、境界、リスクをdocs-onlyで整理する。

今回は実装しない。Supabase Auth、JWT/session検証、Admin API route差し替え、StaffAuthLookup runtime注入、`.env` 変更、RLS SQL、UI制御は行わない。

## Scope

- 現在の `dev_header` runtimeを実ファイルに基づいて整理する。
- `authenticated_staff` runtimeに必要な既存部品を整理する。
- まだ足りない境界を整理する。
- JWT/session extraction方針を整理する。
- `selectedTenantId` 方針を整理する。
- `StaffAuthLookup` runtime injection方針を整理する。
- Supabase Auth client / service role client / anon key / service role keyの責務を整理する。
- local / test / staging / production runtime切替方針を整理する。
- productionで `dev_header` を拒否する順序を整理する。
- Admin API role guard、Admin UI、RLSとの関係を整理する。
- 後続Loop候補を整理する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth実装
- JWT署名検証実装
- session取得実装
- cookie / localStorage / sessionStorage保存
- Admin API route変更
- Admin API tenant guardのruntime差し替え
- `StaffAuthLookup` runtime注入実装
- Supabase本番接続
- `supabase link`
- `.env` 作成・変更
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- Admin UI login submit実装
- Admin UI role visibility本実装
- button disabled / hidden実装
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール

## Current `dev_header` Runtime

現在のAdmin runtime:

```text
Admin UI
-> apps/admin/src/admin-api.ts
-> x-tenant-id header
-> Admin API route
-> apps/api/src/admin/tenant-context.ts
-> AdminTenantContext(source: dev_header)
-> role guard compatibility skip
-> repository/service
```

### Admin UI helper

File:

- `apps/admin/src/admin-api.ts`

Current behavior:

- `DEFAULT_API_BASE_URL = http://localhost:4000`
- `DEFAULT_TENANT_ID = tenant_amamihome`
- `DEFAULT_STAFF_ID = dev_staff`
- `getAdminApiConfig` reads `API_BASE_URL`, `TENANT_ID`, `STAFF_ID` from env/defaults.
- `adminApiFetch` always sets `x-tenant-id`.
- `sendStaffReply` additionally sets dev-only `x-staff-id`.

Policy:

- `x-tenant-id` is local/dev/test selector only.
- `x-staff-id` is dev metadata only.
- Neither header is production authentication or authorization.

### Admin API tenant context guard

Files:

- `apps/api/src/index.ts`
- `apps/api/src/admin/tenant-context.ts`

Current behavior:

- Each current Admin route reads `c.req.header("x-tenant-id")`.
- Route-local `resolveAdminTenant` delegates to `resolveAdminTenantContext`.
- Missing header returns legacy `401 { ok:false, error:"missing_tenant_id" }`.
- Unknown tenant returns legacy `403 { ok:false, error:"unknown_tenant_id" }`.
- Known configured tenant returns:

```ts
{
  tenantId: "tenant_amamihome",
  source: "dev_header"
}
```

### dev seed route

File:

- `apps/api/src/index.ts`

Current behavior:

- `POST /api/dev/seed-demo-data` is disabled when `APP_ENV=production` or `NODE_ENV=production`.
- It still requires `x-tenant-id` in non-production.
- It uses the same dev tenant guard as Admin routes.

Policy:

- Dev seed remains local-only and role guard対象外.
- It must not become production role-granted operation.

### Role guard compatibility

File:

- `apps/api/src/admin/role-guarded-handler.ts`

Current behavior:

- `source: authenticated_staff` is checked with `evaluateAdminRoleGuard`.
- `source: dev_header` returns `mode: "skipped_dev_header"`.

Policy:

- The skip is temporary MVP compatibility.
- It is not production authorization.
- Production must reject `dev_header` after authenticated runtime works.

## Existing `authenticated_staff` Runtime Parts

| Part | Location | Responsibility | Runtime connected? |
| --- | --- | --- | --- |
| Auth context resolver | `packages/domain/src/auth-context.ts` | `auth_user_id + StaffAuthLookup + selectedTenantId` からtenant contextを純粋に解決する。 | No |
| API authenticated staff guard | `apps/api/src/admin/authenticated-staff-tenant-context.ts` | `AuthUserIdentity + StaffAuthLookup` を `AdminTenantContext(source: authenticated_staff)` へ変換する。 | No |
| Staff lookup repository | `packages/db/src/supabase/repositories/staff-auth-lookup-repository.ts` | `staff_users.auth_user_id` と `staff_tenant_memberships.staff_user_id` を読む。 | No |
| Auth error mapper | `apps/api/src/admin/auth-error-response.ts` | auth/tenant/permission errorをHTTP status、body、placeholder routeへ変換する。 | Partially, dev guard uses it |
| Role permission boundary | `packages/domain/src/admin-permissions.ts` | `owner` / `manager` / `staff` と `AdminAction` の許可判定を行う。 | Indirectly via role guard |
| Admin role guard | `apps/api/src/admin/role-guard.ts` | `authenticated_staff` contextだけをrole判定対象にする。 | Compatibility hook only |
| Admin route/action mapping | `apps/api/src/admin/role-guarded-handler.ts` | Admin routeごとの `AdminAction` mappingとguard hookを提供する。 | Yes, dev_header skip |
| Supabase Auth config/client | `packages/db/src/supabase/auth-config.ts`, `auth-client.ts` | `SUPABASE_URL` / `SUPABASE_ANON_KEY` からAuth client境界を作る。 | No |
| Supabase service role client boundary | `packages/db/src/supabase/client.ts` | server-side repository用のservice role / anon client境界。 | Repositories only, not runtime |
| Auth placeholder UI | `apps/admin/app/login`, `select-tenant`, `permission-denied`, `session-expired` | 将来のsafe stateを表示する。 | Placeholder only |
| Role visibility fixtures | `tests/fixtures/admin-ui-role-visibility.ts` | UI operationと `AdminAction`、role別期待visibilityを固定する。 | Test only |

## Missing Boundaries

後続Loopで必要な未実装境界:

| Missing boundary | Purpose | Notes |
| --- | --- | --- |
| Authorization header parsing | `Authorization: Bearer <access_token>` を安全に取り出す。 | Empty / malformed / multiple valuesの扱いをtestする。 |
| JWT/session extraction boundary | tokenからSupabase Auth userを検証し、`auth_user_id` を得る。 | 今回は実装しない。 |
| Supabase Auth getUser/verify boundary | `createSupabaseAuthServerClient` などを使い、access tokenを検証する。 | service role keyをbrowserへ出さない。 |
| AuthUserIdentity mapper | Supabase Auth userを `{ authUserId, email? }` へ正規化する。 | token/user objectをrouteへばら撒かない。 |
| selectedTenantId transport | 複数tenant所属staffの選択tenantをAPIへ渡す方法を決める。 | header/cookie/session/queryなどを比較する。 |
| StaffAuthLookup factory | request runtimeで `SupabaseStaffAuthLookupRepository` を生成/注入する。 | local/testではfake lookup注入可能にする。 |
| Admin tenant context source selector | requestごとに `authenticated_staff` とdev fallbackをどう選ぶか決める。 | productionではdev fallback禁止。 |
| fake authenticated request fixtures | local/testで本番Supabaseなしに `authenticated_staff` pathを検証する。 | role guard/API route testに使う。 |
| production dev_header rejection | `APP_ENV=production` / `NODE_ENV=production` で `x-tenant-id` runtimeを拒否する。 | authenticated runtime稼働後に実装する。 |

## JWT / Session Extraction Plan

Initial target flow:

```text
Admin login UI
-> Supabase Auth session/access token
-> Admin API request with Authorization: Bearer token
-> API token extraction boundary
-> Supabase Auth getUser(token) / verification boundary
-> AuthUserIdentity(auth_user_id)
-> StaffAuthLookup
-> resolveAuthenticatedStaffAdminTenantContext
-> AdminTenantContext(source: authenticated_staff)
-> AdminAction role guard
-> tenant-scoped repository/service
```

Initial policy:

- `Authorization: Bearer <access_token>` を第一候補にする。
- Cookie sessionは後続で比較するが、最初はtoken forwarding boundaryを小さく作る。
- Server ActionからAdmin APIへtokenをforwardする場合、tokenはserver側境界で扱い、ログに出さない。
- Supabase Auth user idを `auth_user_id` として扱う。
- `email` は補助情報であり、tenant権限の正本にはしない。
- `staff_tenant_memberships` のactive membershipでtenantとroleを決める。

今回やらないこと:

- Authorization header parsing実装
- JWT署名検証実装
- Supabase Auth `getUser` 呼び出し
- cookie/session persistence
- Admin API route接続

## `selectedTenantId` Plan

`selectedTenantId` is a selector, not permission.

### Single active tenant membership

- `selectedTenantId` がなくても自動選択できる。
- Resolver currently supports this.

### Multiple active tenant memberships

- `selectedTenantId` がない場合は `tenant_selection_required`。
- Admin UI should route to `/select-tenant`.
- `/select-tenant` is currently placeholder only.

### With selected tenant

- selected tenant must be one of the active memberships.
- Membership outside the authenticated staff memberships returns `tenant_membership_denied`.
- Role comes from the selected membership, not from `staff_users.role`.

### Transport / persistence candidates

| Candidate | Initial view |
| --- | --- |
| Cookie | Good candidate for server-side Admin UI / Server Action forwarding; needs httpOnly / sameSite policy. |
| Server session | Good if a session store is introduced; heavier than current runtime. |
| Request header | Useful between Admin UI server and API, but must be derived from verified session/membership. |
| URL/query | Acceptable only for one-time tenant selection flow, not long-term authority. |
| Memory state | Fine for UI-only local selection, not durable across refresh/server requests. |
| localStorage | Use cautiously; never store service role key or secrets. Requires XSS risk review. |

No selected tenant storage is implemented in this Loop.

## `StaffAuthLookup` Runtime Injection Plan

Future server-side API factory:

```text
request
-> auth token verification
-> create server-side Supabase service role client or dedicated repository client
-> new SupabaseStaffAuthLookupRepository(client)
-> resolveAuthenticatedStaffAdminTenantContext(authUser, selectedTenantId, lookup)
```

Policy:

- `SupabaseStaffAuthLookupRepository` is server-side only.
- It should use the existing Supabase repository client boundary and service role/server client when connected.
- service role key must never be exposed to browser, LIFF, Next client component, logs, or response bodies.
- Env validation should happen only when authenticated runtime is explicitly enabled, not on module import.
- Tests should inject fake `StaffAuthLookup` or fake Supabase client.
- local/test must not accidentally connect to production Supabase.

Open choice for later implementation:

- request-scoped repository instance: simplest and easiest to test.
- app-level factory: possible once env/runtime mode is stable.
- global singleton: avoid initially unless connection reuse becomes necessary and test isolation remains clear.

## Supabase Key / Client Responsibility

| Boundary | Key | Runtime | Responsibility |
| --- | --- | --- | --- |
| Auth browser client | `SUPABASE_ANON_KEY` | Browser only | Login/logout/session acquisition in future Admin UI integration. |
| Auth server client | `SUPABASE_ANON_KEY` | Server only | Verify/access Auth user from token/session boundary. |
| Repository service role client | `SUPABASE_SERVICE_ROLE_KEY` | Server only | Staff lookup and tenant-owned repository access. |
| DB URL | `SUPABASE_DB_URL` | CLI/local migration/test only | Migration/local DB verification, not browser runtime. |

Rules:

- Do not include concrete env values in docs or code.
- Do not create or edit `.env` in this Loop.
- `SUPABASE_SERVICE_ROLE_KEY` never goes to browser/LIFF/client component.
- Anon key usage still assumes RLS once direct DB access is introduced.
- Direct browser DB access remains out of scope for the initial Admin runtime.

## Runtime Mode Plan

| Mode | Policy |
| --- | --- |
| local | Keep `dev_header` MVP path for now. Add fake authenticated path in later Loop before real Supabase Auth. Do not connect to production Supabase. |
| test | Use fake `AuthUserIdentity` and fake `StaffAuthLookup` / fake Supabase clients. Do not hit production DB or Auth. |
| staging | Use Supabase Auth, dummy staff, dummy tenants, and active memberships. Do not store real customer LINE user IDs or production logs. |
| production | Reject `dev_header`; require `authenticated_staff`; enforce AdminAction role guard; keep tenant filters and plan RLS. |

## `dev_header` Production Rejection Plan

Production must reject `dev_header`, but only after authenticated runtime works.

Why order matters:

- Rejecting `dev_header` too early breaks local/staging MVP checks.
- Current Admin UI still sends `x-tenant-id` only.
- Auth token extraction and StaffAuthLookup runtime are not connected yet.

Safe order:

1. Plan the authenticated runtime connection. This Loop.
2. Add token/header extraction boundary with fake tests.
3. Add fake authenticated runtime integration without real Supabase.
4. Connect Admin API runtime to authenticated_staff path behind explicit mode/config.
5. Connect Admin UI token forwarding/session flow.
6. Verify staging with dummy staff/memberships.
7. Reject `dev_header` in production.

## Admin API Role Guard Relationship

Current:

- Route/action mapping exists in `adminRouteActions`.
- Admin routes call `evaluateAdminRouteRoleGuardCompatibility`.
- `source: dev_header` returns `mode: "skipped_dev_header"`.
- `source: authenticated_staff` enforces `AdminAction` permission.

After authenticated runtime connection:

- Admin API should produce `AdminTenantContext(source: authenticated_staff, role)`.
- Every mapped Admin route should enforce role guard.
- Denied action maps to:

```json
{
  "ok": false,
  "error": "permission_denied"
}
```

with HTTP `403`.

UI should route or show inline safe state using `/permission-denied`, but API remains the source of truth.

## Admin UI Relationship

| UI | Current status | Future authenticated runtime use |
| --- | --- | --- |
| `/login` | Disabled placeholder form | Supabase Auth sign-in, then session/access token acquisition. |
| `/select-tenant` | Static placeholder | Used when API returns `tenant_selection_required`; selected tenant must be membership-validated. |
| `/permission-denied` | Static safe state | Used for `permission_denied` / `tenant_membership_denied` / production dev-header rejection. |
| `/session-expired` | Static safe state | Used for `session_expired` or invalid/expired token states. |
| `RoleVisibilityNote` | Explanatory placeholder | Remove or replace after real role visibility is connected. |
| Role visibility fixtures | Test-only expected matrix | Use when implementing button disabled/hidden states after authenticated role is available. |
| Admin API helper | Sends `x-tenant-id` | Later forwards Authorization token and selected tenant selector from server-side/session boundary. |

## RLS Relationship

Loop 025 RLS plan remains valid:

- `authenticated_staff` runtime provides the app-level tenant/role context that RLS policies should mirror.
- RLS may use `auth.uid()` and `staff_tenant_memberships` for tenant membership checks.
- Service role repositories bypass RLS, so API/repository tenant filters remain mandatory.
- Direct browser/LIFF DB access remains out of initial design.
- RLS SQL is still unimplemented.
- Local Auth/RLS test harness remains a later Loop.

## Why No Implementation In This Loop

Connecting authenticated runtime touches multiple high-risk boundaries at once:

- token/session handling;
- Supabase Auth verification;
- service role client instantiation;
- staff membership lookup;
- Admin API context selection;
- role guard enforcement;
- Admin UI token forwarding;
- production dev-header rejection.

Doing these in one pass would risk breaking the local MVP and blurring security assumptions. Loop 049 only fixes the sequencing and contracts.

## Recommended Next Loops

```text
Loop 050: dev header production rejection plan
Loop 051: Supabase Auth session extraction boundary
Loop 052: authenticated staff runtime fake integration
Loop 053: authenticated staff runtime Admin API integration
Loop 054: admin UI session token forwarding plan
Loop 055: admin login submit integration
Loop 056: tenant selection selectedTenantId persistence plan
Loop 057: production dev_header rejection implementation
Loop 058: RLS SQL draft
Loop 059: local auth/RLS test harness
```

Suggested order:

1. docs-only hardening plan for production dev-header rejection.
2. token/session extraction boundary with no route switch.
3. fake authenticated runtime integration test.
4. Admin API runtime integration behind explicit mode/config.
5. Admin UI token forwarding/session plan and then implementation.
6. selected tenant persistence.
7. production dev-header rejection.
8. RLS SQL and local test harness.

## Risks

- Current runtime still trusts dev-only `x-tenant-id` for local MVP.
- Role guard is skipped for current `dev_header` requests.
- No JWT/session extraction exists.
- No runtime `StaffAuthLookup` injection exists.
- No Admin UI token forwarding/session persistence exists.
- RLS SQL is still not implemented.
- The exact selected tenant persistence method is undecided.
