# Loop 032: Admin Auth Placeholder UI Plan

## Goal

将来のAdmin login / authenticated staff context導入に向けて、管理画面側の認証UI、画面遷移、状態表示、API境界をdocs-onlyで設計する。

今回はAdmin login UI、Next.js page/component、Server Action、Admin API helper、Supabase Auth、JWT/session検証、API route差し替えは実装しない。

## Scope

- 現在のAdmin UI構成を整理する。
- 現在のdev-only `x-tenant-id` 付与箇所を整理する。
- 将来のAdmin login導線を設計する。
- 未認証、認証済み、tenant未選択、権限不足、session切れのUI状態を整理する。
- 複数tenant所属時のtenant選択UI方針を整理する。
- `owner` / `manager` / `staff` role別の画面・操作制御方針を整理する。
- Supabase Authを使う場合の画面遷移とsession扱いを整理する。
- Loop 031のAdmin API tenant context guardとの接続点を整理する。
- local / staging / productionの段階方針を整理する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Admin login UI implementation
- Next.js page/component changes
- Server Action changes
- Admin API helper changes
- Supabase Auth implementation
- JWT/session verification
- middleware implementation
- API route changes
- repository changes
- migration SQL changes
- RLS SQL implementation
- `.env` creation or update
- Supabase production connection
- OpenAI API calls
- LINE API calls
- Web crawling
- runtime switch from in-memory to Supabase

## Current Admin UI Structure

Current source of truth:

- `apps/admin/app/layout.tsx`
- `apps/admin/app/page.tsx`
- `apps/admin/app/customers/page.tsx`
- `apps/admin/app/customers/[customerId]/page.tsx`
- `apps/admin/app/customers/[customerId]/actions.ts`
- `apps/admin/app/customers/[customerId]/customer-actions.tsx`
- `apps/admin/app/alerts/page.tsx`
- `apps/admin/app/alerts/actions.ts`
- `apps/admin/app/alerts/alert-actions.tsx`
- `apps/admin/src/admin-api.ts`

Current routes inside `apps/admin`:

| Route | File | Current purpose | Auth state |
| --- | --- | --- | --- |
| `/` | `apps/admin/app/page.tsx` | Development home with links to customers and alerts | no login/session |
| `/customers` | `apps/admin/app/customers/page.tsx` | Customer list from Admin API | no login/session |
| `/customers/[customerId]` | `apps/admin/app/customers/[customerId]/page.tsx` | Customer detail, timeline, AI/RAG actions, staff reply action | no login/session |
| `/alerts` | `apps/admin/app/alerts/page.tsx` | Alert list, check-unreplied action, notify-open action | no login/session |

Current layout:

- `apps/admin/app/layout.tsx` provides only the root HTML/body and global CSS.
- There is no auth provider, middleware, session reader, or tenant switcher.
- The visible tenant is displayed from `getAdminApiConfig()`.

Current Server Action structure:

- Customer detail actions are in `apps/admin/app/customers/[customerId]/actions.ts`.
- Customer action UI is in `apps/admin/app/customers/[customerId]/customer-actions.tsx`.
- Alert actions are in `apps/admin/app/alerts/actions.ts`.
- Alert action UI is in `apps/admin/app/alerts/alert-actions.tsx`.
- Server Actions call `apps/admin/src/admin-api.ts`, so the browser does not directly call `http://localhost:4000`.

Current error display:

- Page data loading errors are shown as an `APIエラー` block.
- Server Action errors are shown as an `アクションエラー` block.
- HTTP 401/403/409 are not yet mapped to auth-specific screens.

## Current Dev-only Auth State

Current flow:

```text
Admin UI helper
-> x-tenant-id
-> Admin API tenant context guard
-> source: dev_header
-> in-memory repositories
```

`apps/admin/src/admin-api.ts` currently centralizes dev request config:

- `DEFAULT_API_BASE_URL = "http://localhost:4000"`
- `DEFAULT_TENANT_ID = "tenant_amamihome"`
- `DEFAULT_STAFF_ID = "dev_staff"`
- `adminApiFetch` attaches `x-tenant-id` to every request.
- `sendStaffReply` additionally attaches `x-staff-id`.

Important rules:

- This is not production authentication.
- `x-tenant-id` is local/dev/test context only.
- `x-staff-id` is dev-only metadata and is not authenticated.
- Loop 031 moved Admin API tenant context creation into `apps/api/src/admin/tenant-context.ts`.
- Production must not trust `x-tenant-id` as identity or tenant authority.
- Admin login/session is still unimplemented.

