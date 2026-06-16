# Loop 077: psql Availability Setup / Apply Preflight

## Goal

Loop 076で `psql` が使えずstaging migration applyがNo-Goになったため、Supabase staging apply再試行の前に `psql` availabilityを安全に確認し、作業者が手動で準備するためのrunbookを追加する。

今回のLoopではSupabase接続、DB接続、migration apply、install、runtime/API/UI/DB変更、git pushは行わない。

## Initial State

- Work folder: `/Users/sakio/Desktop/PROJECT/amami-line-crm`
- Initial `git status --short`: clean
- Initial branch: `main...origin/main [ahead 1]`
- Latest commit before Loop 077: `b2f8fd6 docs: record Supabase migration apply no-go`
- `.env.staging` git ignore check: passed.

## Scope

- `.env.staging` を値非表示scriptでverifyする。
- `psql` availabilityを確認する。
- Supabase CLI versionのみ確認する。
- `psql` がない場合のNo-Go理由を記録する。
- `psql` 手動準備runbookを追加する。
- `psql` readiness scriptを追加する。
- docs/static testを追加する。
- README、dev loop、staging runbooks、dev logを更新する。
- verification commandsを実行する。
- commitする。

## Out Of Scope

- Supabase接続
- `psql` でのDB接続
- migration apply
- `supabase link`
- `supabase db push`
- `supabase db reset`
- `supabase start`
- install実行
- `brew install`
- Postgres.app install
- OS設定変更
- PATH恒久変更
- `.env` / `.env.local` / `.env.production` 作成・変更
- `.env.staging` の中身表示
- migration SQL変更
- RLS SQL実装
- API runtime switch
- repository wiring変更
- Admin API / Admin UI変更
- LINE API実送信
- OpenAI API実接続
- dependency追加
- package.json / lockfile変更
- git push

## Env Verification Result

- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging`: passed without printing values.
- Required Supabase values: present.
- LINE real push: disabled.
- AI provider: mock.
- Repository runtime: in_memory.

## psql Availability Result

| Check | Result |
| --- | --- |
| `command -v psql || true` | no path returned |
| `psql --version` | not available |
| `node scripts/dev-loop/check-psql-readiness.mjs` | No-Go, not available |

Migration apply remains No-Go until `psql --version` succeeds in a later Loop.

## Supabase CLI Readiness Result

| Check | Result |
| --- | --- |
| `supabase --version` | available: `2.90.0` |

Supabase CLI was checked for version only. No Supabase connection command was executed.

## Why Migration Apply Was Not Executed

Loop 077 is a preflight/setup Loop, not an apply Loop. Even if `psql` were available, this Loop would not apply migration. Since `psql` is not available, the current state is No-Go and no alternate apply method is used.

Explicit safety stops:

- Supabase接続しない。
- migration applyしない。
- `.env.staging` の値を表示しない。
- git pushしない。

## psql Setup Direction

Added [psql Availability Setup](../15_runbooks/psql_availability_setup.md).

The runbook documents:

- why `psql` is needed.
- how to confirm `psql --version`.
- Postgres.app as an option.
- Homebrew `libpq` as an option.
- Homebrew PostgreSQL as an option.
- why Supabase CLI-only apply is not the preferred automatic fallback.
- why Codex does not install tools.
- PATH check.
- commands to rerun after manual setup.
- next Loop conditions.
- prohibited actions.

Codex does not run install commands or change OS/PATH settings.

## Added Script

```text
scripts/dev-loop/check-psql-readiness.mjs
```

The script:

- runs `psql --version`.
- prints `[ok] psql is available` when available.
- prints `[no-go] psql is not available` when missing.
- does not read staging env files.
- does not use Supabase DB URL.
- does not connect to Supabase.
- does not run install commands.
- does not run migration apply.

## Test Coverage

Added `tests/integration/psql-availability-setup.test.ts` to verify:

- psql runbook exists.
- Loop 077 task doc exists.
- README links to the psql runbook.
- runbook says Codex does not install.
- runbook includes `psql --version`.
- runbook says Supabase connection and migration apply are not performed.
- runbook says `.env.staging` values are not displayed.
- readiness script exists.
- readiness script avoids dangerous strings such as Supabase DB URL, `.env.staging`, and Supabase apply commands.
- readiness script can be executed without making the test depend on whether `psql` is installed.

## Push Policy

Loop 077 result commit is local only. `git push` is not executed.

## Verification Result

- `git diff --check`: passed.
- `node scripts/dev-loop/verify-staging-env.mjs --file .env.staging`: passed without printing values.
- `command -v psql || true`: no path returned.
- `psql --version`: failed because `psql` is not available.
- `supabase --version`: available, `2.90.0`.
- `npx pnpm@10.12.1 lint`: passed.
- `npx pnpm@10.12.1 typecheck`: passed.
- `npx pnpm@10.12.1 test`: passed, 51 files / 352 tests.
- `npx pnpm@10.12.1 test:integration`: passed, 51 files / 352 tests.
- `npx pnpm@10.12.1 build`: passed, 10 packages successful. Existing Next.js ESLint plugin warning appeared.

## Remaining Risks

- `psql` is not available in the current environment.
- staging migration has not been applied.
- Supabase project state is not verified by connection.
- RLS SQL remains unimplemented.
- API runtime remains in-memory.
- Loop 076 and Loop 077 result commits remain unpushed.

## Next Loop Candidates

```text
Loop 078: Supabase staging migration apply retry
Loop 079: Supabase staging apply rollback/recovery runbook
Loop 080: Supabase staging customer/message runtime switch preflight
```
