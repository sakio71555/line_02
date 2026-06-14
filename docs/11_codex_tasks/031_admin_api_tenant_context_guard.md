# Loop 031: Admin API Tenant Context Guard

## Goal

Admin API requestからtenant contextを得る処理を一箇所に集約し、後続Loopでdev-only `x-tenant-id` からauthenticated staff contextへ差し替えられる土台を作る。

今回はSupabase Auth、JWT検証、middleware、Admin login UI、RLS SQL、Supabase repository runtime接続は実装しない。

## Scope

- Admin API用tenant context guardを追加する。
- 既存dev-only `x-tenant-id` 解決をguard境界へ集約する。
- 既存Admin API routeのレスポンス互換を維持する。
- guard error codeと既存HTTP response mappingを最小実装する。
- dev/local/testでは既存通り `x-tenant-id` が使える状態を維持する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth implementation
- JWT signature verification
- Supabase session verification
- Admin login UI
- LIFF auth implementation
- RLS SQL implementation
- migration SQL changes
- repository changes
- Supabase repository runtime connection
- OpenAI API calls
- LINE API calls
- Web crawling
- `.env` creation or update
- Supabase production connection
- `supabase link`

## Guard Location

Implemented in:

- `apps/api/src/admin/tenant-context.ts`

Reason:

- HTTP/request/header handling belongs in `apps/api`.
- `packages/domain` remains free from Hono/request/header dependencies.
- The guard does not import Supabase client and does not read new env values.
- Importing the guard has no network or env-validation side effects.

## AdminTenantContext Shape

```ts
type AdminTenantContext = {
  tenantId: string;
  source: "dev_header" | "authenticated_staff";
  staffUserId?: string;
  authUserId?: string;
  role?: "owner" | "manager" | "staff";
};
```

Current runtime path returns:

```ts
{
  tenantId: "tenant_amamihome",
  source: "dev_header"
}
```

`authenticated_staff` is reserved for a later loop that verifies session/JWT and calls the Loop 030 pure resolver.

## Dev-only `x-tenant-id`

Loop 031 keeps existing local/test behavior:

- missing header remains `401` with `missing_tenant_id`.
- unknown tenant remains `403` with `unknown_tenant_id`.
- known configured tenant returns context with `source: "dev_header"`.

Production policy:

- `x-tenant-id` is not production auth.
- A future selected tenant header/cookie can only be a selector and must be validated against authenticated memberships.
- Production Admin API should use authenticated staff context after JWT/session verification exists.

## Relationship To Loop 030

- Loop 030 `resolveAuthenticatedTenantContext` is a pure resolver.
- Loop 031 guard is the HTTP/API request boundary.
- This loop does not obtain `authUserId` from JWT/session.
- Future flow: request -> JWT/session verification -> `authUserId` -> Loop 030 resolver -> `AdminTenantContext`.
- The dev-header path and future authenticated-staff path are kept separate in the context source.

## Applied Routes

The existing Admin API routes continue to call the local `resolveAdminTenant` adapter in `apps/api/src/index.ts`, and that adapter now delegates to `apps/api/src/admin/tenant-context.ts`.

Applied to all current routes that already used `resolveAdminTenant`:

- `POST /api/dev/seed-demo-data`
- `GET /api/admin/customers`
- `GET /api/admin/customers/:customerId`
- `GET /api/admin/customers/:customerId/timeline`
- `POST /api/admin/customers/:customerId/reply`
- `POST /api/admin/customers/:customerId/ai-summary`
- `POST /api/admin/customers/:customerId/ai-reply-draft`
- `GET /api/admin/alerts`
- `POST /api/admin/alerts/check-unreplied`
- `POST /api/admin/alerts/notify-open`
- `POST /api/admin/rag/search`
- `POST /api/admin/rag/answer-draft`

LINE webhook tenant resolution remains separate and unchanged.

## Error / HTTP Mapping

Guard error codes:

- `missing_tenant_context`
- `unknown_tenant`
- `dev_tenant_header_not_allowed`
- `authenticated_staff_required`
- `tenant_membership_denied`
- `tenant_selection_required`

Current route compatibility mapping:

| Guard code | HTTP | Response error |
| --- | --- | --- |
| `missing_tenant_context` | 401 | `missing_tenant_id` |
| `unknown_tenant` | 403 | `unknown_tenant_id` |

Future authenticated-staff errors need a dedicated 401/403/409 mapping review when JWT/session guard is implemented.

## Tests

Added:

- `tests/integration/admin-tenant-context-guard.test.ts`

Verified:

- known `x-tenant-id` creates `source: "dev_header"` context.
- missing tenant maps to legacy `401 / missing_tenant_id`.
- unknown tenant maps to legacy `403 / unknown_tenant_id`.
- representative Admin API route still behaves through the guard.
- dev seed route remains unchanged.

Existing AI, RAG, alert, staff reply, customer, timeline, webhook, and Supabase repository tests continue to pass.

## Risks

- Admin API still uses dev-only `x-tenant-id` at runtime.
- Supabase Auth/JWT/session verification is still missing.
- Authenticated staff path is typed but not connected.
- RLS SQL is still not implemented.
- Future HTTP mapping for authenticated errors needs a focused loop.

## Next Loop Candidates

```text
Loop 032: admin auth placeholder UI plan
Loop 033: RLS SQL draft
Loop 034: local auth/RLS test harness
Loop 035: Supabase repository runtime switch plan
```
