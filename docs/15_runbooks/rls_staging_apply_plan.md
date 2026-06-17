# RLS Staging Apply Plan

## Purpose

Loop 094Aで追加したRLS migration draft `packages/db/migrations/0003_rls_core_tables.sql` を、次Loopでstagingへ安全に適用するためのGo/No-Go、dry-run、verification、smoke、rollback/recovery手順を整理する。

このrunbookはstaging apply前の計画です。Loop 095Aではstaging DBへapplyしません。

## Audience

- RLS staging applyを実行する開発者
- RLS apply前にGo/No-Goを判断する人
- apply後verificationとsmokeを確認する人
- rollback/recovery判断を行う人

## Target Migration

```text
packages/db/migrations/0003_rls_core_tables.sql
```

Loop 095Aではこのmigrationを実行しない。次Loopで明示許可がある場合のみ、stagingに限定して適用する。

## Target Tables

RLS draft対象:

- `tenants`
- `tenant_line_settings`
- `tenant_ai_settings`
- `customers`
- `messages`
- `alerts`
- `knowledge_pages`
- `staff_users`
- `staff_tenant_memberships`

## Preconditions

- 作業フォルダーが `/Users/sakio/Desktop/PROJECT/amami-line-crm`。
- `git status --short` がclean。
- Loop 094A commit以降のRLS draftが存在する。
- Loop 095A runbookが存在する。
- `.env.staging` はgit管理対象外。
- `.env.staging` の値を表示しない。
- staging projectであることをsecret非表示の方法で確認できる。
- production projectではないことを確認できる。
- `psql` absolute pathが確認できる。
- schema verification、PostgREST grants verification、RLS static verificationをapply前に実行できる。
- rollback/recovery方針を読んでいる。

## Go Checklist

以下がすべて満たされる場合だけ、次Loopでapplyに進む。

- `git status --short` がclean。
- `.env.staging` がgit管理対象ではない。
- `.env.staging` の値、DB URL、password、Supabase key、project refを表示していない。
- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging` が成功する。
- `psql` absolute pathで `--version` が確認できる。
- `node scripts/dev-loop/verify-staging-schema.mjs --env .env.staging --psql <psql-path>` が成功する。
- `node scripts/dev-loop/verify-staging-postgrest-grants.mjs --env .env.staging --psql <psql-path>` が成功する。
- `node scripts/dev-loop/verify-rls-migration-static.mjs` が成功する。
- target tablesがstaging schemaに存在する。
- `0003_rls_core_tables.sql` が未適用であることを確認する方法がある。
- partial apply疑いの停止条件がある。
- apply後verification項目が定義済み。
- staging smoke項目が定義済み。
- rollback/recovery方針が定義済み。

## No-Go Conditions

以下が1つでもある場合はapplyしない。

- `.env.staging` がgit管理対象。
- secret、DB URL、password、key、project refを表示しないと進められない。
- production接続の疑いがある。
- `psql` absolute pathが使えない。
- schema verificationが失敗。
- PostgREST grants verificationが失敗。
- RLS static verificationが失敗。
- `0003` が既に部分適用されている疑いがある。
- apply後verificationを実行できない。
- rollback/recovery方針が未確認。
- RLS SQL修正、API/runtime/UI変更、Supabase Auth/JWT本接続が必要になる。

## Planned Commands

以下は次Loop用の予定コマンドです。Loop 095Aでは実行しない。

```bash
git status --short
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

Codex shellでは `~/.zshrc` が読み込まれない可能性があるため、次Loopで `psql` を探す順序は以下にする。

```text
1. command -v psql
2. /usr/local/opt/libpq/bin/psql
3. /opt/homebrew/opt/libpq/bin/psql
```

`psql` pathはsecretではないので記録してよい。ただし `.env.staging` の値は表示しない。

## Secret Non-Disclosure Rules

以下をterminal、README、docs、dev log、commit message、screenshotへ書かない。