## Target Admin Auth UX

Future target flow:

```text
Admin UI login/session
-> Admin API request with verified session/JWT
-> Admin API tenant context guard
-> authenticated_staff context
-> tenant_id from active membership
-> tenant-scoped repository access
```

Because `apps/admin` is its own Next.js app, current internal routes are `/`, `/customers`, `/customers/[customerId]`, and `/alerts`. If the deployed product is externally mounted under `/admin`, these screens can map to `/admin/...` at the hosting layer. Inside this app, prefer routes that fit the current file structure:

| Future screen | Preferred internal route | External mounted route candidate | Purpose |
| --- | --- | --- | --- |
| Login | `/login` | `/admin/login` | Staff/admin sign-in |
| Logout | `/logout` or action-only | `/admin/logout` | End session and return to login |
| Tenant selection | `/select-tenant` | `/admin/select-tenant` | Choose active tenant when staff has multiple memberships |
| Home | `/` | `/admin` | Authenticated entry point |
| Customer list | `/customers` | `/admin/customers` | Protected customer list |
| Customer detail | `/customers/[customerId]` | `/admin/customers/[customerId]` | Protected detail and actions |
| Alerts | `/alerts` | `/admin/alerts` | Protected alert operations |
| Permission denied | `/permission-denied` | `/admin/permission-denied` | Authenticated but insufficient role |
| Session expired | `/login?reason=session_expired` | `/admin/login?reason=session_expired` | Expired or invalid session |

## Auth States

| State | Meaning | UI behavior | API behavior |
| --- | --- | --- | --- |
| `unauthenticated` | No valid admin session | Show login, no customer data | API returns 401 |
| `authenticated_no_membership` | Staff identity exists but has no active tenant membership | Show access unavailable message | API returns 403 |
| `authenticated_single_tenant` | Staff has one active membership | Auto-select tenant and continue | Guard resolves tenant context |
| `authenticated_multi_tenant` | Staff has multiple active memberships and no selected tenant | Show tenant selection | API returns 409 or UI redirects before request |
| `tenant_selected` | Selected tenant was validated against active membership | Show protected Admin UI | Guard returns authenticated staff context |
| `permission_denied` | Staff is authenticated but role cannot perform action | Show permission denied or hide action | API returns 403 |
| `session_expired` | Prior session is invalid/expired | Return to login with message | API returns 401 |

Rules:

- 未認証状態で実顧客情報、LINE由来情報、timeline、alertsを表示しない。
- selected tenantはmembershipで再検証する。
- 単一tenant所属は自動選択してよい。
- 複数tenant所属はtenant selection screenを挟む。
- UI非表示は補助であり、API guardが権限の本丸。

## HTTP Error Mapping

Future UI should map Admin API errors consistently:

| HTTP / code | UI handling |
| --- | --- |
| `401 unauthenticated` | Redirect or link to `/login` |
| `401 session_expired` | Redirect to `/login?reason=session_expired` |
| `403 permission_denied` | Show permission denied screen |
| `403 tenant_membership_denied` | Show permission denied / tenant access unavailable |
| `409 tenant_selection_required` | Redirect or link to `/select-tenant` |
| `404 resource_not_found` | Show normal not found or return to list |

Loop 031 currently keeps legacy dev responses:

- missing tenant: `401 / missing_tenant_id`
- unknown tenant: `403 / unknown_tenant_id`

A later API error mapping loop should add auth-specific response codes without breaking local tests.

## Role-based UI Policy

Initial roles come from Loop 029/030:

- `owner`
- `manager`
- `staff`

Future candidates:

- `viewer`
- `platform_admin`

| role | 顧客閲覧 | timeline閲覧 | staff返信 | AI要約 | AI返信下書き | RAG回答案 | alerts操作 | knowledge管理 | staff管理 | tenant設定 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `owner` | yes | yes | yes | yes | yes | yes | yes | yes | yes | yes |
| `manager` | yes | yes | yes | yes | yes | yes | yes | yes | limited/no | no |
| `staff` | yes | yes | yes | yes | yes | yes | limited | no | no | no |
| `viewer` future | yes | yes | no | no/limited | no/limited | no/limited | no | no | no | no |
| `platform_admin` future | separate design | separate design | separate design | separate design | separate design | separate design | separate design | separate design | separate design | separate design |

Policy:

- 初期実装は `owner` / `manager` / `staff` で十分。
- unknown roleはdefault denyにする。
- roleごとのUI非表示はUX補助であり、API側guardも必須。
- staff管理とtenant設定は後続Loopで扱う。
- `platform_admin` はordinary tenant membershipとは別概念にし、cross-tenant audit designなしで混ぜない。

