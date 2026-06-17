# Loop 095A: RLS staging apply planning / dry-run checklist

## Goal

Loop 094Aで追加した `packages/db/migrations/0003_rls_core_tables.sql` をstagingへ適用する前に、Go/No-Go、dry-run checklist、apply後verification、staging smoke、rollback/recovery方針を整理する。

このLoopではRLS staging applyを実行しない。Supabase実DB接続、`.env.staging` 読み込み、`psql` 実行、migration SQL変更、API/runtime/UI変更も行わない。

## Scope

- 開始状態を確認する。
- Loop 094AのRLS draft、static verifier、既存runbookを確認する。
- RLS staging apply plan/runbookを作成する。
- apply前Go/No-Go checklistを整理する。
- apply予定手順を、次Loop用の予定コマンドとして整理する。
- apply後verification checklistを整理する。
- RLS apply後に必要なstaging smokeを整理する。
- rollback/recovery方針を整理する。
- README、database docs、dev loop docs、production hardening runbooks、dev logを必要最小限更新する。
- docs integration testを追加する。
- `git diff --check`、RLS static verifier、lint/typecheck/test/test:integrationを実行する。

## Out of Scope

- staging DBへのRLS apply。
- production DB接続。
- staging DB接続。
- Supabase実DB接続。
- `psql` でmigration実行。
- `supabase db push` / `supabase migration repair` / `supabase db reset`。
- GRANT / RLS policyの実適用。
- `.env.staging` 読み込み、表示、変更。
- `.env.production` 作成。
- migration SQL変更。
- RLS SQL修正。
- API route / repository / runtime / UI変更。
- Supabase Auth/JWT本接続。
- LINE API実送信。
- OpenAI API実接続。
- package依存追加。

## Starting State

- 作業フォルダー: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- 開始時branch: `main...origin/main`
- 開始時 `git status --short`: clean
- 最新commit: `bee1be1 feat: draft RLS policies for core tables`
- Loop 094Aで `0003_rls_core_tables.sql`、static verifier、static integration testは追加済み。
- staging DBへのRLS applyは未実施。
- production readinessはNo-Go。

## RLS Draft Review

対象migration:

```text
packages/db/migrations/0003_rls_core_tables.sql
```

RLS対象table:

- `tenants`
- `tenant_line_settings`
- `tenant_ai_settings`
- `customers`
- `messages`
- `alerts`
- `knowledge_pages`
- `staff_users`
- `staff_tenant_memberships`

Draft確認結果:

- 上記tableに `enable row level security` と `force row level security` がある。
- `authenticated` role向けpolicyは `auth.uid()::text` を `staff_users.auth_user_id` と照合する。
- `staff_users.status = 'active'` と `staff_users.is_active = true` を必須にする。
- `staff_tenant_memberships.status = 'active'` を必須にする。
- tenant-owned tableはactive membershipの `tenant_id` とrowの `tenant_id` を照合する。
- `tenants` は `tenants.id` とmembership `tenant_id` を照合する。
- `staff_users` は自分のactive staff rowだけをselectする。
- `staff_tenant_memberships` は自分のactive membershipsだけをselectする。
- `knowledge_pages` は `allowed_for_ai = true` もselect条件に含める。
- `anon` / `public` へのgrant/policyはない。
- `grant all`、`on all tables`、`using true`、`with check true` は静的検証で禁止している。
- `0003` は `service_role` grantを変更しない。Loop 079.1の `0002_service_role_postgrest_grants.sql` を壊さない方針。

## Apply前 Go Checklist

次LoopでRLS staging applyへ進む前に、以下がすべて満たされること。

- `git status --short` がclean。
- 最新commitがLoop 094A/095A以降で、RLS draftとapply planがpush済み。
- `.env.staging` がgit管理対象ではない。
- `.env.staging` の値を表示しない運用が確認済み。
- `psql` absolute pathが確認済み。
- `verify-staging-env` が値非表示で成功する見込み。
- `verify-staging-schema` が成功する見込み。
- `verify-staging-postgrest-grants` が成功する見込み。
- `node scripts/dev-loop/verify-rls-migration-static.mjs` が成功。
- RLS対象tableがstaging schemaに存在する。
- `0003_rls_core_tables.sql` が未適用であることを確認する方法がある。
- `0003` のpartial applyを検出した場合の停止条件がある。
- apply後verification checklistが定義済み。
- staging smoke checklistが定義済み。
- rollback/recovery方針が定義済み。
- apply中にsecret、project ref、DB URL、password、keyを表示しないhelperを使う。

## Apply前 No-Go 条件

1つでも当てはまる場合はRLS applyへ進まない。

- `.env.staging` がgit管理対象。
- DB URL、key、password、project refを表示しないと進められない。
- `0003` が既に部分適用されている疑いがある。
- schema verificationが失敗。
- service_role grants verificationが失敗。
- RLS static verificationが失敗。
- `psql` absolute pathが使えない。
- production接続の疑いがある。
- rollback/recovery方針がない。
- apply後verification項目が未定義。
- Supabase Auth/JWT本接続やAPI/runtime変更が必要になる。

## Apply予定手順

以下は次Loop用の予定コマンドであり、Loop 095Aでは実行しない。

