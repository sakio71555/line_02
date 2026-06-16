# Loop 080: RLS/Auth Production Readiness Plan

## Goal

stagingでcustomers/messagesのSupabase永続化smokeが通った現在地を前提に、productionへ進めない理由と、RLS / Supabase Auth / JWT / tenant selection / role guardをどう揃えるかをdocs-onlyで整理する。

今回はRLS SQL、Auth/JWT実装、selectedTenantId transport実装、production dev_header rejection実装、migration SQL変更、API/runtime/UI変更、Supabase接続、LINE/OpenAI接続は行わない。

## Scope

- 現在のstaging状態を整理する。
- production readinessのNo-Go理由を明確化する。
- table別RLS方針を整理する。
- role別DB access方針を整理する。
- Auth/JWTとstaff schemaの接続方針を整理する。
- selectedTenantId transportとの関係を整理する。
- Admin API / role guardとの関係を整理する。
- production dev_header rejection方針を整理する。
- RLS導入順を分割する。
- 本物LINE送信前条件とOpenAI API接続前条件を整理する。
- runbook、README、database docs、dev loop docs、staging runbooks、dev logを更新する。
- docs testを追加する。

## Out of Scope

- RLS policy SQL実装
- migration SQL変更
- Supabase Auth実装
- JWT検証実装
- selectedTenantId transport実装
- production dev_header rejection実装
- API route差し替え
- repository実装変更
- runtime switch拡張
- UI変更
- `.env` 作成・変更
- Supabase本番接続
- Supabase staging接続
- LINE API呼び出し
- OpenAI API呼び出し
- Webクロール

## Current Staging State

| item | state |
| --- | --- |
| staging migration | `0001_initial_schema.sql` applied in Loop 078 |
| PostgREST grants | `0002_service_role_postgrest_grants.sql` applied in Loop 079.1 for `service_role` only |
| customers/messages smoke | passed through an injected Supabase customer/message runtime bundle |
| default runtime | still `in_memory` |
| Supabase runtime scope | customers/messages only |
| alerts runtime | not switched to Supabase |
| knowledge runtime | not switched to Supabase |
| staff/auth runtime | not switched to real Supabase Auth |
| RLS enabled tables | `0/12` in staging record |
| LINE provider | mock/disabled; no real push |
| OpenAI provider | mock; no real OpenAI API call |
| production readiness | No-Go |

Loop 079.1のservice_role grantsは、staging PostgREST/Data API smokeを通すための回復処置であり、production readinessではない。service_roleはRLS bypass前提のため、RLS/Auth/JWTとtenant境界testが揃うまでproductionへ進めない。

## Production No-Go Reasons

production readiness: No-Go

- RLS 未実装。
- Supabase Auth/JWT 未接続。
- selectedTenantId transport 未実装。
- selectedTenantId 再検証は設計済みだが、production HTTP contractとして未接続。
- production dev_header rejection 未実装。
- `x-tenant-id` / `dev_header` はlocal MVP互換であり、本番認証ではない。
- service_role grantsはstaging PostgREST回復用であり、production authorizationではない。
- LINE real pushはdisabled/mockのまま。
- OpenAI APIはmockのまま。
- Supabase runtime switch対象はcustomers/messagesのstaging smokeに限定され、alerts/knowledge/staff/authは未完了。

## Table RLS Policy Matrix

