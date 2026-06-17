# Supabase Auth/JWT Connection Plan

## Purpose

Supabase Auth/JWT本接続へ進む前に、Admin APIが安全に `Authorization: Bearer` から認証済みstaff tenant contextを作るための接続順、secret非表示ルール、staging smoke手順、Go/No-Goを整理する。

このrunbookは接続計画です。Supabase Auth user作成、実JWT検証、RLS SQL変更、production接続は行わない。

## Audience

- Supabase Auth/JWT verifierを実装する人。
- staging real Auth smokeを行う人。
- production readinessを判定する人。

## Current State

- Loop 093でproduction `x-tenant-id` / dev_header rejectionは実装済み。
- Loop 095BでRLS SQLはstaging DBへ適用済み。
- Loop 096でdummy `request.jwt.claim.sub` によるauthenticated role / JWT claim相当RLS smokeは成功済み。
- `AuthSessionVerifier`、authenticated runtime、StaffAuthLookup、selectedTenantId transportは存在する。
- Loop 098で `SupabaseAuthSessionVerifier` real verifier boundaryは追加済み。
- Loop 099でstaging real Auth user smokeは成功済み。
- Supabase Auth/JWTのproduction本接続は未実施。
- production readiness remains No-Go。

## Preconditions

- 作業対象がstagingであることを人間が確認する。
- `.env.staging` の値を表示しない。
- token、JWT secret、project ref、DB URL、passwordを表示しない。
- dummy dataだけを使う。
- production projectへ接続しない。

## Bearer Token Handling

Accepted input:

```text
Authorization: Bearer <access_token>
```

Handling:

- Bearer tokenはserver-side verifierへ渡すだけ。
- token値はerror body、log、docs、dev log、screenshotへ出さない。
- missing / invalid / malformed tokenは `authenticated_staff_required`。
- expired tokenは `session_expired`。
- `x-selected-tenant-id` はselectorであり、認証ではない。
- `x-tenant-id` はdev-onlyであり、productionでは拒否される。

## Loop 098 Real Verifier Boundary

Loop 098で以下を追加した。

```text
apps/api/src/admin/supabase-auth-session-verifier.ts
tests/integration/supabase-auth-session-verifier.test.ts
```

Boundary:

```text
Authorization header
-> extractBearerToken
-> SupabaseAuthSessionVerifier.verifyBearerToken(token)
-> client.auth.getUser(token)
-> Supabase Auth user.id
-> AuthUserIdentity.authUserId
```

The verifier depends on `SupabaseAuthClientLike`, so tests can inject a fake Supabase auth client. Importing the module does not read env, create a real client, or perform network access.

Loop 098 also fixes production guard behavior:

- production mode does not silently use a fake verifier by default.
- production Bearer request without explicit `adminAuthRuntime` returns `authenticated_staff_required`.
- explicit fake verifier injection remains allowed in local/test integration tests.

Still not done:

- real Supabase Auth connection.
- Supabase Auth user creation.
- staging real Auth smoke.
- Admin API runtime auto-wiring with the real verifier.

## Secret and Token Non-Disclosure

Do not print or commit:

- Authorization token
- JWT secret
- Supabase URL actual value
- Supabase anon key actual value
- Supabase service role key actual value
- Supabase DB URL actual value
- project ref
- database password
- LINE token
- OpenAI key

Env names may be documented, but values must not be written.

## Supabase Auth User and Staff Mapping

本接続時のauthority chain:

```text
Bearer access token
-> Supabase Auth user.id
-> staff_users.auth_user_id
-> active staff
-> active staff_tenant_memberships
-> selectedTenantId membership revalidation
-> AdminTenantContext.tenantId
```

Rules:

- Supabase Auth `user.id` と `staff_users.auth_user_id` は一致させる。
- `staff_users.status` がactiveで、`is_active` がtrueのstaffだけを許可する。
- active `staff_tenant_memberships` だけをtenant/role sourceにする。
- `staff_users.tenant_id` は互換情報であり、本番のtenant authorityにはしない。

