# pg_dump 17 Client Boundary And Backup Mismatch

Loop 202 runbook.

## 1. Purpose

Record that the controlled backup export path is blocked by a PostgreSQL server/client version mismatch.

Supabase PostgreSQL server version is recorded as `17.6`. The VPS-side `pg_dump` client version is recorded as `16.14`. `pg_dump` 16.x must not be reused for another export attempt against the PostgreSQL 17.6 server.

## 2. Sanitized Failure Record

```txt
pg_dump_failure_categories=pg_dump_server_version_mismatch
detected_server_major_or_version=17.6
detected_pg_dump_major_or_version=16.14
raw_log_not_displayed=true
secrets_recorded=false
```

The raw log is intentionally not displayed or copied into docs. Secret values, database URLs, passwords, provider keys, webhook paths, LINE identifiers, OpenAI keys, prompt bodies, and response bodies are not recorded.

## 3. Export Boundary

```txt
pg_dump_17_client_required=true
pg_dump_16_retry_allowed=false
backup_export_retry_before_pg_dump_17=false
postgresql_client_17_installation_performed=false
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
backup_artifact_contents_displayed=false
restore performed=false
production_restore_performed=false
```

Do not re-run backup export until a PostgreSQL 17 client is available and a new controlled export Loop explicitly approves execution.

## 4. What Was Not Executed

```txt
Supabase CLI/API called=false
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
backup artifact downloaded=false
backup artifact uploaded=false
restore performed=false
production_restore_performed=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
supabase_write_migration_rls_changes=false
secrets_recorded=false
raw_log_not_displayed=true
```

## 5. Next Safe Step

```txt
Loop 203: PostgreSQL 17 client installation preflight
```

Loop 203 should only install or expose a PostgreSQL 17-compatible client after explicit approval. It must not also run `pg_dump` against Supabase, create an artifact, or perform restore.

## 6. Loop 202.1 SUPABASE_DB_URL Secret Replacement

Loop 202.1 replaced the previously incorrect `SUPABASE_DB_URL` through operator input and root-only handling. The value was not displayed, recorded, or committed.

```txt
secret_replaced=true
present=true
format_check=passed
secrets_recorded=false
raw_log_not_displayed=true
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
```

This replacement does not authorize backup export. The PostgreSQL 17 client boundary above still applies.

## 7. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Development Log](../14_dev_logs/2026-06-29.md)
- [Loop 202 Task Doc](../11_codex_tasks/202_pg_dump_17_client_boundary_and_backup_mismatch_runbook.md)
- [Loop 202.1 Task Doc](../11_codex_tasks/202_1_supabase_db_url_secret_replacement.md)
