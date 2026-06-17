# Loop 104: production Auth runtime auto wiring

## Goal

production runtimeで `AUTH_SESSION_VERIFIER=supabase` を明示したときに、`SupabaseAuthSessionVerifier` と `StaffAuthLookup` を安全に自動構成できる境界を追加する。

このLoopではproduction接続、staging接続、実Auth token取得、LINE/OpenAI実接続は行わない。

## Scope

- production Auth runtime factory境界を `apps/api/src/admin/production-auth-runtime-factories.ts` に追加した。
- `AUTH_SESSION_VERIFIER=supabase` のときだけSupabase Auth verifier runtimeを作る。
- productionで `AUTH_SESSION_VERIFIER=fake` を明示拒否する。
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` のpresence/URL validationをsafe errorで扱う。
- fetch-backed Supabase Auth client境界とStaffAuthLookup境界を追加した。
- Admin routeのresponse contractは維持し、runtime構成/lookup例外は `authenticated_staff_required` へ安全に丸める。
- fake factory / fake auth client / fake staff lookupで代表Admin routeをtestした。
- docs、runbook、dev logを更新した。

## Out of Scope

- production Supabase接続。
- staging Supabase接続。
- 実Supabase Auth token取得。
- Supabase Auth user作成。
- Admin login/session UI本実装。
- RLS SQL変更。
- migration変更。
- LINE API実送信。
- OpenAI API実接続。
- package依存追加。

## Starting State

- Loop 103 commit: `33b6135 feat: add production readiness final gate`
- production readiness final判定: `production_no_go`
- 残No-Go理由のひとつはproduction runtimeのSupabase Auth client / StaffAuthLookup自動構成未完了だった。

## AUTH_SESSION_VERIFIER=supabase

production runtimeでは以下を明示した場合だけreal verifier pathへ進む。

```text
AUTH_SESSION_VERIFIER=supabase
```

構成順:

```text
env validation
-> fetch-backed Supabase Auth client
-> SupabaseAuthSessionVerifier
-> fetch-backed StaffAuthLookup
-> authenticated_staff runtime
```

`Authorization: Bearer` tokenは `SupabaseAuthSessionVerifier` に渡され、Supabase Auth user idを `AuthUserIdentity.authUserId` に変換する。staff解決とtenant membership再検証は `StaffAuthLookup` と既存authenticated runtimeに委ねる。

## Production fake verifier default禁止

- `AUTH_SESSION_VERIFIER` 未指定ではruntimeを作らない。
- `AUTH_SESSION_VERIFIER=fake` は明示拒否する。
- production routeにBearer tokenがあってもruntimeがなければ `authenticated_staff_required` を返す。
- local/dev/testの明示fake runtime injectionは維持する。

## SupabaseAuthSessionVerifier wiring

`FetchSupabaseAuthClient` は `SupabaseAuthClientLike` を実装する。constructor/factory作成時にnetwork requestは発生しない。request時だけAuth user endpointへ進む境界で、testではfake fetch/fake factoryだけを使う。

## StaffAuthLookup wiring

`FetchStaffAuthLookupRepository` は `StaffAuthLookup` を実装する。server-side service role前提の境界で、browser / LIFF / Next client componentから直接使わない。`staff_users.auth_user_id` と `staff_tenant_memberships.staff_user_id` のlookupだけを担当し、active staff / membership / selectedTenantId再検証は既存domain境界に委ねる。

## Required env / dependency conditions

必要なenv名:

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

値はdocsやerrorへ書かない。不足またはURL不正時は `auth_runtime_not_configured` 相当のsafe failureとして扱う。

## Safe failure

safe failureでは以下をresponse/error/docsへ含めない。

- secret値。
- Authorization token。
- project ref。
- DB URL。
- Supabase URL実値。
- service role key。

代表routeではStaffAuthLookupなどのruntime例外を `authenticated_staff_required` へ丸める。

## Local / dev / test compatibility

- local/dev/testの `x-tenant-id` dev header互換は維持する。
- testではfake factory / fake auth client / fake staff lookupを注入できる。
- 本物Supabaseには接続しない。

## Tests

追加:

```text
tests/integration/production-auth-runtime-auto-wiring.test.ts
```

確認:

- module importだけではenv validation / network accessが走らない。
- production未指定ではfake verifier defaultにならない。
- `AUTH_SESSION_VERIFIER=fake` は拒否される。
- `AUTH_SESSION_VERIFIER=supabase` でrequired env不足/不正時にsafe failureする。
- fetch-backed client/repository factoryは作成時にnetwork accessしない。
- fake factoryで代表Admin route `GET /api/admin/customers` がauthenticated_staff runtimeへ進む。
- StaffAuthLookup例外はsecret/token/project refを漏らさずsafe auth failureになる。

## Production readiness impact

Loop 104でproduction Auth runtime auto wiringの未完了項目は解消した。ただしproduction readinessは引き続き `production_no_go`。

残る主なNo-Go理由:

- Admin UIの実login/session/token取得、refresh、logoutが未完了。
- real LINE smoke / real OpenAI smokeは未実施。
- production deploy / production smokeは未実施。
- LINE/OpenAI real enablementは別Loopの明示許可が必要。

## Next Loop Candidates

```text
Loop 105: Admin login/session minimal integration
Loop 106: OpenAI real HTTP transport staging-safe plan
Loop 107: real LINE safe recipient smoke plan
```