## Error Mapping

Loop 098 keeps the existing error family.

| case | verifier/session result |
| --- | --- |
| missing Authorization header | `authenticated_staff_required` via existing mapper |
| malformed Authorization header | `authenticated_staff_required` via existing mapper |
| defensive blank verifier token | `invalid_bearer_token` |
| Supabase auth error | `session_expired` |
| missing Supabase user | `session_expired` |
| blank Supabase user id | `session_expired` |
| thrown network error | `session_expired` |

The verifier result is code-only and does not expose token, URL, key, project ref, or raw Supabase error text.

## StaffAuthLookup

`StaffAuthLookup` はSupabase Auth user idからstaff contextを解決する境界である。

- `findStaffByAuthUserId(authUserId)` でstaffを取得する。
- `listMembershipsByStaffUserId(staffUserId)` でmembershipsを取得する。
- inactive staffは拒否する。
- inactive membershipは拒否する。
- active membershipが複数ある場合、selectedTenantIdが必要。
- wrong selectedTenantIdは `tenant_membership_denied`。

## selectedTenantId

- selectedTenantIdはpermissionではなくselector。
- Bearer tokenなしのselectedTenantIdは認証扱いしない。
- selectedTenantIdはformat validation後、active membershipで再検証する。
- raw selectedTenantIdをrepositoryやRAG providerのtenant filterとして使わない。
- repositoryへ渡すのは検証済み `AdminTenantContext.tenantId` のみ。

## Relation to RLS

RLS policyは `auth.uid()` を使う。real Auth接続では次が一致している必要がある。

```text
Supabase Auth user.id
= auth.uid()
= staff_users.auth_user_id
```

Loop 096のdummy authenticated role smokeはRLS policyのtenant境界確認であり、Supabase Auth/JWT本接続ではない。service_role smokeはRLS bypass確認であり、production Go判定には使わない。

## Staging Real Auth Smoke Draft

次Loop以降で行う候補:

1. staging projectであることを確認する。
2. dummy Supabase Auth userを作成するか、安全に再利用できるdummy userを選ぶ。
3. Supabase Auth user idを `staff_users.auth_user_id` へidempotentに紐づける。
4. active staff / active membershipをdummy tenantに作る。
5. access tokenを取得しても表示しない。
6. `Authorization: Bearer <redacted>` でAdmin API smokeを行う。
7. `x-selected-tenant-id` あり/なし/wrong tenantを確認する。
8. RLS smokeで `auth.uid()` と `staff_users.auth_user_id` の一致を確認する。
9. write smokeはdummy rowかrollback-onlyに限定する。
10. productionには接続しない。

## Loop 099 Staging Real Auth Smoke Result

Loop 099で以下をstaging dummy dataだけで確認した。

```text
dummy Supabase Auth user
-> Bearer token (not displayed)
-> SupabaseAuthSessionVerifier
-> AuthUserIdentity.authUserId
-> staff_users.auth_user_id
-> active staff_tenant_memberships
-> selectedTenantId revalidation
-> Admin route smoke
-> RLS auth.uid() tenant boundary
```

Result:

- preflight、schema、grants、RLS policy、RLS static verificationは成功。
- dummy Auth user作成とBearer token取得は成功。token値は表示していない。
- real verifierはAuth user idを解決した。
- StaffAuthLookupはactive staff + active membershipを解決した。
- selectedTenantIdのsuccess / missing multiple memberships / wrong tenant / invalid formatを確認した。
- Admin route smokeはcustomers、customer detail、alerts、RAG search、AI reply draftで成功した。
- RAG sourceはtenant scopedかつ `allowed_for_ai=true` のみ。
- RLS smokeではreal Auth user idを `auth.uid()` と一致させ、tenant A/B boundaryを確認した。
- smoke後にdummy Auth userとdummy DB rowsをcleanupした。

Still not done:

- production Auth/JWT runtime connection。
- Admin UI token forwarding。
- LINE real push gate。
- OpenAI real API gate。
- production readiness final gate。