| table | data sensitivity | tenant scoped | read policy | write policy | service role usage | production readiness |
| --- | --- | ---: | --- | --- | --- | --- |
| `tenants` | tenant master | No | authenticated staff can read only tenants from active memberships; platform admin is separate | server/platform setup only | server-side admin/setup only | RLS policy needed before production |
| `tenant_line_settings` | LINE secret/token settings | Yes | Admin API server only; same tenant owner/manager after auth | server-side settings flow only | server-side only; secret values never exposed | RLS policy and secret handling review needed |
| `tenant_ai_settings` | AI behavior settings | Yes | Admin API server only; same tenant owner/manager after auth | server-side settings flow only | server-side only | RLS policy and AI safety review needed |
| `customers` | customer PII/CRM data | Yes | active staff membership for tenant via Admin API; no direct browser DB access | same tenant API/repository only | staging smoke uses service_role; repository tenant filters required | customers/messages smoke passed, but RLS/Auth missing |
| `messages` | conversation content / LINE logs | Yes | tenant + customer scoped via Admin API | same tenant API/repository only | staging smoke uses service_role; repository tenant filters required | customers/messages smoke passed, but RLS/Auth missing |
| `alerts` | operational support alerts | Yes | same tenant active staff via Admin API | alert checker/notifier server boundary | server-side alert checker/notifier only | Supabase runtime not switched yet |
| `knowledge_pages` | tenant knowledge / RAG source | Yes | same tenant and `allowed_for_ai` through API/RAG service | import/admin server boundary | server-side import/RAG only | Supabase runtime not switched yet |
| `staff_users` | staff identity/auth binding | Yes | authenticated staff self/tenant admin policy; membership driven | owner/manager/server provisioning only | server-side auth sync only | Auth/JWT/RLS not connected |
| `staff_tenant_memberships` | staff tenant access and role | Yes | active staff can see own memberships; owner/manager can manage tenant staff | owner/manager/server provisioning only | server-side auth lookup only | critical before production Auth/RLS |

Rules:

- All tenant-owned data must remain filtered by `tenant_id`.
- `staff_tenant_memberships` is the production permission source for tenant access.
- authenticated users should not directly read CRM tables from browser/LIFF in the initial production design.
- Admin UI, LIFF, AI, and LINE flows should use API boundaries, not direct client-side Supabase DB access.
- Future RLS policy is required for all tenant-owned tables before production.

## Role-based DB Access Policy

| role | usage | policy |
| --- | --- | --- |
| `service_role` | server-side repository and staging smoke | server-side only. Never expose to browser, LIFF, Next client components, screenshots, docs, or logs. It bypasses RLS, so repository tenant filters and audit discipline remain mandatory. Production use must be minimized and reviewed. |
| `anon` | public client-facing Supabase key | Do not grant direct CRM admin data access. If LIFF uses anon later, it must be limited and RLS-protected. No broad table DML grants. |
| `authenticated` | Supabase Auth logged-in user | Future production path. JWT/session yields `auth.uid()`, then `staff_users.auth_user_id` and active `staff_tenant_memberships` determine tenant and role. |
| `postgres/admin` | migration/apply/maintenance | Maintenance only. Not runtime. Use only in approved apply/recovery loops and never record connection values. |

## Auth/JWT And Staff Schema Connection

Existing schema pieces:

- `staff_users.auth_user_id`
- `staff_users.status`
- `staff_tenant_memberships.staff_user_id`
- `staff_tenant_memberships.tenant_id`
- `staff_tenant_memberships.role`
- `staff_tenant_memberships.status`

Production direction:

1. Admin API extracts `Authorization: Bearer <token>`.
2. Supabase Auth/JWT verification returns an auth user id.
3. `auth.uid()` / auth user id maps to `staff_users.auth_user_id`.
4. Only `staff_users.status = active` and `is_active = true` are allowed.
5. Only `staff_tenant_memberships.status = active` grants tenant access.
6. Role is determined from membership, not raw request headers.
7. `selectedTenantId` is a selector only and must be rechecked against active memberships.
8. Repositories receive only confirmed `AdminTenantContext.tenantId`.

## selectedTenantId Transport Relationship

Loop 055 remains the source of the transport plan.

