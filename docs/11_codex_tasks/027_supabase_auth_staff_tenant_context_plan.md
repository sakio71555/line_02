# Loop 027: Supabase Auth / Staff Tenant Context Plan

## Goal

現在の開発用 `x-tenant-id` 運用を、本番向けの認証済みstaff/admin tenant contextへ移行するための設計をdocs-onlyで整理する。

今回はSupabase Auth実装、JWT検証、middleware、API差し替え、migration変更は行わない。

## Scope

- 現在のtenant context取得方法の整理
- 開発用 `x-tenant-id` の位置づけ整理
- 本番向けstaff/admin認証モデルの設計
- Supabase Authを使う場合の方針整理
- staff/admin userとtenantの紐付け方針
- role / permission方針
- API requestからtenant_idを決定する流れ
- RLS policy planとの接続点
- local / staging / production認証運用
- 後続Loop分割
- README、database docs、dev loop docs、dev log更新

## Out of Scope

- Supabase Auth実装
- JWT検証実装
- middleware実装
- API route差し替え
- admin UI login実装
- LIFF auth実装
- migration SQL変更
- RLS SQL実装
- Supabase本番接続
- `.env` 作成・変更
- repository実装変更
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール
- build前提のUI変更

## Current Tenant Context

### Admin API

Current admin routes read `x-tenant-id` directly from the request and call `resolveAdminTenant`.

- Missing `x-tenant-id` returns `401` / `missing_tenant_id`.
- Unknown tenant returns `403` / `unknown_tenant_id`.
- The only known tenant comes from `loadAppConfig(env).tenant.id`, defaulting to `tenant_amamihome`.
- This pattern is used by admin customer, timeline, AI, RAG, staff reply, alert, and dev seed routes.

Current limitation:

- `x-tenant-id` is caller-controlled and is not production authentication.
- There is no verified staff identity, session, JWT, or role check yet.
- `x-staff-id` on staff reply is dev-only metadata and is not authenticated.

### Admin UI

`apps/admin/src/admin-api.ts` centralizes API calls.

- `API_BASE_URL` defaults to `http://localhost:4000`.
- `TENANT_ID` defaults to `tenant_amamihome`.
- `STAFF_ID` defaults to `dev_staff`.
- `adminApiFetch` adds `x-tenant-id` to all requests.
- `sendStaffReply` additionally sends `x-staff-id`.

Current limitation:

- Admin UI has no login/session.
- Tenant context comes from env/default config, not authenticated user context.

### LINE Webhook

`POST /api/line/webhook/:webhookSecret` resolves tenant separately from admin routes.

- `resolveWebhookTenant` compares URL path secret to `loadAppConfig(env).line.webhookSecretPath`.
- Default path is `wh_dev_amamihome`.
- The resolved tenant id and slug come from config defaults or env.
- LINE signature verification uses raw body and `LINE_CHANNEL_SECRET`.

This path should remain independent from staff/admin authentication. It needs tenant resolution from webhook path/settings plus LINE signature verification.

### Demo Seed / Dev Routes

`POST /api/dev/seed-demo-data`:

- disabled when `APP_ENV=production` or `NODE_ENV=production`.
- requires `x-tenant-id`.
- uses the same `resolveAdminTenant` helper.

This is acceptable for local development only. It must not become production seed or production auth.

### In-memory Runtime And Supabase Repositories

Runtime still uses in-memory repositories by default. Supabase repositories have been added for customer/message, alert, and knowledge pages, but API routes are not wired to them yet.

The auth tenant context plan must be finalized before runtime Supabase wiring.

## Target Staff / Admin Auth Model

### Existing Schema Starting Point

Current `staff_users` table:

- `id`
- `tenant_id`
- `email`
- `display_name`
- `role`: `owner` / `manager` / `staff`
- `line_user_id`
- `is_active`
- `last_login_at`
- timestamps
- unique: `tenant_id + email`

This table is already tenant-scoped and should remain the initial anchor for staff/admin access.

### Recommended Model

Short term:

- Add an `auth_user_id` relation to `staff_users` in a later schema loop.
- Keep one `staff_users` row per tenant membership.
- A staff member belonging to multiple tenants can have multiple `staff_users` rows with the same auth user id and different `tenant_id`.
- Keep `is_active=false` for retired or suspended staff instead of hard delete.

Long term:

- If multi-tenant staff switching becomes common, introduce separate concepts:
  - `staff_profile` or `auth_user_profile`
  - `staff_tenant_membership`
  - `tenant_id`
  - `role`
  - `is_active`
- This separates a human identity from tenant-specific permissions.

Loop 027 does not add these tables or columns. A later schema plan should choose the exact shape.

## Role / Permission Policy

Existing roles should be respected first:

| Existing role | Intended meaning | Suggested permissions |
| --- | --- | --- |
| `owner` | tenant owner / account administrator | manage staff, settings, all CRM data |
| `manager` | operational admin | view/update customers, messages, alerts, AI/RAG actions |
| `staff` | regular operator | view assigned/customer data, reply, run AI/RAG helper actions |

Future roles:

| Future role | Reason |
| --- | --- |
| `viewer` | read-only support/admin audit access |
| `platform_admin` | cross-tenant support by system operator, kept separate from tenant staff |

Do not overload tenant `owner` as platform admin. Platform-level access needs a separate design and audit trail.

Permission rules:

- Default deny unknown roles.
- Disabled staff cannot access APIs.
- Hard delete is avoided; use `is_active=false` or archive/disabled state.
- Every permission check must happen after tenant context is resolved.

