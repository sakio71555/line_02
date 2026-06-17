# Loop 097: Supabase Auth/JWT connection plan

## Goal

Loop 096でstaging DB上のauthenticated role / JWT claim相当RLS smokeは成功した。次に実Supabase Auth/JWTへ接続する前に、`Authorization: Bearer`、Supabase Auth user、`staff_users.auth_user_id`、active staff / active membership、`selectedTenantId`、RLS `auth.uid()` の接続順を整理する。

このLoopでは計画と境界確認だけを行う。Supabase Auth/JWT本接続、Supabase Auth user作成、migration/RLS変更、production接続は行わない。

## Scope

- 開始状態を確認する。
- 既存auth boundary、fake verifier、authenticated runtime、StaffAuthLookup、selectedTenantId transport、Loop 096 RLS smokeを棚卸しする。
- real Supabase Auth verifierへ差し替えるときのinterface / contractを整理する。
- staging real Auth smokeのGo/No-Goと手順案を整理する。
- README、database docs、dev loop docs、production hardening runbooks、dev logを更新する。
- docs/static integration testを追加する。

## Out of Scope

- Supabase Auth/JWT本接続。
- Supabase Auth user作成。
- 実JWT発行または実JWT検証。
- RLS SQL / migration / GRANT変更。
- Admin UI selectedTenantId保存。
- API runtime大変更。
- LINE API実送信。
- OpenAI API実接続。
- production DB / production Supabase接続。
- `.env` 作成・変更。
- package依存追加。

## Starting State

- 開始時作業フォルダー: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- 開始時branch: `main...origin/main`
- 開始時 `git status --short`: clean
- 最新commit: `2501f52 test: add authenticated RLS staging smoke`
- Loop 095Bで `packages/db/migrations/0003_rls_core_tables.sql` はstaging DBへ適用済み。
- Loop 096でdummy `request.jwt.claim.sub` によるauthenticated role / JWT claim相当RLS smokeは成功済み。
- 本物Supabase Auth user作成、Supabase Auth/JWT本接続、production接続は未実施。
- production readiness remains No-Go。

## Existing Boundary Inventory

既存の接続候補:

```text
Authorization header
-> apps/api/src/admin/auth-session.ts
-> AuthSessionVerifier.verifyBearerToken(token)
-> AuthUserIdentity
-> StaffAuthLookup
-> resolveAuthenticatedStaffAdminTenantContext
-> active staff + active membership
-> AdminTenantContext(source=authenticated_staff)
-> AdminAction role guard
-> repository/service with verified tenant_id
```

関連境界:

- `apps/api/src/admin/auth-session.ts`: Bearer token抽出とverifier interface。
- `apps/api/src/admin/authenticated-runtime.ts`: verifier結果、selectedTenantId、StaffAuthLookup、role guardを接続する境界。
- `apps/api/src/admin/selected-tenant-transport.ts`: `x-selected-tenant-id` をselectorとして正規化する境界。
- `packages/domain/src/auth-context.ts`: `authUserId` からactive staff / active membershipを解決するpure resolver。
- `packages/db/src/supabase/repositories/staff-auth-lookup-repository.ts`: `staff_users.auth_user_id` とmembershipをSupabaseから読むrepository境界。

## Authorization Bearer Extraction

本接続時の入力は以下に限定する。

```text
Authorization: Bearer <access_token>
```

Rules:

- missing Authorization header: `authenticated_staff_required`
- non-Bearer / malformed Authorization header: `authenticated_staff_required`
- missing token: `authenticated_staff_required`
- invalid token: `authenticated_staff_required`
- expired token: `session_expired`
- token値はlog、error body、docs、dev logに出さない。
- `x-selected-tenant-id` 単体は認証ではない。
- production modeでは `x-tenant-id` / dev_headerは拒否され、Bearer pathだけを使う。

## Supabase Auth User Resolution

real verifier接続時の解決順:

```text
Bearer token
-> Supabase Auth verification
-> Supabase Auth user.id
-> AuthUserIdentity.authUserId
-> staff_users.auth_user_id
-> staff_users.status = active and is_active = true
-> staff_tenant_memberships.status = active
-> selectedTenantId membership revalidation
-> AdminTenantContext.tenantId
```

`staff_users.tenant_id` は互換データであり、本番のtenant authorityはactive `staff_tenant_memberships` とする。複数tenant所属staffは `selectedTenantId` が必要で、選択tenantがactive membership外なら `tenant_membership_denied` とする。

## Fake Verifier vs Real Verifier

| item | fake verifier | real verifier |
| --- | --- | --- |
| purpose | local/test boundary確認 | Supabase Auth access token検証 |
| token validation | fake token mapだけ | Supabase Auth user取得 |
| network | なし | Supabase Authへのserver-side requestが発生しうる |
| user id | fixtureの `authUserId` | Supabase Auth `user.id` |
| invalid token | `authenticated_staff_required` | `authenticated_staff_required` |
| expired token | `session_expired` | `session_expired` |
| token display | 禁止 | 禁止 |

