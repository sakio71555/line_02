# Loop 055: Authenticated Runtime Selected Tenant Transport Plan

## Goal

authenticated_staff runtimeで複数tenant所属staffを扱うために、`selectedTenantId` をAdmin UIからAdmin APIへどう渡すかをdocs-onlyで設計する。

Loop 052で `selectedTenantId` はruntime inputとして扱えるようになり、Loop 053では代表route testのために `authenticatedSelectedTenantId` をtest-only dependency injectionした。Loop 054では全Admin API route rollout前にtransport設計が必要と整理した。

今回はtransport実装、Admin API route変更、Admin UI変更、cookie/session/localStorage保存、Supabase Auth本接続は行わない。

## Scope

- `selectedTenantId` の意味を整理する。
- transport候補を比較する。
- short-term / mid-term / production方針を整理する。
- Admin UI `/select-tenant` との接続方針を整理する。
- Admin API runtimeでの受け取り方針を整理する。
- `tenant_selection_required` / `tenant_membership_denied` との関係を整理する。
- fake authenticated runtimeとreal Supabase Auth runtimeとの関係を整理する。
- local / test / staging / production方針を整理する。
- セキュリティ・漏えい・なりすまし対策方針を整理する。
- 後続Loop候補を整理する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- `selectedTenantId` transport実装
- `x-selected-tenant-id` header実装
- query parameter実装
- cookie保存
- server session実装
- localStorage / sessionStorage保存
- request body contract変更
- URL path / subdomain routing変更
- Admin UI `/select-tenant` 保存処理実装
- Admin UI token forwarding実装
- Admin API route変更
- authenticated runtime full route rollout
- Supabase Auth `getUser` 本接続
- JWT署名検証実装
- Admin login submit実装
- production `dev_header` rejection実装
- middleware実装
- RLS SQL / migration変更
- repository変更
- `.env` 作成・変更
- 環境変数追加
- Supabase本番接続
- LINE API / OpenAI API / Webクロール

## Current State

Current authenticated runtime boundary:

```text
Authorization header
-> extractAdminAuthSession
-> AuthSessionVerifier
-> AuthUserIdentity
-> resolveAuthenticatedStaffAdminTenantContext(authUser, selectedTenantId, StaffAuthLookup)
-> AdminTenantContext(source=authenticated_staff)
-> role guard
```

Current route wiring:

- `GET /api/admin/customers` only supports fake authenticated route wiring.
- Other Admin API routes still use `x-tenant-id` / `dev_header`.
- `selectedTenantId` is not a public HTTP contract.
- Loop 053 test passes `authenticatedSelectedTenantId` through `createApiApp` dependency injection.

Current `/select-tenant` UI:

- placeholder only.
- no tenant list API request.
- no selected tenant save.
- no cookie, session, localStorage, or sessionStorage use.
- disabled selection button.

## Meaning of `selectedTenantId`

`selectedTenantId` is not permission.

`selectedTenantId` is only a requested selector for the tenant the authenticated staff wants to operate on.

Rules:

- Do not trust `selectedTenantId` as authority.
- Do not use `selectedTenantId` directly as a repository tenant filter.
- Always revalidate `selectedTenantId` against `StaffAuthLookup` and active `staff_tenant_memberships`.
- Membership outside active memberships returns `tenant_membership_denied`.
- Multiple active tenant memberships without selected tenant returns `tenant_selection_required`.
- Single active tenant membership can be selected automatically without `selectedTenantId`.
- The confirmed `AdminTenantContext.tenantId`, not raw `selectedTenantId`, is passed to repository/service handlers.

Safe mental model:

```text
selectedTenantId = requested tenant selector
active membership = permission source
AdminTenantContext.tenantId = trusted tenant scope after validation
```

## Transport Candidate Comparison