## Admin API Guard Connection

Existing pieces:

- Loop 030: `resolveAuthenticatedTenantContext` in `packages/domain/src/auth-context.ts`
- Loop 031: Admin API tenant context guard in `apps/api/src/admin/tenant-context.ts`

Future connection:

1. Admin UI obtains a verified session through Supabase Auth or an auth boundary.
2. Admin UI / Server Action sends Admin API request with session cookie or Authorization header.
3. Admin API verifies session/JWT and extracts `auth_user_id`.
4. Admin API uses `resolveAuthenticatedTenantContext` with staff lookup.
5. If needed, selected tenant id is passed only as a selector and revalidated against active memberships.
6. Guard returns `AdminTenantContext` with `source: "authenticated_staff"`.
7. Routes pass resolved `tenantId` to tenant-scoped repositories.

Dev path:

- Keep `x-tenant-id` for local/test until authenticated guard is wired.
- Do not use dev header in production.
- Keep the dev path visually marked in Admin UI so manual testing remains clear.

## Supabase Auth Policy

Initial auth options:

| Option | Initial policy |
| --- | --- |
| email/password | Preferred first candidate because it is explicit and easy to test in staging |
| magic link | Candidate after email flow/session UX is stable |
| Google OAuth | Defer until business need and allowed domains are clear |

Data binding:

- Supabase `auth.users.id` maps to `staff_users.auth_user_id`.
- Active access requires active `staff_users.status` and active `staff_tenant_memberships.status`.
- Role comes from `staff_tenant_memberships.role`, not a caller-provided header.
- Email remains useful for display/invite flow but must not be the only production binding.

Session transport:

- Prefer server-side session handling for Server Components / Server Actions.
- Admin API requests should carry a verified cookie or Authorization header.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-side only.
- Browser / LIFF / Next client component must never receive service role key.
- If `SUPABASE_ANON_KEY` is used for auth session handling, direct DB access remains deferred and RLS must be verified first.
- Initial production design keeps Admin UI accessing data through Admin API, not direct Supabase DB queries.

## Placeholder UI Policy

A later placeholder loop can add safe screens before real Supabase Auth is connected.

Candidate placeholder screens:

- `/login`
- `/select-tenant`
- `/permission-denied`
- session expired state on `/login`

Placeholder behavior:

- Explain that production auth is not connected yet.
- In local/dev, allow the current demo tenant flow to continue so `/customers` and `/alerts` manual checks do not break.
- In production/staging-safe placeholder mode, do not show customer data unless an authenticated path exists.
- Show dev-only warnings when using the `x-tenant-id` path.
- Keep tenant selection placeholder separate from real membership validation until the guard is connected.

Why placeholder first:

- It lets the team verify navigation and empty/safe states before real Auth/JWT wiring.
- It avoids mixing UI changes, Supabase Auth, API guard changes, and RLS in one large loop.
- It protects the existing in-memory demo workflow while auth is still staged.

## Local / Staging / Production Policy

| Environment | Policy |
| --- | --- |
| local | Keep dev-only `x-tenant-id` path for manual MVP checks; placeholder auth can coexist without blocking demo seed and UI checks |
| staging | Use fake or staging staff accounts only; no real customer data; test login/session and membership before production |
| production | Do not trust `x-tenant-id`; require authenticated staff context; service role stays server-side; no customer data without session |

## Why No UI Implementation In This Loop

Admin auth touches navigation, protected route behavior, API error mapping, session transport, role checks, Supabase Auth, and tenant selection. Implementing UI before these boundaries are agreed would risk breaking the existing local admin workflow or exposing unsafe placeholder behavior. Loop 032 therefore records the plan only.

## Tests / Verification

No code tests are added because this is docs-only.

Verification still runs the standard project commands to confirm the repository remains healthy:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Risks

- Current Admin UI still has no real login/session.
- Admin API runtime still accepts dev-only `x-tenant-id` for local/test.
- Auth-specific HTTP error mapping is not implemented yet.
- No Supabase Auth client/session boundary is connected to Admin UI.
- No role-based UI hiding or API action permission guard is implemented yet.
- RLS SQL is still not implemented.

## Next Loop Candidates

Recommended safe order:

```text
Loop 033: admin auth UI placeholder
Loop 034: admin API auth error response mapping
Loop 035: Supabase Auth client boundary
Loop 036: staff auth lookup repository
Loop 037: authenticated staff tenant guard
Loop 038: admin login UI integration
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