- `selectedTenantId` is not permission.
- `selectedTenantId` is a requested tenant selector.
- Multiple active memberships without a selector should return `tenant_selection_required`.
- A selector outside active memberships should return `tenant_membership_denied`.
- Raw selectedTenantId must never be passed to repositories.
- `AdminTenantContext.tenantId` is the only tenant filter passed into repository/service code.
- Header transport such as `x-selected-tenant-id` may be the initial candidate, but only after Supabase Auth/JWT and active membership lookup are connected.

## Admin API / Role Guard Relationship

Production Admin API path:

```text
Authorization Bearer token
-> AuthSessionVerifier / Supabase Auth
-> AuthUserIdentity
-> StaffAuthLookup
-> active staff + active membership
-> AdminTenantContext(source=authenticated_staff)
-> AdminAction role guard
-> handler
-> repository using confirmed tenant_id
```

Current `dev_header` path is local/test compatibility only. The full route role guard rollout skips dev_header for compatibility and enforces permissions only when `source = authenticated_staff`. Production must reject `dev_header`.

| route | production auth requirement | role action | notes |
| --- | --- | --- | --- |
| `GET /api/admin/customers` | authenticated staff + tenant context | `view_customers` | representative authenticated route exists, full production rollout incomplete |
| `GET /api/admin/customers/:customerId` | authenticated staff + tenant context | `view_customer_detail` | tenant/customer 404 behavior must remain |
| `GET /api/admin/customers/:customerId/timeline` | authenticated staff + tenant context | `view_timeline` | tenant/customer scoped messages only |
| `POST /api/admin/customers/:customerId/reply` | authenticated staff + tenant context + permission | `send_staff_reply` | real LINE send needs extra confirmation gate |
| `POST /api/admin/customers/:customerId/ai-summary` | authenticated staff + tenant context + permission | `create_ai_summary` | AI result is staff support, not auto-send |
| `POST /api/admin/customers/:customerId/ai-reply-draft` | authenticated staff + tenant context + permission | `create_ai_reply_draft` | draft is response-only; not saved/sent |
| `POST /api/admin/rag/search` | authenticated staff + tenant context + permission | `search_rag` | tenant knowledge only |
| `POST /api/admin/rag/answer-draft` | authenticated staff + tenant context + permission | `create_rag_answer_draft` | source-grounded draft only |
| `GET /api/admin/alerts` | authenticated staff + tenant context + permission | `view_alerts` | alert runtime not switched to Supabase yet |
| `POST /api/admin/alerts/check-unreplied` | authenticated staff + tenant context + permission | `check_unreplied_alerts` | server checker only |
| `POST /api/admin/alerts/notify-open` | authenticated staff + tenant context + permission | `notify_open_alerts` | MockStaffNotifier until real notification plan |
| `POST /api/dev/seed-demo-data` | not production | none | production disabled; never role-granted production action |
| LINE webhook routes | webhook tenant resolution + LINE signature | none | staff auth is not required; tenant is resolved from webhook path/settings |

## Production Dev Header Rejection Policy

- local/dev/test can keep `x-tenant-id` / `dev_header` for MVP checks.
- staging should restrict dev_header to explicit dummy verification paths while authenticated runtime is tested.
- production must reject `x-tenant-id` / dev_header tenant selection.
- production must require `Authorization: Bearer` plus authenticated staff tenant context.
- production must not allow fake role headers or raw selected tenant headers to grant access.

Expected errors:

- `dev_tenant_header_not_allowed`
- `authenticated_staff_required`
- `tenant_selection_required`
- `tenant_membership_denied`
- `permission_denied`
- `session_expired`

## RLS Implementation Sequence

Phase 1: RLS policy design finalization

- Finalize Auth/JWT claims and membership lookup assumptions.
- Draft customers/messages read/write policy design only.

Phase 2: staff membership RLS relationship tests

- Verify `auth.uid()` to `staff_users.auth_user_id`.
- Verify active memberships in `staff_tenant_memberships`.

Phase 3: customers/messages RLS SQL in staging