```bash
node scripts/dev-loop/verify-staging-env.mjs --file .env.staging
/usr/local/opt/libpq/bin/psql --version
node scripts/dev-loop/verify-staging-schema.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql
node scripts/dev-loop/verify-staging-postgrest-grants.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql
node scripts/dev-loop/verify-rls-migration-static.mjs
node scripts/dev-loop/apply-staging-migration.mjs \
  --env .env.staging \
  --migration packages/db/migrations/0003_rls_core_tables.sql \
  --psql /usr/local/opt/libpq/bin/psql
```

Codex shellでは `~/.zshrc` が読み込まれない可能性があるため、次Loopでは `command -v psql` だけでなく以下も確認する。

```text
/usr/local/opt/libpq/bin/psql
/opt/homebrew/opt/libpq/bin/psql
```

## Apply後 Verification Checklist

RLS apply後、次Loopで以下を確認する。

- RLS enabled tables countが想定table数と一致する。
- force RLS enabled table countが想定table数と一致する。
- policies countが想定以上である。
- policies対象table一覧にcore target tablesが含まれる。
- `anon` に広範grantがない。
- `authenticated` に必要最小限grantのみがある。
- `service_role` grantsが残っている。
- service_role grants recoveryの状態がRLS apply後も維持されている。
- `customers` / `messages` / `alerts` / `knowledge_pages` がRLS有効。
- `staff_users` / `staff_tenant_memberships` がRLS有効。
- `knowledge_pages` select policyに `allowed_for_ai = true` がある。
- `auth.uid()::text` と `staff_users.auth_user_id` の照合がpolicyに残っている。
- active `staff_users` と active `staff_tenant_memberships` の条件がpolicyに残っている。

次Loopで作る候補helper:

```text
scripts/dev-loop/verify-staging-rls-policies.mjs
```

ただし、helper作成と実DB接続は次LoopのScopeで改めて判断する。

## RLS Apply後 Staging Smoke Checklist

RLS apply後は、service_role smokeだけではRLS確認にならない。service_roleはRLS bypass前提のため、authenticated role / JWT smokeを別途必要とする。

次Loop以降で確認する項目:

- staging schema verification。
- staging service_role grants verification。
- staging RLS policy verification。
- customers/messages smoke。
- alerts smoke。
- knowledge/RAG smoke。
- authenticated_staff route smoke。
- production dev_header rejection test。
- tenant Aのauthenticated contextでtenant B rowが読めないこと。
- tenant Aのauthenticated contextでtenant B rowをinsert/updateできないこと。
- `anon` がcore CRM tablesへアクセスできないこと。
- `allowed_for_ai=false` knowledgeがRAG sourceにならないこと。

RLS apply後も、Supabase Auth/JWT本接続とauthenticated JWT smokeが完了するまではproduction Goにしない。

## Rollback / Recovery

RLS apply失敗時の方針:

- 勝手に `supabase db reset` しない。
- `supabase migration repair` を勝手に実行しない。
- rollback SQLをその場で雑に書かない。
- partial apply疑いはNo-Goとして停止する。
- productionには触らない。
- RLS enable後にAPI smokeが失敗した場合、policy、grant、auth role、service_roleのどれが原因か切り分ける。
- rollbackが必要なら別Loopで明示許可を取る。

rollback候補は方針としてのみ記録する。

- staging projectを作り直す。
- explicit rollback migrationを別Loopで作る。
- policyをdropしてRLSをdisableするrollbackを別Loopで明示許可のもと作る。

## Why No Staging Apply In Loop 095A

Loop 095Aはplanning / dry-run checklist Loopである。

RLS applyはDB権限を締める変更であり、secret非表示、partial apply検出、RLS verification、smoke、rollback/recoveryを揃えてから実行する必要がある。計画作成とapplyを同じLoopで混ぜると、失敗時の切り分けとrollback判断が曖昧になるため、今回applyしない。

## Production No-Go

production readiness remains No-Go.

理由:

- `0003_rls_core_tables.sql` はstaging未apply。
- RLS runtime behaviorは未検証。
- Supabase Auth/JWT本接続は未実装。
- authenticated role / JWT smokeは未実施。
- Admin UI selectedTenantId保存は未実装。
- LINE real push gateは未実装。
- OpenAI real API gateは未実装。

## Test Result

Loop完了時の実行結果を完了報告に記録する。

## Residual Risks

- RLS SQLはDB上で未実行のため、実際のpolicy挙動、recursive policy、PostgREST role挙動は未検証。
- `staff_users` / `staff_tenant_memberships` をpolicy内で参照する構成は、staging apply後にpermissionやrecursionを確認する必要がある。
- authenticated role verification helperはまだ未作成。
- rollback SQLはまだ作っていない。
- production readinessはNo-Go継続。

## Next Loop

Loop 095B: RLS staging apply execution gate.

推奨Scope:

- `.env.staging` の値非表示verification。
- `psql` absolute path確認。
- schema / grants / RLS static verification。
- `0003` 未適用確認。
- Go/No-Go判定。
- Goの場合だけstagingへ `0003_rls_core_tables.sql` をapply。
- apply後RLS verification helperでpolicy状態を確認。
- production No-Goを維持。