| Transport | Pros | Cons | Security risk | CSRF / XSS / token leakage concern | Works for GET? | Works for POST? | Local/test suitability | Staging suitability | Production suitability | Recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `x-selected-tenant-id` header | Easy to pair with `Authorization: Bearer`; works for all Admin API methods; can be centralized in Admin API helper / Server Action; not visible in URL. | Client-controlled if sent from browser; needs a clear contract; can be logged by proxies if headers are captured. | Spoofable unless revalidated with active membership. | Lower URL leakage than query, but header logging is still possible. Does not solve token storage. | Yes | Yes | Good for fake authenticated runtime and server-to-API tests. | Good as an initial controlled rollout if logs are scrubbed. | Acceptable initial production candidate only with membership revalidation and server-side forwarding. | Preferred mid-term transport boundary candidate. |
| Query parameter | Very simple; easy to inspect in manual tests; works naturally for GET. | Leaks into URLs, browser history, referer, access logs; awkward for POST; easy to bookmark stale tenant. | Spoofable and highly visible. | High URL/log/history leakage. | Yes | Awkward | Acceptable only for temporary debugging docs, not as contract. | Not recommended. | Not recommended. | Do not use as primary transport. |
| Cookie | Server-side code can read it without every request manually adding a header; can fit Server Actions and route handlers. | Needs signing/encryption, expiry, rotation, sameSite/secure/httpOnly policy, CSRF review. | If unsigned or client-readable, spoofable. | CSRF concerns; httpOnly helps XSS reading but not all CSRF cases. | Yes | Yes | Heavy for current stage. | Good later once auth/session design exists. | Strong candidate after session policy is designed. | Candidate for later hardening, not Loop 056. |
| Server session | Strongest conceptual fit; keeps selector server-side; easy to clear on logout/session expiry. | Requires session store or framework session boundary; not present today; adds operational complexity. | Lower client tampering risk if implemented correctly. | Session fixation/expiry/CSRF policy required. | Yes | Yes | Too heavy now. | Good after Auth/UI session work. | Strong long-term candidate. | Production hardening candidate after header boundary. |
| localStorage / sessionStorage | Easy UI implementation; persistent or tab-scoped UX. | XSS risk; not available server-side without forwarding; selected value must still become header/body/cookie. | Client-controlled and script-readable. | XSS concern; stale data across sessions possible. | Only after conversion to request transport | Only after conversion to request transport | Useful only as UI placeholder experiment. | Not recommended as authority. | Not recommended as authority. | Avoid as authoritative storage; maybe UI cache only after review. |
| Request body | Good for POST; simple validation per mutation route. | Does not work for GET; inconsistent across Admin API; would require changing many request schemas. | Spoofable and easy to mix with business payload. | Body logs can leak too; no benefit for reads. | No | Yes | Poor fit for all-route rollout. | Poor fit. | Poor fit. | Do not use for global tenant selector. |
| URL path / subdomain | Clear tenant-aware URL; can support future SaaS branding and routing. | Large routing and deployment change; impacts Admin UI routes, links, CORS, cookies, DNS, local dev. | Still needs membership validation; subdomain alone is not permission. | URL-visible; DNS/cookie scoping complexity. | Yes | Yes | Too broad now. | Future architecture exploration only. | Possible future SaaS design, not MVP. | Defer to a dedicated SaaS routing plan. |
| Test-only injection | Already used in Loop 053; no public HTTP contract; safe for unit/integration tests. | Not production transport; cannot validate Admin UI forwarding. | Low if kept test-only. | No browser/log surface. | Yes in tests | Yes in tests | Best current option. | Not staging runtime contract. | Not production. | Continue for tests until transport boundary Loop. |

## Recommended Policy

### Short Term

For local/test:

- Continue test-only injection via `authenticatedSelectedTenantId`.
- Keep fake authenticated runtime tests passing selected tenant directly into `resolveAuthenticatedAdminRuntimeContext`.
- Keep current `dev_header` path for local MVP compatibility.
- Do not introduce public `x-selected-tenant-id` contract in this docs-only Loop.

### Mid Term

For authenticated Admin API rollout:

- Add a small `selectedTenantId` extraction boundary in a later Loop.
- Prefer `x-selected-tenant-id` as the initial HTTP transport candidate for authenticated runtime.
- Pair it with `Authorization: Bearer <token>`.
- Treat it as server-to-API forwarding from Admin Server Actions / API helper, not as permission.
- Validate it through `StaffAuthLookup` active memberships before creating `AdminTenantContext`.
- Keep query/body/localStorage out of the API authority path.

### Production Candidate

Initial production candidate:

- `Authorization: Bearer <access_token>` + `x-selected-tenant-id` server-to-API forwarding.
- Always verify token with real Supabase Auth.
- Always verify selected tenant against active `staff_tenant_memberships`.
- Reject or ignore `dev_header` in production after authenticated runtime is stable.

