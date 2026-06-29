# Supabase Backup Tooling Installation Preflight

Loop 200 runbook.

## 1. Purpose

Make `pg_dump` and `psql` available for a future approved Supabase backup export Loop.

This runbook is not an export authorization. It records tooling readiness only.

## 2. Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

## 3. Approved Scope

```txt
ALLOW_VPS_PACKAGE_INSTALL=true
ALLOW_INSTALL_POSTGRESQL_CLIENT=true
ALLOW_INSTALL_SUPABASE_CLI=false
ALLOW_SUPABASE_CLI_OR_API_CALL=false
ALLOW_PG_DUMP_EXECUTION=false
ALLOW_DB_EXPORT=false
ALLOW_BACKUP_ARTIFACT_CREATION=false
ALLOW_RESTORE=false
ALLOW_PRODUCTION_RESTORE=false
ALLOW_SECRET_OPERATOR_INJECTION=false
```

## 4. Tooling Status Before

```txt
pg_dump_available_before=false
psql_available_before=false
supabase_cli_available_before=false
```

## 5. Tooling Action

```txt
tooling_preflight_status=complete
postgresql_client_installed=true
supabase_cli_installed=false
```

PostgreSQL client tooling was installed on the VPS. Supabase CLI was intentionally not installed.

## 6. Tooling Status After

```txt
pg_dump_available_after=true
psql_available_after=true
supabase_cli_available_after=false
backup_readiness_status=pg_dump_available
export_readiness=ready_pending_operator_approval
```

Only version checks were performed. No database connection was attempted.

## 7. Backup Directory Status

```txt
backup_dir_ready=true
backup_dir_outside_repo=true
artifact_path_policy=outside_repo_required
```

Future backup artifacts must not be written into the repository and must not be committed.

## 8. Read-Only Safety Evidence

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
```

## 9. What Was Not Executed

```txt
Supabase CLI/API called=false
pg_dump connection attempted=false
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
cron_timer_changes=false
secrets_recorded=false
```

## 10. Next Loop

```txt
Loop 201: Supabase backup export controlled execution
```

Loop 201 must separately approve secret handling, artifact path, export execution, checksum/size recording, and the no-restore boundary.

## 11. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 200 Task Doc](../11_codex_tasks/200_supabase_backup_tooling_installation_preflight.md)

## 12. Loop 201 Controlled Export Follow-Up

Loop 201 confirmed the tooling remains available, but the controlled export did not run because the operator supplied database URL was absent from the non-interactive execution environment.

```txt
pg_dump_available=true
pg_dump_version_check=ok
backup_export_status=blocked_operator_secret_not_injected
operator_supplied_db_url_present=false
operator_supplied_db_url_used=false
DB URL value not recorded
pg_dump executed=false
DB export performed=false
backup artifact created=false
backup_artifact_sha256_recorded=false
restore performed=false
production_restore_performed=false
secrets_recorded=false
```
