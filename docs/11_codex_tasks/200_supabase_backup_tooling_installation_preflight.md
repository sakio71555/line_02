# Loop 200: Supabase Backup Tooling Installation Preflight

## 1. Purpose

Recover the minimum tooling needed for a future Supabase backup export path by making `pg_dump` available on the VPS.

Loop 199 completed backup readiness preflight but was blocked by missing backup tooling. Loop 200 only installs/checks PostgreSQL client tooling and does not run any database export.

## 2. Current Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

No runtime state was changed in this Loop.

## 3. Approval State

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

Only PostgreSQL client tooling was installed. Supabase CLI was not installed and was not used.

## 6. Tooling Status After

```txt
pg_dump_available_after=true
psql_available_after=true
supabase_cli_available_after=false
backup_readiness_status=pg_dump_available
export_readiness=ready_pending_operator_approval
```

`pg_dump --version` and `psql --version` were checked. `pg_dump` was not used to connect to a database.

## 7. Backup Dir Status

```txt
backup_dir_ready=true
backup_dir_outside_repo=true
artifact_path_policy=outside_repo_required
```

Backup artifacts must remain outside the repository in any future approved export Loop.

## 8. What Was Not Executed

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

No `.env` file, secret file, database URL, provider token, webhook suffix, LINE identifier, OpenAI key, or backup archive content was displayed or recorded.

## 9. Next Loop

```txt
Loop 201: Supabase backup export controlled execution
```

Loop 201 still requires explicit operator approval. It must handle secrets outside docs, chat, Git, and logs, and it must record only sanitized export evidence.

## 10. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 199 Task Doc](199_supabase_backup_export_and_restore_readiness_accelerated_closeout.md)
- [Loop 199 Runbook](../15_runbooks/supabase_backup_export_and_restore_readiness_accelerated_closeout.md)