fake verifierは安全なテスト境界として維持する。real verifierは同じ `AuthSessionVerifier` interfaceを実装し、routeやserviceへtoken値を漏らさない。

## Real Verifier Boundary

real verifierのcontract:

- `AuthSessionVerifier.verifyBearerToken(token)` を実装する。
- module import時にenv validation、client生成、network accessを走らせない。
- server-side onlyで利用する。
- browser / LIFF / Next client componentから直接使わない。
- Supabase Auth `getUser` 相当の結果から `AuthUserIdentity.authUserId` を返す。
- token値、JWT、Auth response raw bodyをerror bodyやlogへ出さない。
- missing/invalid/malformedは `authenticated_staff_required` へ寄せる。
- expired sessionは `session_expired` を維持する。
- network failureはsafeなauth failureへ変換し、secretやproject情報を含めない。
- service role keyをAuth verifierのclient側へ出さない。

## StaffAuthLookup Connection

StaffAuthLookupはBearer token検証後の `authUserId` だけを受け取る。

Rules:

- `auth_user_id` で `staff_users` を検索する。
- staffが存在しない場合は `authenticated_staff_required` 相当へ畳む。
- inactive staffは拒否する。
- active membershipsだけを採用する。
- active membershipが0件なら `tenant_membership_denied` 相当へ畳む。
- active membershipが複数ありselectedTenantIdがない場合は `tenant_selection_required`。
- selectedTenantIdがactive membership外なら `tenant_membership_denied`。
- repository/serviceへ渡すtenant_idは、検証済み `AdminTenantContext.tenantId` だけにする。

## selectedTenantId Revalidation

`selectedTenantId` は権限ではなく、staffがどのtenantで操作したいかを示すselectorである。

- `x-selected-tenant-id` はBearerなしでは認証扱いしない。
- format不正は `invalid_selected_tenant_id`。
- selected tenantはactive membershipで必ず再検証する。
- raw selectedTenantIdをrepository filterへ使わない。
- Admin UI selectedTenantId保存は未実装であり、後続Loopで扱う。

## Relation to RLS

Loop 096ではdummy `request.jwt.claim.sub` による `auth.uid()` simulationで、RLS policyがtenant A/B境界を守ることを確認した。

本接続時に必要な一貫性:

```text
Supabase Auth user.id
= access tokenから解決される user.id
= DB session上の auth.uid()
= staff_users.auth_user_id
```

service_role smokeはRLS bypass確認であり、RLS tenant境界の確認ではない。authenticated role smokeはRLS policy挙動確認である。次のreal Auth smokeでは、実Supabase Auth userと `staff_users.auth_user_id` をidempotentに紐づけ、Admin API pathとRLS pathの両方で同じtenant境界になることを確認する。

## Staging Real Auth Smoke Plan

次Loop以降の候補手順:

1. staging projectであることを値非表示helperと人間確認で確認する。
2. dummy staging Supabase Auth userを作る、または安全に再利用できるdummy userを選ぶ。
3. Auth user `id` を `staff_users.auth_user_id` へidempotentに紐づける。
4. active `staff_tenant_memberships` をtenant A/B用に用意する。
5. access tokenを取得してもterminal、docs、dev logへ表示しない。
6. `Authorization: Bearer <redacted>` と `x-selected-tenant-id` でAdmin route smokeを行う。
7. selected tenant A/B、wrong selected tenant、missing selected tenantを確認する。
8. RLS smokeで実Auth user idと `auth.uid()` の一貫性を確認する。
9. productionには接続しない。

## Go / No-Go

Go条件:

- staging projectであることを確認できる。
- tokenやenv値を表示せずに実行できる。
- dummy Auth user方針が明確。
- `staff_users.auth_user_id` へのidempotent紐づけができる。
- active staff / active membership / selectedTenantId再検証が通る。
- RLS smokeがtenant A/B分離を維持する。

No-Go条件:

- token、JWT secret、project ref、DB URL、passwordを表示しないと進められない。
- Auth user作成手順が不明。
- 既存userを安全に使えない。
- `staff_users.auth_user_id` へ紐づけできない。
- RLS smokeが失敗する。
- production接続の疑いがある。
- migration/RLS/API/UI変更が必要になる。

## Not Implemented in This Loop

- Supabase Auth/JWT本接続。
- Supabase Auth user作成。
- real verifier実装。
- Admin UI selectedTenantId保存。
- RLS SQL変更。
- migration変更。
- production接続。
- LINE/OpenAI本接続。

## Test Result

Loop完了時の実行結果を完了報告に記録する。

## Residual Risks

- Supabase Auth user.idと `staff_users.auth_user_id` の実接続smokeは未完了。
- real verifierのnetwork failure / expired token mappingは未実装。
- Admin UI selectedTenantId保存は未完了。
- production readiness remains No-Go。

## Next Loop Candidates

```text
Loop 098: Supabase Auth real verifier boundary
Loop 099: staging real Auth user smoke plan/execution gate
Loop 100: Admin UI selectedTenantId persistence
Loop 101: production readiness final gate
```
