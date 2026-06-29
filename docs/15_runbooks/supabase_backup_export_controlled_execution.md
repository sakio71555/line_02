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
