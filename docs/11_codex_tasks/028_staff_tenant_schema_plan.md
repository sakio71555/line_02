# Loop 028: Staff Tenant Schema Plan

## Goal

本番向けstaff/admin認証とtenant contextを実装する前に、それを支えるstaff identity、tenant membership、role、status schemaをdocs-onlyで設計する。

Loop 027ではrequestからtenant contextを決定する方針を整理した。Loop 028では、その方針をDB schemaへ落とし込むための計画を作る。今回はmigration SQL、Supabase Auth、JWT検証、API差し替え、RLS SQLは実装しない。

## Scope

- 既存staff/tenant関連schemaを確認する。
- 現在のschema不足点を整理する。
- 本番向けstaff tenant schema案を設計する。
- `auth_user_id` とstaff identityの紐付け方針を整理する。
- 1人のstaffが複数tenantへ所属できる設計を整理する。
- role / permission / statusを整理する。
- disabled / archived / invited / activeの扱いを整理する。
- 退職、権限停止、招待中、複数tenant所属時の扱いを整理する。
- Supabase Auth / JWT、request tenant context、RLS planとの接続を整理する。
- 後続migration Loopで実装すべき内容を分割する。
- README、database docs、dev loop docs、dev logを必要最小限更新する。

## Out of Scope

- migration SQL implementation
- migration file changes
- Supabase Auth implementation
- JWT verification
- middleware implementation
- API route changes
- repository changes
- UI changes
- login screen implementation
- RLS SQL implementation
- `.env` creation or update
- Supabase production connection
- `supabase link`
- OpenAI API calls
- LINE API calls
- Web crawling
- runtime switch from in-memory to Supabase

## Current Staff / Tenant Schema

Source of truth:

- `packages/db/migrations/0001_initial_schema.sql`
- `packages/domain/src/index.ts`
- `apps/api/src/index.ts`
- `apps/admin/src/admin-api.ts`

### Existing tenant tables

- `tenants`
  - `id` primary key
  - `slug` unique
  - `name`
  - `official_domain`
  - `status`
  - timestamps
- `tenant_line_settings`
  - `tenant_id` primary key references `tenants(id)`
  - LINE settings including encrypted secret/token placeholders
  - webhook secret path
- `tenant_ai_settings`
  - `tenant_id` primary key references `tenants(id)`
  - AI feature flags and provider settings

### Existing staff table

Current `staff_users` table is tenant-scoped:

| Column | Current meaning |
| --- | --- |
| `id` | staff row id |
| `tenant_id` | tenant ownership, references `tenants(id)` |
| `email` | staff email, unique only within tenant |
| `display_name` | staff display name |
| `role` | `owner` / `manager` / `staff` |
| `line_user_id` | optional staff LINE id for future notification/account binding |
| `is_active` | simple active flag |
| `last_login_at` | nullable login timestamp |
| `created_at` / `updated_at` | timestamps |

Current constraints:

- `unique (tenant_id, email)`
- `role check (role in ('owner', 'manager', 'staff'))`
- `tenant_id` references `tenants(id)`

Current domain model:

- `StaffUser` extends `TenantScoped`.
- `StaffRole` is `owner | manager | staff`.
- `StaffUser` has `is_active`, but no richer status enum.

## Current Gaps

- No `auth_user_id` column exists, so `staff_users` cannot yet bind to Supabase Auth `auth.users.id`.
- No separate staff identity table exists. The current `staff_users` row is both identity and tenant membership.
- Multi-tenant staff can only be represented awkwardly by multiple rows with the same email across tenants.
- Role is tenant-specific in practice, but it currently lives on the tenant-scoped `staff_users` row.
- Status is only `is_active`; there is no explicit `invited`, `disabled`, or `archived` state.
- There is no invite table or invite lifecycle.
- There is no production-grade tenant context guard. Admin API still uses dev-only `x-tenant-id`.
- RLS policy SQL cannot be finalized until the staff identity / membership schema is decided.
- There is no audit log for staff role changes, tenant switching, or account disable/archive actions.

## Target Schema Option

For production multi-tenant sales, the recommended target is to separate staff identity from tenant membership.

### `staff_users`

Represents the human staff/admin identity. In the target model, it is no longer tenant-owned.

Planned columns:

| Column | Purpose |
| --- | --- |
| `id` | internal staff identity id |
| `auth_user_id` | Supabase Auth `auth.users.id` binding |
| `email` | login/invite/display identity |
| `display_name` | display name |
| `status` | staff identity status, e.g. `active` / `disabled` / `archived` |
| `created_at` / `updated_at` | timestamps |
| `disabled_at` | when global staff identity was disabled |
| `archived_at` | when identity was archived for retention |

Design notes:

- `auth_user_id` should be unique when present.
- `email` should remain useful for invite and display, but should not be the only auth binding.
- Retired staff should not be hard-deleted. Use `disabled` or `archived`.
- This table must not store customer LINE user IDs or real customer data.
- Because the current `staff_users` table is tenant-scoped, a later migration must carefully decide whether to refactor it in place or introduce a transitional table and rename.

