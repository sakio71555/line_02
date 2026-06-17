# Loop 098: Supabase Auth real verifier boundary

## Goal

Loop 097で整理したSupabase Auth/JWT connection planに基づき、`Authorization: Bearer` tokenをSupabase Auth `user.id` へ変換するreal verifier境界を追加する。

このLoopではreal verifier adapterとfake Supabase auth client testだけを追加する。実Supabase Auth接続、Supabase Auth user作成、staging real Auth smoke、RLS SQL変更、production接続は行わない。

## Scope

- `AuthSessionVerifier` 境界を維持したまま、Supabase Auth用のreal verifier adapterを追加する。
- Supabase auth client抽象をconstructor injectionできるようにする。
- fake Supabase auth clientでvalid / missing user / Supabase error / thrown network errorを検証する。
- token、secret、URL、project refをerror/resultへ含めないことをtestで固定する。
- production modeでfake verifierが暗黙にdefault利用されないことをtestで固定する。
- README、database docs、dev loop docs、production hardening runbooks、dev logを更新する。

## Out of Scope

- Supabase Auth/JWT本接続。
- Supabase Auth user作成。
- staging real Auth smoke。
- 実JWT発行または実JWT route smoke。
- RLS SQL / migration / GRANT変更。
- Admin UI selectedTenantId保存。
- API runtime大変更。
- LINE API実送信。
- OpenAI API実接続。
- staging DB / production DB接続。
- `.env.staging` 読み込み。
- `.env.production` 作成。
- package依存追加。

## Starting State

- 開始時作業フォルダー: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- 開始時branch: `main...origin/main`
- 開始時 `git status --short`: clean
- 最新commit: `069d808 docs: plan Supabase Auth JWT connection`
- Loop 097でSupabase Auth/JWT connection planとstaging real Auth smoke Go/No-Goは整理済み。
- production readiness remains No-Go。

## AuthSessionVerifier Boundary

既存の `apps/api/src/admin/auth-session.ts` の境界を維持する。

```text
Authorization header
-> extractBearerToken
-> AuthSessionVerifier.verifyBearerToken(token)
-> AuthUserIdentity
```

`extractBearerToken` はAuthorization headerの構文だけを扱う。Supabase Authとの通信、user解決、error sanitizerはverifier側に閉じる。

## SupabaseAuthSessionVerifier

追加場所:

```text
apps/api/src/admin/supabase-auth-session-verifier.ts
```

追加した主なexport:

- `SupabaseAuthSessionVerifier`
- `createSupabaseAuthSessionVerifier`
- `SupabaseAuthClientLike`
- `SupabaseAuthGetUserResultLike`
- `SupabaseAuthUserLike`

責務:

- Bearer tokenを受け取る。
- `client.auth.getUser(accessToken)` を呼ぶ。
- Supabase Auth user `id` を `AuthUserIdentity.authUserId` へ変換する。
- emailが返った場合は `AuthUserIdentity.email` へ保持する。
- Supabase error、missing user、blank user id、thrown network errorをsafe errorへ変換する。
- token / key / URL / project ref / raw error messageを返さない。

## Supabase Auth Client Abstraction

testで実networkを使わないため、real verifierは以下の最小抽象だけに依存する。

```text
SupabaseAuthClientLike:
  auth.getUser(accessToken)
```

本物のSupabase SDK clientは後続Loopでこの抽象へ渡す。今回のtestではfake clientだけを渡し、`.env.staging` や実Supabase projectには接続しない。

## Bearer Token Handling

token handlingの分担:

- missing Authorization: `extractBearerToken` が `missing_authorization_header`。
- malformed Authorization: `extractBearerToken` が `invalid_authorization_header`。
- Bearer token欠落: `extractBearerToken` が `missing_bearer_token`。
- verifierへ空文字が渡った場合: defensiveに `invalid_bearer_token`。
- Supabase error / missing user / blank user / thrown error: `session_expired`。

HTTP mappingは既存どおり:

- `session_expired` -> `401 session_expired`
- その他session extraction failure -> `401 authenticated_staff_required`

