# Loop 035: Supabase Auth Client Boundary

## Goal

将来のAdmin login / session / authenticated staff guard導入に備えて、Supabase Auth用のconfigとclient factory境界を追加する。

今回はlogin、logout、session保存、JWT検証、Admin API guard接続、RLS SQL、本番Supabase接続は実装しない。

## Scope

- Supabase Auth用config boundaryを追加する。
- Supabase Auth用client factory boundaryを追加する。
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` だけをAuth configで扱う。
- service role keyをAuth config/client boundaryに含めない。
- browser/client用とserver用の責務を分ける。
- import時にenv validationやclient生成が走らないようにする。
- fake envとfetch mockで外部接続なしのtestを追加する。
- README、database docs、dev loop docs、dev logを更新する。

## Out of Scope

- Admin login implementation
- email/password sign-in
- magic link / OAuth
- logout
- session, cookie, localStorage, or sessionStorage persistence
- JWT signature verification
- Admin API authenticated_staff guard connection
- Admin API route changes
- Admin UI login form submit
- middleware
- staff auth lookup repository
- RLS SQL
- migration SQL changes
- `.env` creation or update
- Supabase production connection
- OpenAI API calls
- LINE API calls
- Web crawling

## Boundary Location

Implemented in:

- `packages/db/src/supabase/auth-config.ts`
- `packages/db/src/supabase/auth-client.ts`
- exported from `packages/db/src/supabase/index.ts`

## Placement Decision

`@supabase/supabase-js` is already a dependency of `@amami-line-crm/db`, and Loop 021 placed the existing Supabase config/client boundary under `packages/db/src/supabase`.

Loop 035 keeps the Auth boundary there to:

- reuse the existing Supabase dependency without adding packages;
- avoid adding Supabase dependencies to `apps/admin` before UI integration is designed;
- keep service role repository clients and anon Auth clients visible in one Supabase boundary while separating their config types;
- avoid package cycles and avoid importing Supabase directly from Admin UI in this loop.

This does not mean Admin UI should import the boundary directly today. UI integration remains a later loop.

## Auth Config Boundary

Added:

- `SupabaseAuthConfig`
- `SupabaseAuthConfigError`
- `SupabaseAuthConfigErrorCode`
- `readSupabaseAuthConfigFromEnv(env)`
- `validateSupabaseAuthConfig(input)`

Auth env names:

| env | purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL used by Auth client factory |
| `SUPABASE_ANON_KEY` | anon key used by Auth client factory |

Auth config intentionally does not include:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

`readSupabaseAuthConfigFromEnv` only validates env when called. Importing `@amami-line-crm/db` does not validate env.

## Auth Client Boundary

Added:

- `createSupabaseAuthServerClient(config)`
- `createSupabaseAuthBrowserClient(config)`

Both factories use the anon key from `SupabaseAuthConfig`.

Both factories currently use stateless options:

- `autoRefreshToken: false`
- `detectSessionInUrl: false`
- `persistSession: false`

Reason:

- Loop 035 only creates a safe client boundary.
- login/logout/session persistence is intentionally deferred.
- no cookie/localStorage/sessionStorage behavior is introduced in this loop.

Server and browser runtime separation:

- `createSupabaseAuthServerClient` throws in browser-like runtimes.
- `createSupabaseAuthBrowserClient` throws outside browser-like runtimes.

This keeps runtime intent explicit before Admin login integration is implemented.

## Service Role Key Policy

- Auth client boundary never reads `SUPABASE_SERVICE_ROLE_KEY`.
- Auth config type has no `serviceRoleKey` field.
- Browser / LIFF / Next client component must never receive service role key.
- Existing service role server client remains separate in `packages/db/src/supabase/client.ts`.
- Repository service role usage remains server-side only.

## Future Connection

Future intended flow:

```text
Admin login UI
-> Supabase Auth client boundary
-> verified session/JWT boundary
-> Admin API tenant context guard
-> authenticated_staff
-> staff membership lookup
-> tenant-scoped repositories
```

Still not connected in Loop 035:

- Admin login form
- sign-in / sign-out
- session storage
- JWT verification
- Admin API guard authenticated_staff path
- Admin UI error redirect handling
- RLS SQL

## Tests

Added:

- `tests/integration/supabase-auth-client-boundary.test.ts`

Verified:

- fake env creates Auth config.
- missing `SUPABASE_URL` returns validation error.
- missing `SUPABASE_ANON_KEY` returns validation error.
- invalid Supabase Auth URL is rejected.
- service role key and DB URL are not included in Auth config.
- server Auth client factory creates a client without network access.
- browser Auth client factory creates a client without network access when a browser-like runtime is stubbed.
- server/browser runtime guards stay separated.
- importing `@amami-line-crm/db` does not validate env or create clients.
- no login/logout/session helpers are exported yet.

## Risks

- Admin login is still not implemented.
- No session persistence strategy exists yet.
- No JWT/session verification exists yet.
- Admin API still uses the dev-only `x-tenant-id` path at runtime.
- Browser Auth client integration needs a later loop to decide safe Next.js client/server usage.

## Next Loop Candidates

```text
Loop 036: staff auth lookup repository
Loop 037: authenticated staff tenant guard
Loop 038: admin login UI integration
Loop 039: tenant selection UI
Loop 040: role-based admin action guard plan
```