Hardening candidate:

- Move selected tenant persistence to signed/httpOnly cookie or server session after Admin UI session design is finalized.
- Clear selected tenant on logout and session expiration.
- Re-check membership on each request; do not rely on stored selected tenant alone.

Future SaaS candidate:

- tenant-aware URL path or subdomain can be considered in a separate routing plan.
- Even with tenant-aware URL, membership validation remains required.

## Admin UI `/select-tenant` Relationship

Current `/select-tenant` is a placeholder:

- static `tenant_amamihome` card.
- no tenant API call.
- no tenant save.
- disabled selection button.
- no cookie, session, localStorage, or sessionStorage.

Future flow:

```text
Authenticated staff has multiple active tenant memberships
-> Admin API returns tenant_selection_required
-> Admin UI routes to /select-tenant
-> UI lists active memberships from an authenticated endpoint
-> staff selects tenant
-> selectedTenantId is stored/forwarded by chosen transport
-> next Admin API request sends Authorization + selectedTenantId transport
-> API revalidates selectedTenantId against active membership
-> AdminTenantContext.tenantId is confirmed
```

Rules:

- Single active tenant membership can skip `/select-tenant`.
- Multiple active memberships require `/select-tenant` or equivalent selection UI.
- Admin UI should show the current selected tenant once transport exists.
- Admin UI should provide a tenant switching path for multi-tenant staff.
- Logout should clear selected tenant transport/storage.
- Session expiration should clear or invalidate selected tenant transport/storage.
- If membership changes while selected tenant is stored, the next request must fail with `tenant_membership_denied` or require reselection.

Not implemented in this Loop:

- tenant list API
- selected tenant save
- redirect wiring
- current tenant display
- tenant switching UI

## Admin API Runtime Relationship

Future authenticated route flow:

```text
Authorization: Bearer token
+ selectedTenantId transport
-> auth session extraction
-> AuthUserIdentity
-> StaffAuthLookup
-> resolveAuthenticatedTenantContext({ authUserId, email?, selectedTenantId })
-> AdminTenantContext(source=authenticated_staff)
-> AdminAction role guard
-> handler
-> repository/service using AdminTenantContext.tenantId
```

API rules:

- `selectedTenantId` is not the tenant filter.
- Raw selected tenant must not be passed into repositories.
- Repositories receive only confirmed `AdminTenantContext.tenantId`.
- `AdminTenantContext.tenantId` is the trusted tenant scope after token verification, staff lookup, active membership validation, and role guard.
- If `Authorization` is absent, current local/test fallback can keep using `dev_header` until production rejection Loop.
- If `Authorization` is present, authenticated path should use selected tenant transport only through the authenticated runtime boundary.

## Error Response Relationship

Existing mapper remains the source of truth:

- `apps/api/src/admin/auth-error-response.ts`

Expected behavior:

| Error | Trigger | HTTP / body | UI destination |
| --- | --- | --- | --- |
| `authenticated_staff_required` | missing/invalid authenticated session or runtime deps | `401 { ok:false, error:"authenticated_staff_required" }` | `/login` |
| `session_expired` | expired token/session | `401 { ok:false, error:"session_expired" }` | `/session-expired` |
| `tenant_selection_required` | multiple active memberships and no selected tenant | `409 { ok:false, error:"tenant_selection_required" }` | `/select-tenant` |
| `tenant_membership_denied` | selected tenant is outside active memberships, staff inactive, no membership | `403 { ok:false, error:"tenant_membership_denied" }` | `/permission-denied` or reselection |
| `permission_denied` | staff role cannot perform `AdminAction` | `403 { ok:false, error:"permission_denied" }` | `/permission-denied` |

Redirect behavior is not implemented in this Loop.

## Security Policy

- `selectedTenantId` is client-controlled input when transported over HTTP.
- Always revalidate with active membership.
- Do not use selected tenant directly as a data access filter.
- Do not include selected tenant, token, `auth_user_id`, secrets, env values, LINE user IDs, or production logs in error bodies.
- If headers are used, review reverse proxy/server logs so `Authorization` and `x-selected-tenant-id` are not dumped into operational logs.
- If query parameters are used, tenant IDs can leak through URLs, history, referer, screenshots, and access logs. Avoid as primary transport.
- If cookies are used, design secure, sameSite, httpOnly, signing/encryption, expiry, and CSRF policy before implementation.
- If localStorage/sessionStorage is used, treat it as client UI cache only and account for XSS/stale selection risk.
- If server session is used, define session lifecycle, logout clearing, expiry behavior, and membership refresh behavior.
- If URL path/subdomain is used in future, still validate active membership for every request.

