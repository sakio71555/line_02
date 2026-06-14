# Supabase Local Migration Test Runbook

## Purpose

`packages/db/migrations/0001_initial_schema.sql` を本番Supabaseへ接続せずに、local Supabaseまたは安全なlocal PostgreSQLで検証するための手順です。

現時点のruntimeはin-memoryです。このrunbookはSupabase repositoryをruntimeへ接続する前の検証用であり、本番接続手順ではありません。

## Preconditions

- 作業フォルダー: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- 本番Supabase projectへ接続しない。
- `supabase link` を実行しない。
- `supabase login` は不要。
- `.env` を作成・変更しない。
- DB URL、service role key、anon keyなどの具体値をdocsへ書かない。
- 実顧客情報、LINE userId、本番ログをtest dataに使わない。

## Current Loop 026 Result

Loop 026時点では、local migration applyは未実行です。

確認結果:

- Supabase CLI: available, `2.90.0`
- Docker CLI: available, `29.4.3`
- Docker daemon: unavailable
- `psql`: not found
- existing `supabase/` config: not found

このため、今回はSQL validation testを強化し、local applyは後続Loopで扱います。

## If Supabase CLI Is Available

Use this path only after deciding to add local Supabase project config in a dedicated loop.

Checklist:

1. Confirm there is no cloud link:

```bash
git status --short
find . -maxdepth 2 -type d -name "supabase" -print
```

2. Confirm Docker daemon is running:

```bash
docker info
```

3. If local Supabase config is intentionally added later, keep generated files reviewable and commit only stable config. Do not commit local state, containers, volumes, credentials, or `.env`.

4. Start local Supabase only for local verification:

```bash
supabase start
supabase status
```

5. Apply or inspect migration using the local DB only. Do not use cloud project refs.

6. Cleanup local services when finished:

```bash
supabase stop
```

If local state or generated files appear, review with `git status --short` before committing anything.

## If Supabase CLI Is Not Available

Do not install it inside a Loop unless the Loop explicitly permits dependency/tool installation.

Fallback checks:

```bash
npx pnpm@10.12.1 test -- tests/integration/database-schema.test.ts
npx pnpm@10.12.1 test:integration
```

Record the missing tool and the next preparation step in the Loop task doc.

## If `psql` And A Safe Local PostgreSQL Are Available

Use only a disposable local database. Do not use production, staging, or a personal database with unrelated data.

Recommended shape:

```bash
createdb amami_line_crm_migration_test
psql --set ON_ERROR_STOP=1 --dbname amami_line_crm_migration_test \
  --file packages/db/migrations/0001_initial_schema.sql
dropdb amami_line_crm_migration_test
```

Do not write connection strings or credentials to docs.

## Production Connection Prohibited

Never run these during local migration verification:

```bash
supabase link
supabase db push --linked
psql "$SUPABASE_DB_URL"
```

Do not target production DB from automated tests.

## Cleanup

- Stop local Supabase containers with `supabase stop`.
- Drop disposable local PostgreSQL databases after verification.
- Do not commit generated local state.
- Run `git status --short` before commit.

## Common Failures

- Docker daemon unavailable: start Docker Desktop, then rerun `docker info`.
- No `supabase/` config: add local config only in a dedicated setup loop.
- `psql` missing: use Supabase local once Docker works, or install PostgreSQL tooling outside Codex work if approved.
- Migration SQL error: record the error summary, apply the smallest migration fix, and update tests/docs in the same Loop.
- RLS confusion: Loop 026 does not implement RLS SQL. RLS policy SQL and local RLS tests are separate later Loops.

## Next Loop

Recommended next step:

- Loop 027: Supabase auth/staff tenant context plan

RLS SQL and runtime Supabase wiring should wait until local migration verification and auth tenant context are clear.