## Token / Secret Redaction

このLoopでは token/secret redaction を境界の必須条件として固定する。

`SupabaseAuthSessionVerifier` は以下をresult/errorへ含めない。

- Authorization token
- JWT
- Supabase URL actual value
- Supabase anon key actual value
- service role key
- DB URL
- project ref
- raw Supabase error message
- thrown network error message

testではfake error objectやthrowにprivate token / project-like文字列を含め、serialized resultに出ないことを確認している。

## Production Fake Verifier Guard

production modeではfake verifierをdefault利用しない。

production modeでは、fake verifierをdefaultとして暗黙利用しない。

固定した挙動:

- `APP_ENV=production` で `Authorization: Bearer` があっても、`adminAuthRuntime` が明示注入されていなければ `authenticated_staff_required`。
- 明示注入したfake verifier testはlocal/test boundaryとして維持できる。
- local/dev/testのdev_header互換は維持する。

このLoopではreal verifierをproduction runtimeへ自動接続しない。実接続は後続Loopで行う。

## StaffAuthLookup Relationship

real verifierはSupabase Auth user idを返すだけで、staff/tenant権限は判断しない。

後続の接続順:

```text
Supabase Auth user.id
-> AuthUserIdentity.authUserId
-> StaffAuthLookup.findStaffByAuthUserId
-> active staff
-> active staff_tenant_memberships
-> selectedTenantId revalidation
-> AdminTenantContext.tenantId
```

## selectedTenantId Relationship

`selectedTenantId` は認証ではなくselectorである。

- Bearer tokenなしでは認証扱いしない。
- real verifier成功後にactive membershipで再検証する。
- raw selectedTenantIdをrepository filterへ渡さない。
- Admin UI selectedTenantId保存は未実装。

## RLS auth.uid Relationship

Loop 096ではdummy `request.jwt.claim.sub` でRLS `auth.uid()` を検証した。real Auth接続時は以下が一致する必要がある。

```text
Supabase Auth user.id
= AuthUserIdentity.authUserId
= staff_users.auth_user_id
= auth.uid()
```

Loop 098はAPI側real verifier境界だけを追加する。RLS smokeとの一貫性確認はstaging real Auth smokeの後続Loopで扱う。

## Tests

追加:

```text
tests/integration/supabase-auth-session-verifier.test.ts
```

更新:

```text
tests/integration/production-dev-header-rejection.test.ts
```

確認内容:

- verifier module importでenv validation / network accessが走らない。
- valid fake Supabase Auth responseから `AuthUserIdentity.authUserId` を返す。
- `extractAdminAuthSession` と統合してもtokenをresultへ漏らさない。
- missing user / blank user id / Supabase error / thrown network errorを `session_expired` へ変換する。
- fake clientはtokenを受け取るが、error resultにtokenやproject-like情報を含めない。
- production modeでfake verifierをdefault利用しない。
- local/dev/test fake verifier injectionは維持する。

## Not Implemented in This Loop

- 実Supabase Auth接続。
- Supabase Auth user作成。
- staging real Auth smoke。
- Admin API runtimeへのreal verifier自動接続。
- RLS SQL変更。
- migration変更。
- production接続。
- LINE/OpenAI本接続。

## Production No-Go

production readiness remains No-Go.

理由:

- Supabase Auth user.idと `staff_users.auth_user_id` のstaging real Auth smokeが未完了。
- real verifierをAdmin API runtimeへ本接続していない。
- Admin UI selectedTenantId保存が未完了。
- LINE real push gateが未完了。
- OpenAI real API gateが未完了。

## Residual Risks

- fake Supabase auth client testで境界は固定したが、本物Supabase Auth responseとのstaging smokeは未実施。
- network failureは `session_expired` へ安全に畳んでいるが、運用ログ/監査方針は後続Loopで検討が必要。
- production runtimeへの接続順は後続Loopで決める必要がある。

## Next Loop Candidates

```text
Loop 099: staging real Auth user smoke plan/execution gate
Loop 100: Admin UI selectedTenantId persistence
Loop 101: production readiness final gate
```
