# Loop 038: Admin Login UI Integration

## Goal

Loop 033で追加した `/login` placeholderを、将来のSupabase Auth接続に進めやすいlogin UI構造へ整理する。

今回はemail/password入力欄とdisabled submitを表示するだけで、Supabase Auth呼び出し、login処理、session保存、JWT検証、Admin API guard接続は実装しない。

## Scope

- `/login` pageを将来のlogin UIに近い静的構造へ整理する。
- email/password入力欄を追加する。
- submit buttonをdisabledにする。
- Supabase Auth未接続、送信処理なし、入力内容未保存を明示する。
- session/cookie/localStorage/sessionStorageを使わないことを明示する。
- dev MVP導線を維持する。
- auth placeholder render testを更新する。
- README、dev loop docs、dev logを更新する。
- UI変更のためbuildを実行する。

## Out of Scope

- Supabase Auth API calls
- `signInWithPassword`
- magic link
- OAuth
- logout
- session retrieval
- cookie/session/localStorage/sessionStorage persistence
- JWT signature verification
- Admin API authenticated_staff guard connection
- Admin API route changes
- middleware
- RLS SQL
- migration SQL changes
- repository changes
- `.env` creation or update
- Supabase production connection
- OpenAI API calls
- LINE API calls
- Web crawling

## Login UI Changes

Changed:

- `apps/admin/app/login/page.tsx`

The page now renders:

- heading: `管理画面ログイン`
- Supabase Auth未接続 notice
- email input
- password input
- disabled submit button
- note that input is not sent or saved
- note that session/cookie/localStorage/sessionStorage are not used
- dev links to `/customers`, `/alerts`, `/select-tenant`, and `/session-expired`

The page remains a Server Component. No Client Component, Server Action, event handler, API request, or Supabase client import was added.

## Email / Password Form Policy

The form is intentionally disabled:

- `fieldset disabled`
- submit button disabled
- no `action`
- no Server Action
- no `onSubmit`

Reason:

- The form shape prepares the UI for a later auth integration loop.
- The current loop must not perform or simulate login.
- Input contents must not be transmitted, persisted, or treated as credentials.

## Supabase Auth Status

Still not connected:

- Supabase Auth API
- Supabase Auth client import from Admin UI
- email/password sign-in
- session creation
- JWT/session verification
- Admin API authenticated_staff guard runtime path

`SUPABASE_SERVICE_ROLE_KEY` is not used in Admin UI and must never be exposed to browser/client code.

## Session / Storage Status

Not used:

- cookies
- session storage
- local storage
- server session persistence
- logout/cookie deletion

## Dev MVP Route Preservation

Unchanged:

- `/customers`
- `/customers/[customerId]`
- `/alerts`
- `/select-tenant`
- `/permission-denied`
- `/session-expired`
- Admin top page
- dev-only `x-tenant-id`
- API helper
- existing AI/RAG/staff reply/alert UI

## Related Placeholder Pages

No functional wiring was added to:

- `/select-tenant`
- `/permission-denied`
- `/session-expired`

They remain static placeholder pages describing future auth states.

## Tests / Build

Updated:

- `tests/integration/admin-auth-placeholder-pages.test.tsx`

Verified:

- `/login` renders.
- email input exists.
- password input exists.
- submit button is disabled.
- Supabase Auth未接続 text is present.
- input contents are not sent/saved.
- no form action is rendered.
- dev MVP links are present.
- tenant selection, permission denied, and session expired placeholder pages still render.

Required verification:

- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`
- `npx pnpm@10.12.1 test:integration`
- `npx pnpm@10.12.1 build`

## Risks

- `/login` still does not authenticate users.
- Existing MVP routes are still unprotected.
- JWT/session verification is still unimplemented.
- Admin API runtime still uses dev-only `x-tenant-id`.
- Tenant selection, permission denied, and session expired pages are still placeholders.

## Next Loop Candidates

```text
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