### `staff_tenant_memberships`

Represents the relationship between a staff identity and a tenant.

Planned columns:

| Column | Purpose |
| --- | --- |
| `id` | membership id |
| `tenant_id` | references `tenants(id)` |
| `staff_user_id` | references target `staff_users(id)` |
| `role` | tenant-specific role |
| `status` | membership status, e.g. `invited` / `active` / `disabled` / `archived` |
| `created_at` / `updated_at` | timestamps |
| `invited_at` | when membership was invited |
| `accepted_at` | when invite was accepted |
| `disabled_at` | when tenant access was stopped |
| `archived_at` | when membership was archived |

Design notes:

- Add `unique (tenant_id, staff_user_id)`.
- Role belongs on membership because the same person may be `owner` in one tenant and `staff` in another.
- Active production API access requires an active identity and an active membership.
- Disabling a membership stops access to that tenant without deleting history.
- `tenant_id` is always validated before any tenant-owned repository is called.

### `staff_invites`

Optional future table for invitation workflow.

Planned columns:

| Column | Purpose |
| --- | --- |
| `id` | invite id |
| `tenant_id` | target tenant |
| `email` | invitee email |
| `role` | role to grant on acceptance |
| `status` | `pending` / `accepted` / `expired` / `cancelled` |
| `invited_by_staff_user_id` | inviting staff identity |
| `expires_at` | invite expiry |
| `accepted_at` | acceptance timestamp |
| `created_at` / `updated_at` | timestamps |

Design notes:

- Initial Amami Home operation can defer invite workflow.
- Future multi-company sales likely need explicit invites.
- Invite tokens and email delivery are out of scope for this loop.

## Alternative Short-term Schema

If minimizing migration risk is more important than normalized multi-tenant identity, a short-term path is:

- Keep current tenant-scoped `staff_users`.
- Add nullable `auth_user_id`.
- Add richer `status`, `disabled_at`, and `archived_at`.
- Allow one row per tenant membership.

This is simpler but makes multi-tenant staff switching and RLS membership lookup less clean. The normalized target above is preferred before production auth/RLS rollout unless timeline constraints force a transitional step.

## Role / Permission Policy

Initial roles should stay close to existing schema: `owner`, `manager`, `staff`. Future roles can be added after production auth is stable.

| Role | Intended use | Customer view | Staff reply | AI draft | Alert operation | Knowledge management | Staff management | Tenant settings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `owner` | tenant owner / account admin | yes | yes | yes | yes | yes | yes | yes |
| `manager` | operational admin | yes | yes | yes | yes | yes | limited/no | no |
| `staff` | regular operator | yes | yes | yes | limited | no | no | no |
| `viewer` | future read-only support | yes | no | no | no | no | no | no |
| `platform_admin` | future cross-tenant operator | separate design | separate design | separate design | separate design | separate design | separate design | separate design |

Policy:

- Unknown roles are denied by default.
- `platform_admin` should not be modeled as ordinary tenant membership without an audit design.
- Role-to-permission mapping can remain coarse initially.
- Permission checks must happen after authenticated tenant context is resolved.

## Status Policy

### Staff identity status

| Status | Meaning | API access |
| --- | --- | --- |
| `active` | usable staff identity | allowed only with active membership |
| `disabled` | login/account may exist, but CRM access is stopped | denied |
| `archived` | retained for history after departure or cleanup | denied |

### Membership status

| Status | Meaning | API access |
| --- | --- | --- |
| `invited` | invited but not accepted | denied |
| `active` | accepted and allowed for tenant | allowed subject to role |
| `disabled` | tenant access stopped | denied |
| `archived` | historical membership retained | denied |

### Invite status

| Status | Meaning |
| --- | --- |
| `pending` | invite is usable until expiry |
| `accepted` | invite produced or activated membership |
| `expired` | no longer usable |
| `cancelled` | revoked before acceptance |

Rules:

- Only active identity + active membership can access production Admin API.
- A disabled user or disabled membership cannot access tenant-owned data.
- Hard delete is avoided for staff and membership records.
- Retirement should first disable memberships, then optionally archive identity.
- Removing staff from one tenant should not affect other active tenant memberships.

## Request Tenant Context Connection

### Admin UI -> Admin API

Production target:

1. Admin API verifies session/JWT and obtains `auth_user_id`.
2. API loads active `staff_users` identity by `auth_user_id`.
3. API loads active memberships for that staff.
4. If one active membership exists, tenant context can be derived.
5. If multiple active memberships exist, selected tenant id/slug is treated only as a selector.
6. API validates the selected tenant against active memberships.
7. API builds `TenantContext` with `tenant_id`, `staff_user_id`, `membership_id`, `role`, and permissions.
8. Repository calls receive only resolved `tenant_id`.

Production rule:

- Do not trust `x-tenant-id`.
- Do not call repositories before tenant context is resolved.

### LIFF planned -> API

- LIFF customer flows should call API, not Supabase DB directly.
- LIFF identity/customer context is separate from staff membership.
- If a future LIFF staff flow exists, it must use the same authenticated membership check.

