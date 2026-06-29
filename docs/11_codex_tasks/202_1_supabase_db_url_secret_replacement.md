# Loop 202.1: Supabase DB URL Secret Replacement

## 1. Purpose

Replace the incorrect `SUPABASE_DB_URL` in the VPS root-only runtime secret file without displaying, recording, or committing the value.

This Loop only replaces the secret value and records sanitized boolean evidence. It does not retry backup export.

## 2. Scope

Completed:

- Confirmed the existing root-only Supabase runtime secret file is present.
- Added a root-only helper on the VPS to replace only `SUPABASE_DB_URL`.
- Replaced `SUPABASE_DB_URL` through operator input.
- Verified only boolean status after replacement.
- Recorded sanitized docs/dev log evidence.

## 3. Recorded State

```txt
secret_replaced=true
present=true
format_check=passed
secrets_recorded=false
raw_log_not_displayed=true
```

## 4. Safety Boundary

Not performed:

- DB URL display.
- `.env` or secret file content display.
- Raw log display.
- `pg_dump` re-execution.
- Supabase database connection or export.
- Backup artifact creation, download, upload, inspection, or restore.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, API, UI, migration, RLS, or runtime process restart.

## 5. Backup Boundary

The corrected `SUPABASE_DB_URL` does not unblock backup export by itself.

```txt
pg_dump_17_client_required=true
pg_dump_16_retry_allowed=false
backup_export_retry_before_pg_dump_17=false
DB export performed=false
backup artifact created=false
restore performed=false
```

Loop 202 remains in force: do not retry backup export until a PostgreSQL 17-compatible client is installed or made available in a separately approved Loop.

## 6. Test / Verification

- `git status --short`
- VPS boolean check only:
  - `present=true`
  - `format_check=passed`
  - `secrets_recorded=false`
- `git diff --check`
- `npx pnpm@10.12.1 lint`
- `npx pnpm@10.12.1 typecheck`
- `npx pnpm@10.12.1 test`

## 7. Residual Risks

- Supabase backup success is still not achieved.
- PostgreSQL client 17 is still required before backup export can be retried.
- The secret value is intentionally not recoverable from repo docs or logs.

## 8. Next Loop

```txt
Loop 203: PostgreSQL 17 client installation preflight
```

## 9. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Development Log](../14_dev_logs/2026-06-29.md)
- [Loop 202 Runbook](../15_runbooks/pg_dump_17_client_boundary_and_backup_mismatch.md)
