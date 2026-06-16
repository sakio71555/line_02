# Loop 079.1: Staging PostgREST Service Role Grants Recovery

## Goal

Loop 079 attemptで発生した Supabase REST / PostgREST 経由の `42501 permission denied` を、staging DBの `service_role` 向けGRANT補正で回復する。

今回の対象はstagingのみ。production接続、RLS SQL、Auth/JWT、LINE/OpenAI本接続は行わない。

## Scope

- Loop 079 attemptのdirty差分を保持する。
- secret混入がないことを確認する。
- No-Go原因を整理する。
- `service_role` 向けGRANT migrationを追加する。
- psql helper経由でstaging DBへGRANT migrationを適用する。
- GRANT verification helperを追加する。
- staging API smokeを再実行する。
- docs / runbook / dev logを更新する。
- lint / typecheck / test / integration / buildを実行する。
- 成功時のみcommit / pushする。

## Out Of Scope

- production Supabase接続
- production key利用
- real customer data投入
- real LINE userId投入
- RLS SQL実装
- RLS policy追加
- Supabase Auth/JWT実装
- selectedTenantId transport実装
- production dev_header rejection実装
- LINE API実送信
- OpenAI API実接続
- Web crawl実行
- `supabase db reset`
- `supabase migration repair`
- `supabase link`
- `supabase db push`
- force push / reset / stash

## No-Go Cause

Loop 079 attempt results:

```text
direct psql:
  migration apply / seed / verification succeeded

Supabase REST / PostgREST:
  customers.listByTenant failed with 42501 permission denied
```

推定原因:

```text
public schema / core tables に対する service_role のGRANT不足
```

## Grant Policy

追加したmigration:

```text
packages/db/migrations/0002_service_role_postgrest_grants.sql
```

GRANT scope:

- `grant usage on schema public to service_role`
- `grant select, insert, update, delete` on core staging tables to `service_role`
- `grant usage, select on all sequences in schema public to service_role`

禁止したこと:

- broad `anon` table grant
- broad `authenticated` table grant
- RLS SQL
- RLS policy

## Grant Apply Result

Applied with:

```text
node scripts/dev-loop/apply-staging-migration.mjs --env .env.staging --migration packages/db/migrations/0002_service_role_postgrest_grants.sql --psql /usr/local/opt/libpq/bin/psql
```

Result:

- staging migration apply completed.
- psql path: `/usr/local/opt/libpq/bin/psql`
- DB URL / project ref / password / env values were not printed.

## Grant Verification Result

Added:

```text
scripts/dev-loop/verify-staging-postgrest-grants.mjs
```

Result:

- `service_role` has usage on public schema.
- `service_role` can select/insert/update/delete core staging tables.
- broad `anon` table DML grant was not detected.
- broad `authenticated` table DML grant was not detected.

## API Smoke Result

Re-ran:

```text
node scripts/dev-loop/smoke-staging-customer-message-api.mjs --env .env.staging
```

Result:

- dummy data verification passed.
- staging API smoke passed.
- customer list/detail/timeline succeeded.
- staff reply saved as message.
- AI summary saved as message.
- restart-equivalent app instance could read persisted timeline.

## Default In-Memory

- default runtime remains `in_memory`.
- `.env.staging` safety verification still requires `REPOSITORY_RUNTIME=in_memory`.
- Supabase runtime is used only by explicit injected customer/message bundle in staging smoke.
- Existing local demo path remains unchanged.

## RLS / LINE / OpenAI State

- RLS enabled tables: `0/12`.
- Policies count: `0`.
- RLS SQL is not implemented.
- LINE real push remains disabled.
- OpenAI remains mock.

## Test / Build Result

Final command results:

- `git diff --check`: passed.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed.
- `npx pnpm@10.12.1 test:integration`: passed.
- `npx pnpm@10.12.1 build`: passed.

## Remaining Risks

- RLS/Auth/JWT remain future work.
- service_role bypasses RLS by design, so repository tenant filters and future RLS tests are both required before production.
- production dev header rejection remains future work.
- alerts/knowledge/staff/auth runtime switch remains future work.

## Next Loop Candidates

```text
Loop 080: RLS/Auth production readiness plan
Loop 081: Supabase alerts/knowledge staging runtime plan
Loop 082: staging manual verification checklist update
```
