# Loop 202: pg_dump 17 Client Boundary And Backup Mismatch Runbook

## 1. Purpose

Record the post-Loop 201 backup export failure category caused by a PostgreSQL client/server major version mismatch.

Supabase PostgreSQL reported server version `17.6`, while the VPS-side `pg_dump` client was `16.14`. Export must not be retried with `pg_dump` 16.x. A PostgreSQL 17 client is required before another controlled export attempt.

## 2. Recorded State

```txt
pg_dump_failure_categories=pg_dump_server_version_mismatch
detected_server_major_or_version=17.6
detected_pg_dump_major_or_version=16.14
raw_log_not_displayed=true
secrets_recorded=false
```

## 3. Boundary Decision

```txt
pg_dump_17_client_required=true
pg_dump_16_retry_allowed=false
backup_export_retry_before_pg_dump_17=false
postgresql_client_17_installation_performed=false
```

Do not run another backup export until PostgreSQL client 17 is installed or otherwise made available in a separately approved Loop.

## 4. Scope

Completed:

- Recorded `pg_dump_server_version_mismatch` as the formal failure category.
- Recorded sanitized server/client versions.
- Updated docs/runbook/dev log references.
- Added static tests for the mismatch boundary and secret-safety rules.

Out of scope and not performed:

- `pg_dump` re-execution.
- Supabase database export.
- Backup artifact creation or inspection.
- Restore or production restore.
- Secret display, DB URL display, `.env` display, raw log display, or artifact content display.
- PostgreSQL client 17 installation.
- Runtime, API, UI, migration, RLS, LINE, OpenAI, Nginx, DNS, HTTPS, certbot, or public smoke changes.

## 5. Production Safety

```txt
production_readiness=production_go
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
supabase_write_migration_rls_changes=false
restore performed=false
production_restore_performed=false
backup artifact created=false
```

## 6. Residual Risks

- Supabase backup success is still not achieved.
- No real backup artifact exists for restore drill planning.
- Backup export remains blocked until a PostgreSQL 17-compatible `pg_dump` client is available and a separate controlled export Loop is explicitly approved.

## 7. Next Loop

```txt
Loop 203: PostgreSQL 17 client installation preflight
```

The next Loop should install or make available a PostgreSQL 17 client only after explicit approval. It must not combine installation with export execution.

## 8. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Development Log](../14_dev_logs/2026-06-29.md)
- [Mismatch Runbook](../15_runbooks/pg_dump_17_client_boundary_and_backup_mismatch.md)
