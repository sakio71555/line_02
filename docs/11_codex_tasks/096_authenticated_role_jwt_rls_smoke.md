# Loop 096: authenticated role / JWT RLS smoke

## Goal

Loop 095Bでstaging DBへ適用した `packages/db/migrations/0003_rls_core_tables.sql` について、`service_role` bypassではなく `authenticated` role + `auth.uid()` 相当のJWT claimでtenant分離が効くことをstaging DB上で確認する。

このLoopはstaging限定です。production DB、Supabase Auth/JWT本接続、Supabase Auth user作成、LINE/OpenAI本接続、RLS SQL修正、rollbackには進まない。

## Scope

- 開始状態を確認する。
- `.env.staging` を値非表示でverifyする。
- `psql` absolute pathを確認する。
- staging schema verificationを実行する。
- service_role grants verificationを実行する。
- staging RLS policy verificationを実行する。
- RLS migration static verifierを実行する。
- `scripts/dev-loop/seed-staging-rls-smoke-data.mjs` を追加し、dummy staff / tenant / rowだけをidempotentにseedする。
- `scripts/dev-loop/smoke-staging-authenticated-rls.mjs` を追加し、`SET LOCAL ROLE authenticated` と `request.jwt.claim.sub` でRLSを検証する。
- tenant A/B read separation、inactive staff / inactive membership、`knowledge_pages.allowed_for_ai`、rollback-only write smokeを確認する。
- README、database docs、dev loop docs、production hardening runbooks、dev logを更新する。
- lint / typecheck / test / test:integration / buildを実行する。

## Out of Scope

- production DB接続。
- production Supabase接続。
- Supabase Auth/JWT本接続。
- Supabase Auth user作成。
- Admin UI selectedTenantId保存。
- LINE API実送信。
- OpenAI API実接続。
- Web crawl。
- embedding / pgvector。
- migration SQLの追加修正。
- `0003_rls_core_tables.sql` の変更。
- rollback SQL作成。
- rollback SQL実行。
- `supabase db reset`。
- `supabase migration repair`。
- `supabase db push`。
- `.env.production` 作成。
- package依存追加。

## Starting State

- 開始時作業フォルダー: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- 開始時branch: `main...origin/main`
- 開始時 `git status --short`: clean
- 最新commit: `844399a docs: record RLS staging apply`
- `.env.staging` は `git check-ignore .env.staging` でignore対象。
- Loop 095BでRLS staging applyは成功済み。
- production readinessはNo-Go。

## Preflight Result

Preflightはすべて成功した。secret、DB URL、project ref、password、keyは表示していない。

- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging`: passed
- `/usr/local/opt/libpq/bin/psql --version`: `psql (PostgreSQL) 18.4`
- `node scripts/dev-loop/verify-staging-schema.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
  - RLS enabled summary: `9/12`
  - policies count: `14`
- `node scripts/dev-loop/verify-staging-postgrest-grants.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
- `node scripts/dev-loop/verify-staging-rls-policies.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
- `node scripts/dev-loop/verify-rls-migration-static.mjs`: passed

## Smoke Method

追加helper:

```text
scripts/dev-loop/seed-staging-rls-smoke-data.mjs
scripts/dev-loop/smoke-staging-authenticated-rls.mjs
```

`smoke-staging-authenticated-rls.mjs` は以下の方式で確認する。

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '<dummy-auth-user-id>', true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
-- SELECT / write smoke
ROLLBACK;
```

`auth.uid()` は `request.jwt.claim.sub` から解決され、`staff_users.auth_user_id` と照合される。実Supabase Auth user作成や実JWT発行は行っていない。

## Dummy Seed

`seed-staging-rls-smoke-data.mjs` で以下をidempotentにseedした。

- tenants: `tenant_rls_a`, `tenant_rls_b`
- staff: `staff_rls_a`, `staff_rls_b`, `staff_rls_inactive`
- dummy auth_user_id:
  - `11111111-1111-1111-1111-111111111111`
  - `22222222-2222-2222-2222-222222222222`
  - `33333333-3333-3333-3333-333333333333`
- active membership:
  - staff A -> tenant A
  - staff B -> tenant B
- inactive / denied cases:
  - staff B -> tenant A disabled membership
  - inactive staff -> tenant A active membership
- dummy customers/messages/alerts/knowledge_pages

実顧客情報、実メール、実電話番号、実住所、実LINE userId、本物Supabase Auth userは使っていない。

## Tenant A/B Read Separation

authenticated role smoke結果:

- auth uid A:
  - tenant A customer/message/alert/allowed knowledge: readable
  - tenant B customer/message/alert/knowledge: not readable
- auth uid B:
  - tenant B customer/message/alert/allowed knowledge: readable
  - tenant A customer: not readable

## Inactive Staff / Membership

authenticated role smoke結果:

- inactive staffは自分のstaff rowを読めない。
- inactive staffはtenant A customerを読めない。
- inactive staffはtenant A membershipを読めない。
- active staff Bのtenant A disabled membershipは読めない。

## Knowledge Pages

authenticated role smoke結果:

- same tenantかつ `allowed_for_ai=true`: readable
- same tenantでも `allowed_for_ai=false`: not readable
- other tenant knowledge: not readable

## Write Smoke

write smokeは `BEGIN ... ROLLBACK` transaction内だけで実施した。

- tenant A staffによるtenant A customer insert: allowed
- tenant A staffによるtenant A customer update: allowed
- tenant A staffによるtenant B customer update: no rows
- tenant A staffによるtenant B customer insert: denied

write smokeはdummy rowsのみを使い、commitしていない。

## service_role Smokeとの差分

- service_role smoke:
  - RLS bypass前提。
  - 既存Supabase runtime bundleとPostgREST service_role grantsが壊れていないことを確認する。
- authenticated role / JWT smoke:
  - `auth.uid()` とactive staff / active membership policyそのものがtenant境界を守ることを確認する。

Loop 096によりservice_role smokeだけでは不足していたRLS policy挙動を補完した。ただしSupabase Auth/JWT本接続は未実施のためproduction Goにはしない。

## Test Result

Loop完了時の実行結果を完了報告に記録する。

## Production No-Go

production readiness remains No-Go.

理由:

- Supabase Auth/JWT本接続が未完了。
- 実Supabase Auth userと `staff_users.auth_user_id` の接続smokeが未完了。
- Admin UI selectedTenantId保存が未完了。
- LINE real push gateが未完了。
- OpenAI real API gateが未完了。
- production apply / production DB verificationは未実施。

## Residual Risks

- stagingではdummy `request.jwt.claim.sub` simulationで確認したが、本物Supabase Auth/JWT verifierは未接続。
- production向けには実Auth user、session、selectedTenantId保存、role guard、RLSを組み合わせた追加smokeが必要。
- production readinessはNo-Go継続。

## Next Loop

Loop 097: Supabase Auth/JWT connection planning.

推奨Scope:

- 実Supabase Auth/JWT verifier接続前のGo/No-Goを整理する。
- 本物Auth user作成、staging Auth user seed、Admin API verifier接続を分割する。
- production dev_header rejectionとselectedTenantId transportとの接続順を確認する。
