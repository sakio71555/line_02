# Loop 054: Admin API Authenticated Runtime Full Route Rollout Plan

## Goal

Loop 053で代表route `GET /api/admin/customers` に接続した fake `authenticated_staff` runtime を、後続Loopで全Admin API routeへ安全に広げるためのdocs-only計画を整理する。

今回は実装しない。Admin API route変更、Supabase Auth本接続、Admin UI token forwarding、production `dev_header` rejection、RLS SQLは行わない。

## Scope

- 現在の代表route wiringを整理する。
- Admin API routeごとの rollout matrixを整理する。
- rollout priorityをPhase分けする。
- `dev_header` 互換方針を整理する。
- `Authorization: Bearer` pathを整理する。
- `selectedTenantId` transport候補と初期推奨を整理する。
- fake Auth runtimeとreal Supabase Auth runtimeの切り替え方針を整理する。
- error response方針を整理する。
- test strategyを整理する。
- staging / production rollout方針を整理する。
- README、dev loop docs、dev logを更新する。

## Out of Scope

- 全Admin API routeへのauthenticated runtime実装
- Supabase Auth `getUser` 実接続
- JWT署名検証の本実装
- Admin UI token forwarding / login submit
- selected tenant cookie / session / header実装
- production `dev_header` rejection実装
- RLS SQL / migration変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- LINE API / OpenAI API / Webクロール

## Current Representative Route Wiring

Loop 053で接続済みの代表route:

```text
GET /api/admin/customers
AdminAction: view_customers
```

Current behavior:

```text
No Authorization header
-> x-tenant-id
-> resolveAdminTenantContext
-> AdminTenantContext(source=dev_header)
-> role guard compatibility skip
-> tenant-scoped customer list
```

```text
Authorization: Bearer fake-valid-*
-> resolveAuthenticatedAdminRuntimeContext
-> fake AuthSessionVerifier
-> fake StaffAuthLookup
-> AdminTenantContext(source=authenticated_staff)
-> role guard enforce view_customers
-> membership-scoped customer list
```

Only `GET /api/admin/customers` currently takes the Authorization path. Other Admin API routes still use the existing `x-tenant-id` / `dev_header` runtime, although role guard compatibility hooks are already placed on them.

## Admin API Route Rollout Matrix

Allowed roles are derived from `packages/domain/src/admin-permissions.ts`.

| Method | Route | Current runtime | AdminAction | Allowed roles | Authenticated rollout priority | `dev_header` compatibility | `selectedTenantId` needed? | Representative tests needed? | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/admin/customers` | `dev_header` fallback + representative `authenticated_staff` path | `view_customers` | owner, manager, staff | Phase 1 done | Keep until production rejection Loop | Yes for multi-tenant staff | Existing representative tests | Read-only and already wired. |
| GET | `/api/admin/customers/:customerId` | `dev_header` only | `view_customer_detail` | owner, manager, staff | Phase 1 | Keep | Yes for multi-tenant staff | Yes | Must keep cross-tenant customer as 404. |
| GET | `/api/admin/customers/:customerId/timeline` | `dev_header` only | `view_timeline` | owner, manager, staff | Phase 1 | Keep | Yes for multi-tenant staff | Yes | Timeline must remain tenant + customer scoped. |
| POST | `/api/admin/customers/:customerId/reply` | `dev_header` only | `send_staff_reply` | owner, manager, staff | Phase 3 | Keep | Yes for multi-tenant staff | Yes | Side effect route; still uses `MockLineClient` in current runtime. |
| POST | `/api/admin/customers/:customerId/ai-summary` | `dev_header` only | `create_ai_summary` | owner, manager | Phase 2 | Keep | Yes for multi-tenant staff | Yes | Saves AI summary message; staff should receive `permission_denied`. |
| POST | `/api/admin/customers/:customerId/ai-reply-draft` | `dev_header` only | `create_ai_reply_draft` | owner, manager, staff | Phase 2 | Keep | Yes for multi-tenant staff | Yes | Draft response only; no message save. |
| GET | `/api/admin/alerts` | `dev_header` only | `view_alerts` | owner, manager, staff | Phase 1 | Keep | Yes for multi-tenant staff | Yes | Read-only alert list; status filter remains tenant scoped. |
| POST | `/api/admin/alerts/check-unreplied` | `dev_header` only | `check_unreplied_alerts` | owner, manager | Phase 3 | Keep | Yes for multi-tenant staff | Yes | Creates alerts; staff should receive `permission_denied`. |
| POST | `/api/admin/alerts/notify-open` | `dev_header` only | `notify_open_alerts` | owner, manager | Phase 3 | Keep | Yes for multi-tenant staff | Yes | Side effect route; still `MockStaffNotifier` until real notifier Loop. |
| POST | `/api/admin/rag/search` | `dev_header` only | `search_rag` | owner, manager, staff | Phase 1 | Keep | Yes for multi-tenant staff | Yes | Read-only knowledge search. |
| POST | `/api/admin/rag/answer-draft` | `dev_header` only | `create_rag_answer_draft` | owner, manager, staff | Phase 2 | Keep | Yes for multi-tenant staff | Yes | Draft response only; no LINE send. |

Excluded from this rollout:

| Method | Route | Reason |
| --- | --- | --- |
| GET | `/health` | System health route, not an Admin staff action. |
| POST | `/api/dev/seed-demo-data` | Local/dev utility. Production is already disabled and it is not a production role-granted operation. |
| POST | `/api/line/webhook/:webhookSecret` | LINE webhook secret + signature boundary, not Admin staff auth. |

## Rollout Priority

Phase 1: read-only and low side-effect routes.

- `GET /api/admin/customers` - done in Loop 053.
- `GET /api/admin/customers/:customerId`
- `GET /api/admin/customers/:customerId/timeline`
- `GET /api/admin/alerts`
- `POST /api/admin/rag/search`

Phase 2: draft/generation routes that do not call real external APIs.

- `POST /api/admin/customers/:customerId/ai-reply-draft`
- `POST /api/admin/rag/answer-draft`
- `POST /api/admin/customers/:customerId/ai-summary`

Phase 3: side-effect routes.

- `POST /api/admin/customers/:customerId/reply`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`