- Implement policy SQL in a dedicated migration.
- Test tenant A cannot read/write tenant B rows.

Phase 4: alerts/knowledge_pages RLS planning and implementation

- Handle alert checker/notifier and RAG import/search paths separately.

Phase 5: authenticated runtime + RLS integration smoke

- Use dummy staff and dummy tenant data only.
- Keep production No-Go until tenant isolation tests pass.

Phase 6: production dev_header rejection

- Reject dev_header when authenticated runtime is stable.

Phase 7: LINE real send permission gate

- Add real-send confirmation, permission, tenant checks, idempotency/audit plan.

## Real LINE Send Preconditions

本物LINE送信前条件:

- Supabase Auth/JWT connected.
- `AdminTenantContext(source=authenticated_staff)` is used.
- active `staff_tenant_memberships` is required.
- `send_staff_reply` permission is enforced.
- customer tenant matches context tenant.
- LINE user belongs to the same tenant/customer.
- selectedTenantId is verified by membership.
- send confirmation UI is implemented.
- `LINE_REAL_PUSH_ENABLED=true` is explicitly set for the target environment.
- audit/timeline records are written.
- idempotency / double-send prevention is designed.

Loop 080 does not implement real LINE send.

## OpenAI API Preconditions

OpenAI接続前条件:

- `AI_PROVIDER=openai` is explicit for the environment.
- `OPENAI_API_KEY` is configured outside git/docs.
- tenant AI settings are checked.
- rate limit / cost awareness is documented.
- prompt safety rules are enforced.
- RAG sources are verified and tenant-scoped.
- AI output remains draft/support content.
- AI does not auto-send to LINE.

Loop 080 does not connect OpenAI API.

## Go / No-Go

Current judgment:

```text
production readiness: No-Go
```

Go requires all of the following:

- RLS SQL implemented and verified in local/staging test DB.
- Supabase Auth/JWT connected to Admin API.
- `staff_users.auth_user_id` and active `staff_tenant_memberships` are used for tenant/role.
- selectedTenantId transport is implemented and revalidated.
- production dev_header rejection is implemented.
- role guard is enforced for production Admin API routes.
- customers/messages/alerts/knowledge runtime choices are explicit and tested.
- LINE/OpenAI real providers stay gated by explicit flags and permissions.
- rollback/backup and audit/runbook checks are complete.

## Why No Implementation In This Loop

RLS/Auth/JWT production readiness spans DB policies, Auth session verification, tenant selection transport, role guard, runtime switch, and external send safety. Implementing any of those while only planning the production gate would mix security-sensitive behavior into a docs-only readiness Loop. This Loop records the No-Go state and next sequence so each implementation can be verified separately.

## Test Result

- `git diff --check`: success
- `npx pnpm@10.12.1 lint`: success
- `npx pnpm@10.12.1 typecheck`: success
- `npx pnpm@10.12.1 test`: success, 55 files / 373 tests passed, 1 staging smoke file skipped by default
- `npx pnpm@10.12.1 test:integration`: success, 55 files / 373 tests passed, 1 staging smoke file skipped by default
- `npx pnpm@10.12.1 build`: not run, docs/test-only change

## Risks

- service_role bypasses RLS, so repository filters and future RLS tests are both required.
- `dev_header` compatibility is still present and must be rejected in production later.
- selectedTenantId transport is not implemented.
- Supabase Auth/JWT is not wired to runtime.
- RLS enabled tables remain `0/12` in the latest staging record.
- LINE/OpenAI remain mock/disabled; real provider enablement needs separate gates.

## Next Loop Candidates

```text
Loop 081: Supabase alerts/knowledge staging runtime plan
Loop 082: staging manual verification checklist update
Loop 083: RLS policy SQL draft for customers/messages
Loop 084: Supabase Auth runtime connection plan
Loop 085: selectedTenantId transport boundary
Loop 086: production dev_header rejection implementation plan
```
