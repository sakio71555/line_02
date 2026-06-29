# Loop 202.1: Supabase DB URL Secret Replacement

## Summary

Loop 202.1 replaced the incorrect `SUPABASE_DB_URL` through operator input and root-only handling. The secret value, database URL, raw log, and secret file contents were not displayed, recorded, or committed.

```txt
supabase_db_url_replaced=true
present=true
format_check=passed
secrets_recorded=false
pg_dump_executed=false
supabase_export_executed=false
restore_executed=false
```

## Decisions

- Treat the corrected `SUPABASE_DB_URL` as a secret replacement only, not as approval to retry backup export.
- Keep the Loop 202 mismatch boundary in force: PostgreSQL client 17 is still required before a new export attempt.
- Do not combine secret replacement with `pg_dump`, Supabase export, backup artifact creation, restore, runtime changes, or public smoke.
- Record only boolean evidence in docs and Obsidian-facing logs.

## DevelopmentLog

- [2026-06-29 Development Log](../14_dev_logs/2026-06-29.md) records Loop 202 and Loop 202.1.
- [Loop 202 Task Doc](../11_codex_tasks/202_pg_dump_17_client_boundary_and_backup_mismatch_runbook.md) records the `pg_dump_server_version_mismatch` boundary.
- [Loop 202.1 Task Doc](../11_codex_tasks/202_1_supabase_db_url_secret_replacement.md) records the secret replacement boundary.
- [pg_dump 17 Client Boundary Runbook](../15_runbooks/pg_dump_17_client_boundary_and_backup_mismatch.md) records that backup export remains blocked until a PostgreSQL 17-compatible client is available.

## Risks

- Supabase backup success is still not achieved.
- PostgreSQL client 17 is still required before backup export can be retried.
- The corrected DB URL value is intentionally not recoverable from repo docs, dev logs, Obsidian notes, commit history, or test output.
- Any future backup export Loop must re-check the client/server version boundary and must not display DB URLs or raw logs.

## Checklist

- [x] `supabase_db_url_replaced=true`
- [x] `present=true`
- [x] `format_check=passed`
- [x] `secrets_recorded=false`
- [x] `pg_dump_executed=false`
- [x] `supabase_export_executed=false`
- [x] `restore_executed=false`
- [x] DB URL value not displayed.
- [x] `.env` and secret file contents not displayed.
- [x] Raw log not displayed.
- [x] No LINE/OpenAI/Nginx/DNS/HTTPS/certbot/public smoke operation performed.
- [x] Production runtime unchanged.

## Next Loop

- Loop 203: PostgreSQL 17 client installation preflight