Reason:

- Start with tenant-scoped reads.
- Then verify AI/RAG draft flows while still using mock providers.
- Finally wire mutation/notification routes after auth and permission behavior is stable.

## `dev_header` Compatibility

`dev_header` remains local/dev/test compatibility for the MVP.

Current rule:

- If no `Authorization` header is present, Admin routes may continue using `x-tenant-id` and `AdminTenantContext(source=dev_header)`.
- `dev_header` is not production authorization.
- `dev_header` role guard skip is temporary.
- Production `dev_header` rejection is a separate hardening Loop and must not be bundled into route rollout.

Future production rule:

- Admin routes require authenticated staff context.
- `x-tenant-id` cannot decide tenant permission.
- Tenant context comes from verified staff identity and active membership.

## Authorization Bearer Path

Recommended route behavior for rollout:

```text
Admin API request
-> if Authorization header exists
   -> resolveAuthenticatedAdminRuntimeContext
   -> AuthSessionVerifier(fake first, real later)
   -> StaffAuthLookup(fake first, real later)
   -> selectedTenantId validation when needed
   -> AdminTenantContext(source=authenticated_staff)
   -> AdminAction role guard enforce
   -> route handler
-> if Authorization header is absent
   -> existing dev_header path for now
```

Rules:

- `Authorization` path must use `mapAdminAuthErrorToHttp`.
- Auth failures must not include token values, `auth_user_id`, staff ids, secrets, env values, or production logs.
- Real Supabase Auth verification is still deferred.
- Fake verifier tokens are test/local fixtures only.

## `selectedTenantId` Transport

`selectedTenantId` is a selector, not permission.

It must always be revalidated against active staff membership. If an authenticated staff belongs to multiple tenants and no selected tenant is provided, return `tenant_selection_required`. If selected tenant is outside memberships, return `tenant_membership_denied`.

Candidate transport comparison:

| Candidate | Fit | Risks / Notes |
| --- | --- | --- |
| `x-selected-tenant-id` header | Useful for server-to-API forwarding from Admin server actions. | Must be derived from verified session/membership. Do not treat as permission. |
| Query parameter | Simple for experiments. | Easy to leak in URLs/logs and not good as durable tenant selector. |
| Cookie | Good medium-term fit with server rendering. | Needs httpOnly/sameSite/expiry policy and CSRF review. |
| Server session | Stronger production direction. | Requires session store or framework-level session boundary. |
| Admin UI state + header forwarding | Good UX state source. | UI state alone is not trusted; server/API must revalidate. |

Initial recommendation:

- Short term: keep Loop 053 `authenticatedSelectedTenantId` as test-only dependency input.
- Short term implementation candidate: use `x-selected-tenant-id` only for authenticated runtime internal/server-to-API forwarding, never as permission.
- Medium term: move selected tenant to server session or httpOnly cookie once Admin UI token/session design is finalized.

## Fake vs Real Auth Rollout

Fake runtime:

- Use only in local/test.
- Supported fake tokens can include `fake-valid-owner`, `fake-valid-manager`, `fake-valid-staff`, and multi-tenant variants.
- Use fake `StaffAuthLookup`.
- Never enable fake tokens in production.
- Tests should prove import does not trigger env validation or network access.

Real runtime:

