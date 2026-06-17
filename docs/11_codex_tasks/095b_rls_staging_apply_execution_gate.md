# Loop 095B: RLS staging apply execution gate

## Goal

Loop 094Aでdraft化し、Loop 095Aでapply計画を整理した `packages/db/migrations/0003_rls_core_tables.sql` をstaging DBへ適用し、DB上でRLSが有効化されたことを確認する。

このLoopはstaging限定です。production DB、Supabase Auth/JWT本接続、LINE/OpenAI本接続、rollback SQL、追加RLS修正には進まない。

## Scope

- 開始状態を確認する。
- `.env.staging` がgitignore対象であることを確認する。
- `.env.staging` を値非表示でverifyする。
- `psql` absolute pathを確認する。
- staging schema verificationを実行する。
- service_role grants verificationを実行する。
- RLS migration static verifierを実行する。
- `packages/db/migrations/0003_rls_core_tables.sql` をstagingへapplyする。
- `scripts/dev-loop/verify-staging-rls-policies.mjs` を追加し、RLS状態を件数/OK/NGだけで検証する。
- customers/messages、alerts、knowledge/RAG staging smokeを再実行する。
- production dev_header rejection testを維持する。
- README、database docs、dev loop docs、runbooks、dev logを更新する。
- lint / typecheck / test / test:integration / buildを実行する。

## Out of Scope

- production DB接続。
- production Supabase接続。
- Supabase Auth/JWT本接続。
- Admin UI selectedTenantId保存。
- LINE API実送信。
- OpenAI API実接続。
- Web crawl。
- embedding / pgvector。
- migration SQLの追加修正。
- `0003_rls_core_tables.sql` の大幅変更。
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
- 最新commit: `f319f07 docs: plan RLS staging apply`
- `.env.staging` は `git check-ignore .env.staging` でignore対象。
- Loop 095AでRLS staging apply planは作成済み。
- production readinessはNo-Go。

## Preflight Result

Preflightはすべて成功した。secret、DB URL、project ref、password、keyは表示していない。

- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging`: passed
- `/usr/local/opt/libpq/bin/psql --version`: `psql (PostgreSQL) 18.4`
- `node scripts/dev-loop/verify-staging-schema.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
  - apply前RLS enabled: `0/12`
  - apply前policies count: `0`
- `node scripts/dev-loop/verify-staging-postgrest-grants.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
- `node scripts/dev-loop/verify-rls-migration-static.mjs`: passed

## Apply Target

```text
packages/db/migrations/0003_rls_core_tables.sql
```

## Apply Result

staging DBへのapplyは成功した。

```text
[ok] staging migration apply completed
[ok] migration file: packages/db/migrations/0003_rls_core_tables.sql
```

`supabase db push`、`supabase migration repair`、`supabase db reset` は実行していない。

## RLS Verification Result

追加helper:

```text
scripts/dev-loop/verify-staging-rls-policies.mjs
```

結果:

- target tables exist: `9/9`
- RLS enabled tables: `9/9`
- FORCE RLS tables: `9/9`
- policies verified: `14/14`
- authenticated policy roles: `14/14`
- policies referencing `auth.uid()`: `14`
- policies referencing `staff_users`: `13`
- policies referencing `staff_tenant_memberships`: `13`
- `knowledge_pages` `allowed_for_ai=true` policy: `1`
- broad anon/public table grants: `0`
- authenticated minimal grants: verified
- service_role grants: remain usable

既存schema helperでもapply後のRLS enabled summaryは `9/12`、policies countは `14` と確認した。`12` はpublic regular tables全体数で、Loop 095BのRLS targetはcore `9` tables。

## Staging Smoke Result

RLS apply後に既存staging smokeを再実行した。

- `node scripts/dev-loop/verify-staging-dummy-data.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
- `node scripts/dev-loop/smoke-staging-customer-message-api.mjs --env .env.staging`: passed
- `node scripts/dev-loop/smoke-staging-alerts-api.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed
- `node scripts/dev-loop/smoke-staging-knowledge-rag-api.mjs --env .env.staging --psql /usr/local/opt/libpq/bin/psql`: passed

LINE real pushは無効、OpenAIはmockのまま。alerts smokeはMockStaffNotifier、knowledge/RAG smokeはMockAiProviderを使う。

## service_role Smoke Limitation

今回のstaging smokeは既存のSupabase runtime bundle / PostgREST service_role前提で確認している。

service_roleはRLS bypass前提のため、このsmokeが通ってもauthenticated role / JWTでRLSが完了したとは扱わない。authenticated role / JWT smokeは後続Loopで実施する。

## Rollback / Recovery

- rollbackは実行していない。
- rollback SQLは作成していない。
- `supabase db reset` は実行していない。
- `supabase migration repair` は実行していない。
- applyとverificationが成功したため、recovery対応は不要。

## Production No-Go

production readiness remains No-Go.

理由:

- Supabase Auth/JWT本接続が未完了。
- authenticated role / JWT smokeが未完了。
- Admin UI selectedTenantId保存が未完了。
- LINE real push gateが未完了。
- OpenAI real API gateが未完了。
- service_role smokeはRLS bypass前提であり、production authorizationの代替ではない。

## Test Result

Loop完了時の実行結果を完了報告に記録する。

## Residual Risks

- authenticated role / JWTでのtenant A/B RLS smokeは未実施。
- `staff_users` / `staff_tenant_memberships` policyの実運用は、実Supabase Auth/JWT接続後に再検証が必要。
- production readinessはNo-Go継続。

## Next Loop

Loop 096: authenticated role / JWT RLS smoke plan.

推奨Scope:

- Supabase Auth/JWT本接続の前に、authenticated roleでRLSを検証する方法を設計する。
- tenant A/Bのauthenticated contextでselect/insert/update境界を確認する。
- service_role bypass smokeとauthenticated role smokeを明確に分ける。