## Loop 101 Admin UI Token Forwarding and Runtime Gate

Loop 101でAdmin UI token forwarding boundaryとproduction Auth runtime gateを追加した。

Implemented:

- Admin API helper can accept an access token provider and forward `Authorization: Bearer` to the Admin API.
- The token is not saved to localStorage, cookie, UI, docs, or dev log.
- Admin helper can suppress the local/dev/test `x-tenant-id` header for production-style requests.
- `x-selected-tenant-id` remains a selector, not permission.
- production mode can use `SupabaseAuthSessionVerifier` when `AUTH_SESSION_VERIFIER=supabase` and a Supabase Auth client-like object plus StaffAuthLookup are explicitly injected.
- Missing runtime dependencies fail safe as `authenticated_staff_required`.

Still not done:

- Real Admin login/session UI.
- Real token acquisition, refresh, or logout.
- Production automatic construction of Supabase Auth client and StaffAuthLookup repository.
- production connection or production smoke.
- LINE/OpenAI real connection.

Loop 100 note:

- Admin UI selectedTenantId persistenceは完了。
- `/select-tenant` は非secretのtenant selectorだけをlocalStorageとcookieへ保存する。
- Admin API helperはcookie由来の値を `x-selected-tenant-id` として送れる。
- Bearer token、API key、Supabase secret、session値は保存・表示しない。
- `selectedTenantId` は権限ではなく、API側のactive membership再検証が必須。

## Go / No-Go

Go:

- stagingだけで実行できる。
- tokenやenv値を表示しない。
- dummy Auth userとdummy staff/membershipが安全に使える。
- Admin API route smokeとRLS smokeの両方でtenant境界を確認できる。

No-Go:

- token、JWT secret、project ref、DB URL、passwordの表示が必要。
- Auth user作成または再利用が安全にできない。
- `staff_users.auth_user_id` に紐づけできない。
- selectedTenantId再検証が曖昧。
- RLS tenant A/B smokeが失敗する。
- production接続の疑いがある。
- migration/RLS/API/UI変更が必要になる。

## Do Not Do

- Supabase Auth/JWT本接続をこのrunbookだけで実施しない。
- Supabase Auth userをこのLoopで作らない。
- production DBへ接続しない。
- `.env.staging` の値を表示しない。
- RLS SQLを変更しない。
- migrationを変更しない。
- LINE/OpenAIを接続しない。
- tokenやkeyをdocs/dev logへ書かない。

## Next Conditions

次へ進む条件:

- Loop 097 task docとこのrunbookが確認済み。
- Loop 098 real verifier boundaryがtest済み。
- Loop 099 staging real Auth smokeが成功済み。
- production readiness remains No-Goを維持できる。

## Related Docs

- [Loop 051: Supabase Auth Session Extraction Boundary](../11_codex_tasks/051_supabase_auth_session_extraction_boundary.md)
- [Loop 052: Fake Authenticated Staff Runtime Connection](../11_codex_tasks/052_fake_authenticated_staff_runtime_connection.md)
- [Loop 087: selectedTenantId Transport Boundary](../11_codex_tasks/087_selected_tenant_transport_boundary.md)
- [Loop 093: Production Dev Header Rejection Auth/JWT Boundary](../11_codex_tasks/093_production_dev_header_rejection_auth_jwt_boundary.md)
- [Loop 096: Authenticated Role JWT RLS Smoke](../11_codex_tasks/096_authenticated_role_jwt_rls_smoke.md)
- [Loop 097: Supabase Auth/JWT Connection Plan](../11_codex_tasks/097_supabase_auth_jwt_connection_plan.md)
- [Loop 098: Supabase Auth Real Verifier Boundary](../11_codex_tasks/098_supabase_auth_real_verifier_boundary.md)
- [Loop 099: Staging Real Auth User Smoke](../11_codex_tasks/099_staging_real_auth_user_smoke.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)
- [Production Hardening Split Plan](production_hardening_split_plan.md)
