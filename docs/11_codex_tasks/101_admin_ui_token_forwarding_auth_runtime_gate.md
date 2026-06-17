# Loop 101: Admin UI token forwarding + production Auth runtime gate

## Goal

Admin UIが将来のSupabase Auth access tokenをAdmin APIへ渡せる境界を追加し、production modeで `AUTH_SESSION_VERIFIER=supabase` を選んだ場合に `SupabaseAuthSessionVerifier` を使うruntime gateを用意する。

このLoopでは本物のSupabase Auth login、token取得、production接続は行わない。

## Scope

- Admin API helperにaccess token provider境界を追加した。
- providerから取得したtokenは `Authorization: Bearer` headerへだけ載せる。
- tokenはlocalStorage、cookie、UI、error messageへ保存・表示しない。
- production向けconfigでは開発用 `x-tenant-id` を送らない選択肢を追加した。
- `x-selected-tenant-id` は引き続きselectorとして送り、API側active membership再検証を前提にした。
- API側にproduction Auth runtime gateを追加した。
- productionで `AUTH_SESSION_VERIFIER=supabase` かつSupabase Auth client相当とStaffAuthLookupが注入された場合のみ、`SupabaseAuthSessionVerifier` を使う。
- 必要なruntime dependencyが不足する場合は `authenticated_staff_required` 相当で安全に失敗する。
- fake Supabase auth client / fake staff lookupでunit/integration testを追加した。

## Out of Scope

- Supabase Auth user作成。
- 本物のSupabase access token取得。
- `.env` / `.env.staging` 作成・変更。
- production / staging real Auth smoke rerun。
- Supabase DB接続、migration、GRANT、RLS SQL変更。
- Admin login/session UIの本格実装。
- LINE API / OpenAI API本接続。
- package追加・更新。

## Admin UI token forwarding

```text
apps/admin/src/admin-auth-token.ts
apps/admin/src/admin-api.ts
```

`AdminApiRequestOptions.accessTokenProvider` を追加した。providerはrequest時にだけ呼び出し、空文字や未指定なら `Authorization` headerは付けない。

```text
accessTokenProvider()
-> trim
-> Authorization: Bearer <token>
-> fetch(Admin API)
```

禁止事項:

- tokenをlocalStorageへ保存しない。
- tokenをcookieへ保存しない。
- tokenをUIへ表示しない。
- tokenをerror messageへ混ぜない。
- tokenをdocs/dev logへ書かない。

## selectedTenantId vs x-tenant-id

| item | purpose | production handling |
| --- | --- | --- |
| `Authorization: Bearer` | 認証済みstaff sessionの証明 | production Admin routeで必須 |
| `x-selected-tenant-id` | 複数tenant所属staffの操作対象selector | active membershipで再検証する |
| `x-tenant-id` | local/dev/test互換のdev header | productionでは拒否済み |

Admin UI helperはlocal/dev/test互換のため既定では `x-tenant-id` を維持する。ただし `APP_ENV=production` / `NODE_ENV=production` では既定で送らない。`x-selected-tenant-id` はpermissionではなくselectorであり、repositoryへ渡すtenantはAPI側で確定した `AdminTenantContext.tenantId` のみ。

## Production Auth runtime gate

```text
apps/api/src/admin/production-auth-runtime-gate.ts
apps/api/src/admin/supabase-auth-session-verifier.ts
```

production modeで `AUTH_SESSION_VERIFIER=supabase` のときだけ、注入された `SupabaseAuthClientLike` を `SupabaseAuthSessionVerifier` に包む。

このLoopではAPI packageから `@amami-line-crm/db` へ新規依存を足していない。実Supabase client / StaffAuthLookup repositoryのproduction自動生成は後続Loopで扱う。

安全側の挙動:

- `AUTH_SESSION_VERIFIER=supabase` でも必要dependencyがない場合はruntimeを作らない。
- runtimeがなければproduction Admin routeは `authenticated_staff_required` を返す。
- tokenやSupabase error raw detailsはresponseへ出さない。
- explicit fake `adminAuthRuntime` injectionは既存test用途として維持する。

## Tests

- Admin API helperがaccess token providerから `Authorization: Bearer` を付けること。
- blank tokenではAuthorizationを付けないこと。
- production-style configで `x-tenant-id` を抑止できること。
- `x-selected-tenant-id` と `x-tenant-id` を混同しないこと。
- provider/API errorでtoken値をerror messageへ混ぜないこと。
- production `AUTH_SESSION_VERIFIER=supabase` でdependency不足なら安全に401になること。
- fake Supabase auth client注入時に `SupabaseAuthSessionVerifier` 経由でAdmin routeが通ること。
- production `x-tenant-id` rejectionとlocal dev_header互換を壊さないこと。

## Production Readiness

Loop 101後もproduction readinessはNo-Go。

No-Go理由:

- 本物のAdmin login/session UIが未実装。
- token取得・refresh・logoutが未実装。
- production runtimeで実Supabase client / StaffAuthLookup repositoryを自動構成していない。
- LINE real push gateとOpenAI real API gateが未実装。
- production deploy / production smokeを行っていない。

## Next Loop Candidates

```text
Loop 102: LINE real push gate
Loop 103: OpenAI real API gate
Loop 104: Admin Auth login/session minimal integration
Loop 105: production readiness final gate
```