## Fake Authenticated Runtime Relationship

Fake runtime should continue to:

- run only in local/test.
- accept fake verifier tokens only in tests.
- use fake `StaffAuthLookup`.
- pass selected tenant through test-only input until a transport boundary exists.
- cover `tenant_selection_required` and `tenant_membership_denied`.
- never become production behavior.

When a transport boundary is added later, fake route tests can cover both:

- direct test-only injection for pure runtime tests.
- `x-selected-tenant-id` parsing for route-level tests.

## Real Supabase Auth Runtime Relationship

Real runtime should:

- verify `Authorization: Bearer` token with Supabase Auth server-side.
- map Supabase Auth user to `AuthUserIdentity`.
- use real `StaffAuthLookup` repository with server-side Supabase boundary.
- read active memberships from `staff_tenant_memberships`.
- revalidate selected tenant on every request.
- keep service role key server-side only.
- keep browser / LIFF / Next client components away from service role key.

This Loop does not connect real Supabase Auth.

## Environment Policy

| Environment | Policy |
| --- | --- |
| local | Continue `dev_header` path and test-only injection. If `x-selected-tenant-id` is later tried, keep it fake authenticated runtime only. No production Supabase. |
| test | Use fake `AuthSessionVerifier` and fake `StaffAuthLookup`. Test direct injection and later header parsing. No real external APIs. |
| staging | Use dummy tenant/staff/membership. Verify `Authorization` + selected tenant transport with staging-only data. No real customer LINE user IDs or production logs. |
| production | Require `Authorization`. Revalidate selected tenant through active membership. Reject `dev_header`. Enforce role guard. RLS remains a separate implementation/verification track. |

## Test Strategy For Later Loops

No tests are added in Loop 055 because it is docs-only.

Future transport boundary tests should cover:

- missing selected tenant for single membership succeeds through default membership.
- missing selected tenant for multiple memberships returns `tenant_selection_required`.
- selected tenant inside active membership succeeds.
- selected tenant outside active memberships returns `tenant_membership_denied`.
- blank `x-selected-tenant-id` behaves like missing selected tenant.
- selected tenant from header is trimmed and never logged in response bodies.
- dev_header path remains unchanged while local/test compatibility is intentionally kept.
- no network access or env validation occurs on import.

Future route tests should cover:

- representative read-only route with `Authorization` + `x-selected-tenant-id`.
- multi-tenant fake staff scoping results to selected tenant.
- membership-denied selection does not leak tenant data.
- role-denied action still returns `permission_denied`.

## Why Not Implement In This Loop

`selectedTenantId` transport affects Admin UI state, API helper behavior, route auth branching, test fixtures, and production security posture. Implementing it together with full route rollout or cookie/session persistence would be too broad.

This Loop fixes the contract first. The next implementation Loop can add a small extraction boundary without changing all Admin routes at once.

## Risks

- `selectedTenantId` production transport is still not implemented.
- Current authenticated representative route still relies on test-only `authenticatedSelectedTenantId`.
- `/select-tenant` is still placeholder and cannot persist a choice.
- Header transport may need logging review before production.
- Cookie/server session may become preferable after Admin UI token/session design is finalized.
- Production `dev_header` rejection remains separate and unimplemented.

## Next Loop Candidates

- Loop 056: selectedTenantId transport boundary
- Loop 057: authenticated runtime read-only route rollout
- Loop 058: authenticated runtime AI/RAG route rollout
- Loop 059: authenticated runtime side-effect route rollout
- Loop 060: Supabase Auth getUser verifier boundary
- Loop 061: Admin UI token forwarding plan
- Loop 062: Admin UI tenant selection persistence placeholder
- Loop 063: production dev_header rejection implementation

Recommended immediate next:

```text
Loop 056: selectedTenantId transport boundary
```

Keep Loop 056 limited to extracting/validating selected tenant transport input. Do not combine it with full route rollout.

## Status

Planned in Loop 055. No runtime code was changed.