- `SUPABASE_DB_URL` 実値。
- `SUPABASE_SERVICE_ROLE_KEY` 実値。
- `SUPABASE_ANON_KEY` 実値。
- `SUPABASE_URL` 実値。
- database password。
- project ref。
- JWT secret。
- LINE token。
- OpenAI key。
- 実顧客情報。
- 実LINE userId。

## Apply後 Verification Checklist

RLS apply後に確認する。

- RLS enabled tables count。
- force RLS enabled table count。
- policies count。
- policies対象table一覧。
- `anon` に広範grantがないこと。
- `authenticated` に必要最小限grantのみがあること。
- `service_role` grantsが残っていること。
- service_role grants recoveryの状態がRLS apply後も維持されていること。
- `customers` / `messages` / `alerts` / `knowledge_pages` がRLS有効。
- `staff_users` / `staff_tenant_memberships` がRLS有効。
- `knowledge_pages` policyに `allowed_for_ai = true` があること。
- `auth.uid()::text` が `staff_users.auth_user_id` と照合されること。
- active staff / active membership条件があること。

次Loopで作る候補:

```text
scripts/dev-loop/verify-staging-rls-policies.mjs
```

## Staging Smoke Checklist

RLS apply後に確認する。

- staging schema verification。
- staging grants verification。
- staging RLS policy verification。
- customers/messages smoke。
- alerts smoke。
- knowledge/RAG smoke。
- authenticated_staff route smoke。
- production dev_header rejection test。
- tenant Aのauthenticated contextでtenant B rowが読めない。
- tenant Aのauthenticated contextでtenant B rowを書けない。
- `anon` がcore CRM tablesへ直接アクセスできない。

注意:

- service_roleはRLS bypass前提。
- service_role smokeだけではRLS確認にならない。
- authenticated role / JWT smokeは別途必要。
- RLS apply後もSupabase Auth/JWT本接続が終わるまでproduction Goにしない。

## Rollback / Recovery

失敗時の基本方針:

- 勝手に `supabase db reset` しない。
- 勝手に `supabase migration repair` しない。
- rollback SQLをその場で雑に書かない。
- partial apply疑いはNo-Goとして停止する。
- productionには触らない。
- secret値を表示しない。
- RLS enable後にAPI smokeが失敗した場合は、policy / grant / auth role / service_roleを切り分ける。
- rollbackが必要なら別Loopで明示許可を取る。

rollback候補:

- staging projectを作り直す。
- explicit rollback migrationを別Loopで作る。
- policyをdropしてRLSをdisableするrollbackを別Loopで明示許可のもと作る。

## Do Not Do

- staging DBへapplyしないまま、apply済みとして記録しない。
- production DBへ接続しない。
- `.env.staging` の中身を表示しない。
- `supabase db reset` を実行しない。
- `supabase db push` を実行しない。
- `supabase migration repair` を実行しない。
- rollback SQLを即席で作らない。
- RLS SQLをこのrunbook更新中に修正しない。
- Supabase Auth/JWT本接続を混ぜない。
- API/runtime/UI変更を混ぜない。
- LINE/OpenAI実接続を混ぜない。

## Next Conditions

次Loopへ進む条件:

- このrunbookとLoop 095A task docが存在する。
- RLS static verifierが成功している。
- lint/typecheck/test/test:integrationが成功している。
- staging applyは未実施である。
- Supabase実DB接続は未実施である。
- production readinessはNo-Go継続である。

## Related Docs

- [Loop 094A: RLS SQL Draft Review](../11_codex_tasks/094a_rls_sql_draft_review.md)
- [Loop 095A: RLS Staging Apply Plan](../11_codex_tasks/095a_rls_staging_apply_plan.md)
- [RLS/Auth Production Readiness](rls_auth_production_readiness.md)
- [Production Hardening Split Plan](production_hardening_split_plan.md)
- [Supabase Staging Rollback / Recovery](supabase_staging_rollback_recovery.md)
- [Supabase Staging Verification Final Record](supabase_staging_verification_final_record.md)
