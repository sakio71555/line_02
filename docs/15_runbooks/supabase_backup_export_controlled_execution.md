# Supabase Backup Export Controlled Execution

Loop 201 runbook.

## 1. Purpose

Execute a controlled Supabase backup export only when an operator-supplied database URL is present in the exact execution environment.

This run was blocked safely because the operator-supplied database URL was not present in the non-interactive VPS environment.

## 2. Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

No runtime state was changed.

## 3. Approved Scope

```txt
ALLOW_SUPABASE_CLI_PREFLIGHT=false
ALLOW_SUPABASE_CLI_OR_API_CALL=false
ALLOW_PG_DUMP_EXECUTION=true
ALLOW_DB_EXPORT=true
ALLOW_BACKUP_ARTIFACT_CREATION=true
ALLOW_BACKUP_ARTIFACT_CHECKSUM=true
ALLOW_SECRET_OPERATOR_INJECTION=true
ALLOW_RESTORE=false
ALLOW_PRODUCTION_RESTORE=false
ALLOW_RUNTIME_CHANGES=false
ALLOW_LINE_SEND=false
ALLOW_OPENAI_API=false
ALLOW_NGINX_DNS_CERTBOT_CHANGES=false
```

## 4. Safety Checks

```txt
vps_host=vm-227d8253-eb
api_service_active=true
admin_service_active=true
api_direct_8788_health_status=200
https_api_health_status=200
https_admin_root_status=200
https_admin_customers_status=200
https_admin_api_no_header_customers_status=401
https_line_invalid_signature_status=401
pg_dump_available=true
pg_dump_version_check=ok
backup_dir_ready=true
backup_dir_outside_repo=true
```

## 5. Secret Handling Result

```txt
operator_supplied_db_url_present=false
operator_supplied_db_url_used=false
DB URL value not recorded
secrets_recorded=false
```

No Supabase URL, key, database URL, project identifier, database password, provider token, `.env` content, secret file content, LINE secret, webhook suffix, LINE identifier, reply token, OpenAI key, model value, prompt body, response body, or Bearer token was recorded.

## 6. Export Result

```txt
backup_export_status=blocked_operator_secret_not_injected
backup_export_execution_status=blocked_operator_secret_not_injected
pg_dump executed=false
pg_dump connection attempted=false
DB export performed=false
backup artifact created=false
backup_artifact_path_recorded=false
backup_artifact_size_bytes=not_recorded
backup_artifact_sha256_recorded=false
backup_artifact_contents_displayed=false
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
```

`pg_dump` was available, but it was not executed against a database because the operator-supplied database URL was absent.

## 7. Restore And Runtime Boundary

```txt
restore performed=false
production_restore_performed=false
non_production_restore_performed=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
supabase_write_migration_rls_changes=false
Supabase CLI/API called=false
```

## 8. Artifact Policy

```txt
artifact_path_policy=outside_repo_required
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
backup_artifact_contents_displayed=false
```

Because no artifact was created, no checksum or size could be recorded.

## 9. Next Loop

```txt
Loop 201.1: Supabase backup export operator secret injection retry
```

The retry must inject the database URL into the same non-interactive execution context, verify only presence, and never display or record the value.

## 10. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 201 Task Doc](../11_codex_tasks/201_supabase_backup_export_controlled_execution.md)

## 11. Loop 202 Version Mismatch Follow-Up

After Loop 201, the backup export failure category was recorded as a PostgreSQL server/client version mismatch. Do not retry export with the PostgreSQL 16 client.

```txt
pg_dump_failure_categories=pg_dump_server_version_mismatch
detected_server_major_or_version=17.6
detected_pg_dump_major_or_version=16.14
raw_log_not_displayed=true
secrets_recorded=false
pg_dump_17_client_required=true
pg_dump_16_retry_allowed=false
backup_export_retry_before_pg_dump_17=false
postgresql_client_17_installation_performed=false
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
```

## 12. Loop 202.1 SUPABASE_DB_URL Secret Replacement

The incorrect `SUPABASE_DB_URL` was replaced through operator input and root-only handling. The value is not displayed or recorded.

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

Do not use this replacement as approval to retry export. Backup export remains blocked until the PostgreSQL 17 client boundary is resolved in a separate Loop.

## 13. Loop 204 PostgreSQL 17 Client Installation Follow-Up

PostgreSQL 17 client tooling is now installed on the VPS, but DB export has still not been retried.

```txt
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_version=17.10
pg_dump_17_version_check_passed=true
pg_dump_16_preserved=true
postgresql_client_17_installed=true
pg_dump_db_connection_executed=false
supabase_connection_executed=false
db_export_executed=false
backup_artifact_created=false
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
```

The next export Loop must call `/usr/lib/postgresql/17/bin/pg_dump` explicitly and must keep DB URL and raw log output redacted.

## 14. Loop 205 Backup Export Retry Result

Loop 205 used the explicit PostgreSQL 17 `pg_dump` path and completed one operator-approved export attempt successfully.

```txt
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_version=17.10
pg_dump_17_explicit_path_used=true
supabase_db_url_present=true
supabase_db_url_format_check=passed
pg_dump_executed=true
pg_dump_attempt_count=1
backup_export_status=success
backup_artifact_created=true
backup_artifact_in_repo=false
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
dump_contents_displayed=false
```

The artifact may contain production data and remains outside the repository. Do not copy it into Git, chat, or docs. Restore is still blocked until a separate explicit restore drill Loop.

## 15. Loop 206 Restore Drill Planning Result

Loop 206 planned the restore drill for the Loop 205 artifact without executing restore or connecting to any database.

```txt
restore_drill_plan_created=true
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
secrets_recorded=false
loop_207_restore_drill_execution_ready=false_pending_operator_approval_and_target_selection
```

Allowed future targets are isolated local PostgreSQL, a disposable non-production database, or a Supabase-separated verification database. Production restore remains forbidden. The future execution Loop must verify artifact metadata and use the explicit PostgreSQL 17 `pg_restore` path before attempting restore.

## 16. Loop 207 Restore Drill Execution Gate Result

Loop 207 added the pre-execution gate for restore drill target selection and command boundaries. It still did not execute restore or connect to any database.

```txt
restore_execution_gate_created=true
restore_target_selected=false
selected_restore_target=not_selected
production_target_allowed=false
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
loop_208_restore_drill_target_selection_ready=true
```

Before execution, choose exactly one isolated non-production target, verify artifact metadata, and confirm `/usr/lib/postgresql/17/bin/pg_restore` explicitly. Production restore remains forbidden.