- Use Supabase Auth `getUser` or equivalent server-side verifier.
- Map Supabase Auth user to `AuthUserIdentity`.
- Use real `StaffAuthLookup` repository backed by server-side Supabase client.
- Use service role key only on the server side.
- Validate in staging with dummy tenant/staff before production.
- Connect Admin UI token forwarding before production `dev_header` rejection.

## Error Response Policy

Existing mapper remains the source of truth:

- `apps/api/src/admin/auth-error-response.ts`

Expected authenticated path responses:

| Case | HTTP | Response body |
| --- | --- | --- |
| Missing/invalid authenticated staff | 401 | `{ ok:false, error:"authenticated_staff_required" }` |
| Expired session | 401 | `{ ok:false, error:"session_expired" }` |
| Multi-tenant staff without selection | 409 | `{ ok:false, error:"tenant_selection_required" }` |
| Selected tenant outside membership | 403 | `{ ok:false, error:"tenant_membership_denied" }` |
| Role lacks action permission | 403 | `{ ok:false, error:"permission_denied" }` |

Existing `dev_header` compatibility responses remain for the fallback path:

- `missing_tenant_id`
- `unknown_tenant_id`

Never return token strings, auth user ids, secrets, env values, LINE user ids, or production logs in auth error responses.

## Test Strategy

This Loop does not implement tests because it is docs-only. Later rollout Loops should add route-level tests per phase.

Common test cases for each wired route:

- `dev_header` path remains unchanged while compatibility is intentionally kept.
- fake owner is allowed where the role matrix allows.
- fake manager is allowed where the role matrix allows.
- fake staff is allowed where the role matrix allows.
- fake invalid token returns `authenticated_staff_required`.
- fake expired token returns `session_expired`.
- multi-tenant fake staff without selected tenant returns `tenant_selection_required`.
- selected tenant outside membership returns `tenant_membership_denied`.
- disallowed role returns `permission_denied`.
- response bodies do not leak token, `auth_user_id`, secret, env, LINE user id, or production log values.

Route-specific examples:

- customer detail and timeline: staff is allowed and cross-tenant customer remains 404.
- AI summary: owner/manager allowed, staff returns `permission_denied`.
- notify-open: owner/manager allowed, staff returns `permission_denied`.
- RAG search: staff allowed and results remain tenant-scoped.
- side-effect routes: provider/notifier/send mocks remain mocked; no real LINE/OpenAI/Supabase production calls.

## Staging Rollout

Staging rollout order:

1. Prepare dummy tenant, dummy staff users, and dummy memberships only.
2. Keep real customer LINE user ids and production logs out of staging.
3. Finish fake route rollout locally first.
4. Add real Supabase Auth verifier boundary in a separate Loop.
5. Add real `StaffAuthLookup` runtime injection against staging DB only.
6. Verify read-only Phase 1 routes.
7. Verify Phase 2 AI/RAG draft routes with mock or safe non-production providers.
8. Verify Phase 3 side-effect routes with mock notifier / mock LINE boundary.
9. Update manual checklist.
10. Only after authenticated runtime is stable, enable staging `dev_header` rejection.

## Production Rollout

Production prerequisites:

- Supabase Auth `getUser` or equivalent real verifier.
- Real `StaffAuthLookup` repository.
- Admin UI Authorization token forwarding.
- selected tenant transport and revalidation.
- All Admin routes wired to `authenticated_staff` runtime.
- Role guard enforced for all Admin routes.
- Production `dev_header` rejection.
- RLS policy implementation and verification.

Production rules:

- service role key stays server-side only.
- browser, LIFF, and Next client components never receive service role key.
- Admin UI accesses data through Admin API.
- `x-tenant-id` is not production authorization.

## Why Not Implement In This Loop

Full route rollout affects every Admin route and changes request authentication behavior. Doing it together with selected tenant transport, real Supabase Auth verification, Admin UI token forwarding, and production `dev_header` rejection would be too broad.

Keeping Loop 054 docs-only lets the next implementation Loop choose a small Phase 1 surface and test it without breaking the local MVP.

## Risks

- Current authenticated runtime is still wired only to `GET /api/admin/customers`.
- `selectedTenantId` has no production transport contract yet.
- Fake auth fixtures must never be enabled in production.
- `dev_header` remains available until a later production rejection Loop.
- Real Supabase Auth verifier and Admin UI token forwarding are still missing.

## Next Loop Candidates

- Loop 055: authenticated runtime selectedTenantId transport plan
- Loop 056: authenticated runtime read-only route rollout
- Loop 057: authenticated runtime AI/RAG route rollout
- Loop 058: authenticated runtime side-effect route rollout
- Loop 059: Supabase Auth getUser verifier boundary
- Loop 060: Admin UI token forwarding plan
- Loop 061: staging authenticated runtime checklist
- Loop 062: production dev_header rejection implementation

## Status

Planned in Loop 054. No runtime code was changed.
