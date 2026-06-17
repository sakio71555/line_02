# Loop 099: staging real Auth user smoke execution gate

## Goal

Loop 098で追加した `SupabaseAuthSessionVerifier` を、stagingの実Supabase Auth dummy user、`staff_users.auth_user_id`、active membership、selectedTenantId再検証、RLS `auth.uid()` と一連でsmoke確認する。

このLoopはstaging smoke execution gateであり、production接続、RLS SQL変更、Admin UI変更、LINE/OpenAI本接続は行わない。

## Scope

- `.env.staging` を値非表示で検証する。
- psql absolute pathを確認する。
- staging schema / grants / RLS policy / RLS static verifierを確認する。
- staging Supabase Authにdummy userを作成し、Bearer tokenを取得する。
- Bearer tokenは表示・記録しない。
- `SupabaseAuthSessionVerifier` でtokenから `AuthUserIdentity.authUserId` を解決する。
- `staff_users.auth_user_id` とactive `staff_tenant_memberships` をdummy seedで接続する。
- Admin route smokeでselectedTenantId再検証とtenant A/B分離を確認する。
- RLS smokeで実Auth user idが `auth.uid()` と一致し、tenant A/B境界が効くことを確認する。
- smoke後にdummy Auth userとdummy DB rowsをcleanupする。

## Out of Scope

- production DB / production Supabase接続。
- 本番Auth user作成。
- 実顧客情報、実LINE userId、実メール、実電話、実住所の投入。
- RLS SQL / migration / GRANT変更。
- Admin UI selectedTenantId保存。
- LINE API実送信。
- OpenAI API実接続。
- package依存追加。

## Starting State

- 開始時作業フォルダー: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- 開始時branch: `main...origin/main`
- 開始時 `git status --short`: clean
- 最新commit: `86f55b4 feat: add Supabase Auth verifier boundary`
- Loop 098でreal verifier boundaryはfake Supabase auth clientで検証済み。

## Added Helper

追加:

```text
scripts/dev-loop/smoke-staging-real-auth-api.mjs
tests/integration/staging-real-auth-api-smoke.test.ts
```

`smoke-staging-real-auth-api.mjs` はpreflightを実行した後、`RUN_STAGING_REAL_AUTH_SMOKE=1` でstaging smoke testを明示実行する。通常の `pnpm test` では実Supabase接続部分はskipされる。

## Preflight Result

成功:

- `.env.staging` verification。
- `/usr/local/opt/libpq/bin/psql --version`。
- staging schema verification。
- service_role grants verification。
- RLS policy verification。
- RLS migration static verification。

値は表示していない。

## Dummy Auth User Policy

- smoke用dummy Supabase Auth userをruntime生成した。
- dummy email / password / Bearer tokenは表示していない。
- Auth user作成後、`staff_users.auth_user_id` にdummy user idを紐づけた。
- smoke開始時に過去の `staging-real-auth-smoke` dummy userと `real_auth` dummy DB rowsをcleanupする。
- smoke終了時に当該runのdummy Auth userとdummy DB rowsをcleanupする。

## Real Verifier Smoke Result

成功:

```text
Bearer token
-> SupabaseAuthSessionVerifier
-> Supabase Auth user.id
-> AuthUserIdentity.authUserId
```

invalid tokenはsafe errorとして扱い、token値はresponse / console / docsに出さない。

## StaffAuthLookup Result

成功:

```text
AuthUserIdentity.authUserId
-> staff_users.auth_user_id
-> active staff
-> active staff_tenant_memberships
```

single-tenant dummy userとmulti-tenant dummy userを分け、active membership解決と複数membership時のtenant selectionを確認した。

## selectedTenantId Result

成功:

- matching `x-selected-tenant-id` は成功。
- selectedTenantIdなし + multiple memberships は `tenant_selection_required`。
- membership外tenantは `tenant_membership_denied`。
- invalid selectedTenantIdは `invalid_selected_tenant_id`。
- `x-selected-tenant-id` 単体は認証として扱わない。

staging non-production runtimeではBearerなし + selectedTenantIdのみのfallback errorは `missing_tenant_id` になる。productionではLoop 093のguardによりBearer必須になる。

## Admin Route Smoke Result

成功:

- `GET /api/admin/customers`
- `GET /api/admin/customers/:customerId`
- `GET /api/admin/alerts`
- `POST /api/admin/rag/search`
- `POST /api/admin/customers/:customerId/ai-reply-draft`

AI routeはMockAiProviderのまま。LINE/OpenAIは呼ばない。

## RLS / Tenant Boundary Result

成功:

- real Auth user idを `request.jwt.claim.sub` に設定し、`auth.uid()` と一致することを確認。
- tenant A userはtenant A customer / allowed knowledgeを読める。
- tenant A userはtenant B customer / tenant B knowledgeを読めない。
- `allowed_for_ai=false` knowledgeは同tenantでも読めない。

service_role repository smokeはRLS bypass前提のため、RLS確認はauthenticated role + real Auth user idで別途確認した。

## Cleanup Result

成功:

- smoke runのdummy Auth userは削除した。
- smoke runのdummy DB rowsは削除した。
- 次回開始時にもstale dummy cleanupを実行する。

## Tests

追加した通常test:

- smoke helperが明示実行型であること。
- helperが危険なSupabase CLI操作を含まないこと。
- helper/testがLINE/OpenAIを有効化しないこと。
- token/passwordをconsole出力するpatternがないこと。

実staging smoke:

```text
node scripts/dev-loop/smoke-staging-real-auth-api.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql
```

成功:

- 1 file passed / 2 tests passed。

## Not Implemented

- production runtimeへのAuth/JWT接続。
- Admin UI selectedTenantId保存。
- LINE real push gate。
- OpenAI real API gate。
- production readiness final判定。

## Production No-Go

production readiness remains No-Go.

理由:

- staging real Auth smokeは成功したが、production Auth/JWT接続は未実装。
- Admin UI selectedTenantId保存は未完了。
- LINE real push gateは未完了。
- OpenAI real API gateは未完了。
- production最終Go/No-Go gateは未実施。

## Residual Risks

- real Auth smokeはstaging dummy user限定。
- production環境のAuth project/user/staff mappingは未検証。
- Admin UIはまだselectedTenantIdを保存・送信する本番導線へ接続していない。
- LINE/OpenAI real provider gatesは未実装。

## Next Loop Candidates

```text
Loop 100: Admin UI selectedTenantId persistence
Loop 101: LINE real push gate
Loop 102: OpenAI real API gate
Loop 103: production readiness final gate
```
