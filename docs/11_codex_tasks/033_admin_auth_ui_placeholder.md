# Loop 033: Admin Auth UI Placeholder

## Goal

Loop 032で設計した管理画面認証導線のうち、本物の認証には接続しないplaceholder UIを最小実装する。

今回の目的は、将来のSupabase Auth / JWT / authenticated staff guard導入前に、必要な画面の置き場とユーザー導線だけを作ること。

## Scope

- Admin auth placeholder UIを追加する。
- login placeholder画面を追加する。
- tenant selection placeholder画面を追加する。
- permission denied placeholder画面を追加する。
- session expired placeholder画面を追加する。
- 既存Adminトップからplaceholder画面へ行ける最小導線を追加する。
- 既存dev-only MVP導線を維持する。
- placeholderであること、Supabase Auth / JWT / session未接続であることをUI上で明示する。
- 軽いrender test、README、dev loop docs、dev logを更新する。

## Out of Scope

- Supabase Auth implementation
- JWT/session verification
- middleware implementation
- Admin API guard authenticated_staff connection
- Admin API route changes
- Admin API helper production auth changes
- repository changes
- migration SQL changes
- RLS SQL implementation
- `.env` creation or update
- Supabase production connection
- real login form submit
- cookie/session/localStorage/sessionStorage persistence
- OpenAI API calls
- LINE API calls
- Web crawling
- runtime switch from in-memory to Supabase

## Implemented Placeholder Routes

Current Admin app uses Next.js App Router under `apps/admin/app`, and existing routes are `/`, `/customers`, `/customers/[customerId]`, and `/alerts`.

Loop 033 therefore added internal routes that match the current app structure:

| Route | File | Purpose |
| --- | --- | --- |
| `/login` | `apps/admin/app/login/page.tsx` | Login placeholder |
| `/select-tenant` | `apps/admin/app/select-tenant/page.tsx` | Tenant selection placeholder |
| `/permission-denied` | `apps/admin/app/permission-denied/page.tsx` | Permission denied placeholder |
| `/session-expired` | `apps/admin/app/session-expired/page.tsx` | Session expired placeholder |

The app may still be externally mounted under `/admin` later, but this loop keeps internal route naming aligned with the existing `apps/admin` structure.

Shared placeholder layout:

- `apps/admin/app/auth-placeholder-page.tsx`

## Login Placeholder

The login placeholder shows:

- 管理画面ログイン heading.
- 認証未接続のplaceholderであること.
- Supabase Auth / JWT / session / Admin API authenticated_staff guardが未接続であること.
- No real email/password submit.
- No cookie/session/localStorage/sessionStorage persistence.
- Development links to `/customers`, `/alerts`, `/select-tenant`, and `/session-expired`.

## Tenant Selection Placeholder

The tenant selection placeholder shows:

- テナント選択 heading.
- Future multiple-tenant membership selection intent.
- Current dev tenant is `tenant_amamihome`.
- No tenant list fetch.
- No Admin API tenant lookup request.
- No selected tenant persistence.
- Links back to existing dev MVP routes.

## Permission Denied Placeholder

The permission denied placeholder shows:

- 権限不足 heading.
- Future role / membership不足時のsafe state.
- `owner` / `manager` / `staff` guard is still deferred.
- UI hiding is helper only; API guard remains the authority.
- Existing routes are not protected by this page yet.

## Session Expired Placeholder

The session expired placeholder shows:

- セッション期限切れ heading.
- Future JWT/session expiration state.
- No session validation.
- No cookie deletion.
- No logout API call.
- Links to login placeholder and dev MVP routes.

## Existing MVP Route Preservation

Loop 033 does not protect or change these existing routes:

- `/customers`
- `/customers/[customerId]`
- `/alerts`

It also does not change:

- AI summary UI.
- AI reply draft UI.
- RAG answer draft UI.
- staff reply UI.
- alert UI.
- demo seed route or runbook.
- `apps/admin/src/admin-api.ts` dev-only `x-tenant-id` handling.
- `apps/api/src/admin/tenant-context.ts` dev-header guard.

The Admin top page now links to the placeholder screens under a separate Auth placeholder section, while keeping existing customer and alert navigation unchanged.

## Supabase Auth / JWT / Guard Status

Still not connected:

- Supabase Auth.
- JWT/session verification.
- cookie/session/localStorage/sessionStorage state.
- Admin API authenticated_staff path.
- role-based action guard.
- RLS SQL.
- Supabase runtime switch.

Current runtime remains:

```text
Admin UI helper
-> x-tenant-id
-> Admin API tenant context guard
-> source: dev_header
```

## Tests / Build

Added:

- `tests/integration/admin-auth-placeholder-pages.test.tsx`

Test coverage:

- login placeholder renders.
- tenant selection placeholder renders.
- permission denied placeholder renders.
- session expired placeholder renders.
- pages include "Supabase Auth未接続" / "認証未接続" style warnings.
- pages do not require external API calls.

Required verification for this loop:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Risks

- Placeholder screens do not enforce authentication.
- Auth-specific API error mapping is still not implemented.
- Supabase Auth client boundary is not connected to Admin UI.
- Role-based UI hiding and API permission guard remain future work.
- Existing dev-only `x-tenant-id` path remains active for local/test.

## Next Loop Candidates

```text
Loop 034: admin API auth error response mapping
Loop 035: Supabase Auth client boundary
Loop 036: staff auth lookup repository
Loop 037: authenticated staff tenant guard
Loop 038: admin login UI integration
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
