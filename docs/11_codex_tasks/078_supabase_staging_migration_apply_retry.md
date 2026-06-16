# Loop 078: Supabase Staging Migration Apply Retry

## Goal

Loop 077後に `psql` が使える状態になったため、開始時点の未push commitをpushし、`.env.staging` を値非表示で検証したうえで、`psql` helper経由で `packages/db/migrations/0001_initial_schema.sql` をstaging DBへapplyする。

このLoopではsecret、DB URL、database password、Supabase project ref、`.env.staging` の値を表示しない。RLS SQL、migration SQL変更、API runtime switch、LINE/OpenAI有効化は行わない。

## Scope

- repo状態と `.env.staging` ignore状態を確認する。
- 開始時点の未push commitだけpushする。
- `.env.staging` を値非表示でverifyする。
- `psql` absolute pathを確認する。
- migration apply helperを追加する。
- schema verification helperを追加する。
- helper経由でstaging migration applyを実行する。
- post-apply schema verificationを実行する。
- README、dev loop、staging runbooks、dev logを更新する。
- helper static testsを追加する。
- verification commandsを実行する。
- Loop 078 result commitを作成する。

## Out Of Scope

- secret表示
- DB URL表示
- database password表示
- Supabase project ref表示
- `.env.staging` raw content表示
- production Supabase接続
- migration SQL変更
- RLS SQL実装
- RLS policy追加
- API runtime switch
- repository wiring変更
- Admin API / Admin UI変更
- LINE API実送信
- OpenAI API実接続
- Supabase Auth/JWT実装
- dependency追加
- package.json / pnpm-lock変更
- `supabase link`
- `supabase db push`
- `supabase db reset`
- Loop 078 result commitのpush

## Push Result

- Start branch state for the retry: `main...origin/main`.
- The previously unpushed Loop 076 / Loop 077 commits had already been pushed before this retry resumed.
- No force push, rebase, reset, or stash was used.

## Env Verification Result

- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging`: passed without printing values.
- Required Supabase values: present.
- LINE real push: disabled.
- AI provider: mock.
- Repository runtime: in_memory.

## psql Readiness

| Check | Result |
| --- | --- |
| `command -v psql || true` | no path returned in Codex shell |
| `/usr/local/opt/libpq/bin/psql --version` | available: `psql (PostgreSQL) 18.4` |
| `/opt/homebrew/opt/libpq/bin/psql --version` | not found |
| `supabase --version` | available: `2.90.0` |

## Apply Helper

Added:

```text
scripts/dev-loop/apply-staging-migration.mjs
scripts/dev-loop/lib/staging-psql.mjs
```

The helper reads `.env.staging` without printing values, parses `SUPABASE_DB_URL`, passes connection values to `psql` via `PG*` environment variables, redacts sensitive connection parts from error output, and does not use Supabase CLI apply commands.

## Migration Apply Result

- Apply command executed: yes.
- Apply helper: `scripts/dev-loop/apply-staging-migration.mjs`.
- `psql` path: `/usr/local/opt/libpq/bin/psql`.
- Result: success.
- Secret / DB URL / password / project ref output: no.

## Schema Verification Helper

Added:

```text
scripts/dev-loop/verify-staging-schema.mjs
```

The helper checks expected tables, columns, indexes, and RLS summary without printing connection strings, DB URL, password, or project ref.

## Post-Apply Confirmation

- Expected tables: all confirmed.
- Expected columns: all confirmed.
- Expected indexes: all confirmed.
- Schema verification helper: `scripts/dev-loop/verify-staging-schema.mjs`.

## RLS State

- RLS enabled tables: `0/12`.
- Policies count: `0`.
- RLS SQL is still not implemented.
- Production readiness remains No-Go.

## Runtime / API / UI

- Runtime remains in-memory.
- API routes are not changed.
- Admin UI is not changed.
- DB schema code / migration SQL is not changed.
- LINE/OpenAI are not enabled.

## Test Result

- `git diff --check`: passed.
- `npx pnpm@10.12.1 lint`: passed after importing `URL` from `node:url`.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 52 files / 358 tests.
- `npx pnpm@10.12.1 test:integration`: passed, 52 files / 358 tests.
- `npx pnpm@10.12.1 build`: passed, 10 packages successful. Existing Next.js ESLint plugin warning appeared.

## Push Policy

Loop 078 result commit is not pushed.

## Secret Safety

- Do not record secret values.
- Do not record DB URL.
- Do not record database password.
- Do not record Supabase project ref.
- Do not record `.env.staging` raw content.

## Remaining Risks

- RLS SQL is not implemented.
- Staging runtime switch has not been performed.
- API runtime remains in-memory.
- No dummy seed was applied in this Loop.
- Production remains No-Go until Auth/JWT/RLS/rollback are handled.

## Next Loop Candidates

```text
Loop 079: Supabase staging apply rollback/recovery runbook
Loop 080: Supabase staging customer/message runtime switch preflight
Loop 081: Supabase staging dummy seed plan
```