### LINE webhook -> API

- Webhook tenant resolution remains separate from staff/admin auth.
- Tenant is resolved from webhook path/settings and LINE signature verification.
- No staff membership is required for inbound LINE event logging.

### Dev / local request

- Dev-only `x-tenant-id` can remain for local/in-memory checks.
- It must be guarded away from production.
- It is a development context selector, not authentication.

### Test request

- Tests can inject explicit tenant context or `x-tenant-id`.
- Tests must include missing tenant, unknown tenant, disabled staff, and wrong-tenant selection once auth context is implemented.

## Supabase Auth / JWT Connection

- Supabase Auth `auth.users.id` should bind to `staff_users.auth_user_id`.
- JWT/session verification should produce `auth_user_id`, not a trusted tenant id.
- Tenant access should come from active DB membership lookup.
- Custom claims may be added later for performance, but must be refreshed when role/status changes.
- Email is useful for invite and display, but must not be the only production identity binding.

## RLS Plan Connection

Loop 025 RLS planning depends on this schema decision.

- RLS with `auth.uid()` needs `staff_users.auth_user_id`.
- Tenant-owned table policies can check active memberships through `staff_tenant_memberships`.
- Service role bypass is expected for server-side repositories, so repository-level `tenant_id` filters remain mandatory.
- Browser / LIFF direct DB access remains deferred.
- RLS SQL should wait until staff identity and membership schema are implemented.
- Local RLS tests must verify that tenant A staff cannot read/write tenant B rows.

## Future Migration Plan

This loop does not change SQL. Later migration loops should decide exact implementation.

Possible schema changes:

- Add or refactor staff identity table.
- Add `auth_user_id`, `status`, `disabled_at`, `archived_at`.
- Add `staff_tenant_memberships`.
- Optionally add `staff_invites`.
- Add indexes:
  - `staff_users_auth_user_id_unique`
  - `staff_users_email_idx`
  - `staff_tenant_memberships_staff_user_id_idx`
  - `staff_tenant_memberships_tenant_status_idx`
  - `staff_tenant_memberships_tenant_staff_unique`
  - `staff_invites_tenant_email_status_idx`
- Add foreign keys to `tenants` and staff identity.
- Keep nullable fields for migration safety where existing rows may not have auth binding yet.
- Update seed only with non-secret demo/admin-safe data if needed; do not seed real auth IDs or secrets.

Migration strategy decision:

- If no production DB has applied the initial migration, modifying the initial migration may still be acceptable.
- If any shared/local/staging DB has applied it, create an additive migration instead.
- Because this repo already has Supabase repository planning and GitHub history, prefer an additive migration once local migration workflow is established.
- Record the chosen strategy in the migration Loop before editing SQL.

## Local / Staging / Production Policy

### Local

- Keep in-memory runtime by default.
- Keep dev-only `x-tenant-id` while auth middleware is not implemented.
- Supabase local migration apply is still not verified in this repo.
- Use fake/test staff membership data only.

### Staging

- Use a separate Supabase project/key set from production.
- Verify Supabase Auth, staff membership, disabled membership, multi-tenant selection, and RLS.
- Seed only dummy tenants and dummy staff. Do not use real customer LINE user IDs or production logs.

### Production

- Do not trust `x-tenant-id`.
- Keep service role key server-side only.
- Require staff/admin session before Admin API.
- Reject requests without active membership for the selected tenant.
- Add audit logging for sensitive staff/role/tenant changes in a later loop.

## Why No SQL In This Loop

Staff tenant schema impacts migration strategy, auth middleware, RLS policy SQL, admin login, tenant switching, and repository runtime wiring. Implementing SQL before choosing the exact staff identity / membership shape risks locking in a weak security boundary. Loop 028 records the design only so Loop 029 can implement migration deliberately.

## Risks

- Current `staff_users` is tenant-scoped and does not yet match the normalized target model.
- No `auth_user_id` binding exists.
- No membership table exists.
- No invite lifecycle exists.
- No JWT/session verification exists.
- RLS SQL remains deferred.
- Runtime still trusts dev-only `x-tenant-id` for admin routes.
- Migration strategy must be chosen carefully because the target may refactor an existing table name.

## Acceptance Criteria

- Current staff/tenant schema is documented.
- Missing auth/membership/status pieces are documented.
- Target staff identity and membership schema is documented.
- role / permission / status policy is documented.
- Supabase Auth / JWT and RLS connection is documented.
- Migration implementation plan is documented without changing SQL.
- README, database docs, dev loop docs, and dev log are updated.

## Test Requirements

- `git status --short`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`

## Next Loop Candidates

Recommended safe order:

```text
Loop 029: staff tenant schema migration
Loop 030: auth context boundary
Loop 031: admin API tenant context guard
Loop 032: admin auth placeholder UI plan
Loop 033: RLS SQL draft
Loop 034: local auth/RLS test harness
Loop 035: Supabase repository runtime switch plan
```

Do not switch runtime to Supabase before schema, auth context, tenant guard, and local auth/RLS tests are ready.
