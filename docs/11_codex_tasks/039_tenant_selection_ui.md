# Loop 039: Tenant Selection UI

## Goal

将来の複数tenant所属staff向けに、`/select-tenant` を本番Auth接続前のtenant selection UI構造として整理する。

今回はtenant一覧API取得、tenant選択保存、cookie/session/localStorage保存、Supabase Auth/JWT/session検証、Admin API authenticated_staff guard接続は実装しない。

## Scope

- `/select-tenant` pageを将来のtenant selection UIに近い静的構造へ整理する。
- `tenant_amamihome` のtenant placeholder cardを表示する。
- tenant選択buttonをdisabledにする。
- tenant保存未実装、API取得未実装、Supabase Auth/JWT未接続を明示する。
- dev-only `x-tenant-id` のMVP導線を維持する。
- `/login`、`/permission-denied`、`/session-expired` とのplaceholder導線を整える。
- auth placeholder render testを更新する。
- README、dev loop docs、dev logを更新する。
- UI変更のためbuildを実行する。

## Out of Scope

- tenant一覧API実装
- tenant一覧取得request
- selectedTenantId保存
- cookie/session/localStorage/sessionStorage保存
- Supabase Auth実装
- JWT/session検証
- Admin API authenticated_staff guard接続
- Admin API route変更
- middleware実装
- RLS SQL実装
- migration SQL変更
- repository変更
- `.env` 作成・変更
- Supabase本番接続
- OpenAI API呼び出し
- LINE API呼び出し
- Webクロール

## UI Changes

Changed:

- `apps/admin/app/select-tenant/page.tsx`

The page now renders:

- heading: `テナント選択`
- explanation for future multi-tenant staff selection
- Supabase Auth / membership lookup未接続 notice
- static tenant placeholder card
- disabled tenant selection button
- notes that tenant list API fetch and tenant persistence are not implemented
- dev links to `/login`, `/customers`, `/alerts`, `/permission-denied`, `/session-expired`, and `/`

The page remains a Server Component. No Client Component, Server Action, event handler, API request, Supabase client import, cookie/session/localStorage/sessionStorage access, or tenant persistence was added.

## Tenant Placeholder Card

Static placeholder:

| Field | Value |
| --- | --- |
| Display name | アマミホーム |
| tenant_id | `tenant_amamihome` |
| slug | `amamihome` |
| domain | `amamihome.net` |
| status | dev placeholder / 未接続 |

This card is display-only. It must not be treated as a selected tenant.

## Disabled Selection Policy

The selection button is intentionally disabled:

- `type="button"`
- `disabled`
- no form action
- no Server Action
- no API request
- no storage persistence

Reason:

- The page shape prepares the UI for a later tenant selection integration loop.
- The current loop must not select, persist, or authorize tenant context.
- Future selected tenant IDs must be revalidated against active staff membership before use.

## Supabase Auth / JWT Status

Still not connected:

- Supabase Auth
- JWT/session verification
- membership lookup from authenticated staff
- selected tenant validation
- Admin API authenticated_staff guard runtime path

## Dev MVP Route Preservation

Unchanged:

- `/customers`
- `/customers/[customerId]`
- `/alerts`
- `/login`
- `/permission-denied`
- `/session-expired`
- Admin top page
- dev-only `x-tenant-id`
- API helper
- existing AI/RAG/staff reply/alert UI

## Related Placeholder Pages

- `/login` links to `/select-tenant` as a placeholder route.
- `/select-tenant` links back to `/login`.
- `/permission-denied` and `/session-expired` remain static placeholder pages.
- No existing route is protected by these placeholder pages yet.

## Tests / Build

Updated:

- `tests/integration/admin-auth-placeholder-pages.test.tsx`

Verified:

- `/select-tenant` renders.
- `tenant_amamihome` is displayed.
- `amamihome` and `amamihome.net` are displayed.
- tenant selection button is disabled.
- 未接続、保存しない、API取得なしの説明が表示される。
- links to `/login`, `/customers`, and `/alerts` remain visible.
- no form action is rendered.
- existing login, permission denied, and session expired placeholder tests still pass.

Required verification:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Risks

- `/select-tenant` still does not fetch staff memberships.
- tenant selection is not saved.
- JWT/session verification and Admin API authenticated_staff guard connection are still unimplemented.
- Existing MVP routes are still protected only by dev-only `x-tenant-id`.

## Next Loop Candidates

```text
Loop 040: role-based admin action guard plan
Loop 041: admin session/JWT verification plan
```