## Request Tenant Context Flow

No repository should be called without a resolved tenant context.

### Admin UI -> Admin API

Target production flow:

1. Admin UI sends authenticated session/JWT to Admin API.
2. Admin API verifies session/JWT and obtains `auth_user_id`.
3. Admin API loads active staff membership for that auth user.
4. If exactly one active tenant membership exists, use that tenant.
5. If multiple active tenant memberships exist, require a selected tenant id/slug from a server-validated tenant switcher.
6. Validate selected tenant against the staff memberships.
7. Create `TenantContext`:
   - `tenant_id`
   - `staff_user_id`
   - `auth_user_id`
   - `role`
   - `permissions`
8. Pass only this resolved `tenant_id` to repositories.

Production rule:

- Do not trust `x-tenant-id`.
- If a selected tenant header/cookie is used for multi-tenant staff, it is only a selector and must be validated against authenticated memberships.

### LIFF予定 -> API

Target flow:

1. LIFF sends verified identity token/session to API.
2. API verifies LIFF/LINE identity.
3. API maps the user to a tenant/customer context through tenant settings and customer records.
4. API calls repositories with resolved `tenant_id`.

LIFF should not access Supabase DB directly in the initial production design.

### LINE Webhook -> API

LINE webhook remains separate:

1. Resolve tenant from webhook path/settings.
2. Verify LINE signature against tenant channel secret.
3. Parse raw body.
4. Log events with resolved `tenant_id`.

Staff/admin session is not required for webhook ingestion.

### Dev / Local Request

Dev-only flow:

- Keep `x-tenant-id` for local/test only.
- Guard dev-only tenant context by `APP_ENV !== production` and `NODE_ENV !== production`.
- Continue using explicit fake/mock context in tests.

### Test Request

Tests may keep explicit `x-tenant-id` or injected env/dependencies as long as they do not represent production auth.

Required tests in later implementation loops:

- missing auth is rejected.
- inactive staff is rejected.
- unknown selected tenant is rejected.
- staff cannot select a tenant outside active memberships.
- repository is not called if tenant context is unresolved.

## Supabase Auth / JWT Policy

### Auth User Mapping

If Supabase Auth is used:

- `auth.users.id` should map to staff identity through `auth_user_id`.
- The source of truth for tenant access should be DB membership, not user-supplied headers.
- `email` remains useful for display and invite workflows, but should not be the only auth binding.

### Claims vs Membership Lookup

Preferred initial approach:

- Verify JWT/session.
- Use `auth_user_id` to look up active staff memberships in DB.
- Resolve tenant context from DB membership.

Optional future optimization:

- Add tenant/role custom claims for caching or RLS policies.
- Claims must be refreshed when staff role or active status changes.

Reason:

- DB lookup avoids stale tenant claims during early auth rollout.
- It keeps role changes and staff deactivation authoritative in DB.

### Service Role Repository Relationship

- Server-side repository may use service role client.
- Service role bypasses RLS, so API and repository must continue explicit `tenant_id` filters.
- Browser, LIFF, and client components never receive `SUPABASE_SERVICE_ROLE_KEY`.

### Anon Key Policy

- `SUPABASE_ANON_KEY` may be used for Supabase Auth client flows.
- Direct browser/LIFF DB access is deferred.
- If direct DB access is introduced later, it must rely on tested RLS and minimal policies.

## RLS Plan Relationship

Loop 025 requires tenant context for RLS policy design. Loop 027 defines the future source of that context.

RLS needs one of:

- JWT claim approach: policies read tenant id / role from claims.
- Membership lookup approach: policies use `auth.uid()` to check staff membership tables.

Recommended first RLS design:

- membership lookup with `auth.uid()` because staff active status and roles live in DB.
- optional custom claims only after role refresh behavior is designed.

Before RLS SQL:

- decide schema shape for `auth_user_id` / membership.
- decide role set and permission matrix.
- define selected tenant behavior for multi-tenant staff.
- create local auth/RLS test harness.

## Local / Staging / Production

### Local

- in-memory runtime remains default.
- dev-only `x-tenant-id` can remain for local and tests.
- mock/stub auth context can be used until middleware boundary exists.

### Staging

- use a separate Supabase project and test staff accounts.
- do not use production customer data.
- test inactive staff, wrong tenant selection, and multi-tenant selection.

### Production

- no `x-tenant-id` trust.
- staff login/session required for Admin API.
- service role key server-only.
- audit sensitive operations after auth is introduced.

## Why No Implementation In This Loop

Auth context affects API middleware, schema, RLS policies, admin UI login, tests, and deployment secrets. Implementing any one piece before the full request context model is stable risks a partial security boundary. Loop 027 therefore records the target design only.

## Risks

- Current `x-tenant-id` is still dev-only and not production auth.
- No `auth_user_id` or membership schema exists yet.
- No JWT/session verification exists yet.
- No admin login UI exists yet.
- RLS SQL is still deferred.
- Supabase repositories are not wired into runtime.

## Follow-up Loop Order

Recommended safe order:

```text
Loop 028: staff tenant schema plan
Loop 029: auth context middleware boundary
Loop 030: admin API tenant context guard
Loop 031: Supabase RLS SQL draft
Loop 032: local auth/RLS test harness
Loop 033: admin login UI plan
Loop 034: runtime Supabase repository wiring plan
```

Do not wire production Supabase runtime before tenant context guard and local auth/RLS tests are in place.
