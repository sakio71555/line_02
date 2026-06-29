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

## 7. Loop 203 PostgreSQL 17 Client Installation Preflight

Loop 203 checked the VPS OS/package state before installing a PostgreSQL 17 client. It was read-only and did not run `pg_dump`.

```txt
vps_preflight_status=completed_read_only
os_id=ubuntu
os_version=24.04.3_LTS
os_codename=noble
pg_dump_available=true
current_pg_dump_path=/usr/bin/pg_dump
current_pg_dump_wrapper=/usr/share/postgresql-common/pg_wrapper
current_pg_dump_binary=/usr/lib/postgresql/16/bin/pg_dump
current_pg_dump_version_source=postgresql-client-16_package
current_pg_dump_version=16.14-0ubuntu0.24.04.1
current_pg_dump_major=16
detected_server_major_or_version=17.6
version_mismatch_status=pg_dump_server_version_mismatch
postgresql_apt_source_detected=false
postgresql_17_client_candidate_available=false_current_apt_cache
pg_dump_17_binary_candidate_path=/usr/lib/postgresql/17/bin/pg_dump
package_install_executed=false
apt_update_executed=false
apt_install_executed=false
pg_dump_executed=false
supabase_connection_executed=false
db_export_executed=false
backup_artifact_created=false
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
```

Recommended next step is a separate operator-approved install Loop. Current Ubuntu sources did not expose `postgresql-client-17`, so PostgreSQL official APT repository approval may be required. Keep the existing PostgreSQL 16 client intact and use an explicit PostgreSQL 17 binary path after installation.

## 8. Loop 204 PostgreSQL 17 Client Installation

Loop 204 installed PostgreSQL 17 client tooling and verified only local client versions. It did not connect to Supabase and did not export or restore data.

```txt
pgdg_source_added=true
pgdg_source_file=/etc/apt/sources.list.d/pgdg.list
pgdg_key_file=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
apt_update_executed=true
apt_install_executed=true
postgresql_client_17_installed=true
installed_package=postgresql-client-17 17.10-1.pgdg24.04+1
dependency_upgraded=libpq5 18.4-1.pgdg24.04+1
postgresql_server_17_installed=false
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_version=17.10
pg_dump_17_version_check_passed=true
pg_dump_16_path=/usr/lib/postgresql/16/bin/pg_dump
pg_dump_16_version=16.14
pg_dump_16_preserved=true
usr_bin_pg_dump_symlink_target=../share/postgresql-common/pg_wrapper
usr_bin_pg_dump_symlink_modified=false
pg_wrapper_package_modified=false
pg_dump_update_alternatives_modified=false
pg_dump_db_connection_executed=false
psql_executed=false
supabase_connection_executed=false
db_export_executed=false
backup_artifact_created=false
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
```

Future backup export must use the explicit path `/usr/lib/postgresql/17/bin/pg_dump`. The bare `pg_dump` command now resolves to 17.10 through pg_wrapper because PostgreSQL 17 is installed side-by-side, but runbooks should avoid relying on that implicit behavior.

Rollback candidates are `postgresql-client-17`, the PGDG source file, the PGDG key file, and the `libpq5` dependency upgrade. Rollback must be a separate controlled Loop and must not be combined with export or restore.

## 9. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Development Log](../14_dev_logs/2026-06-29.md)
- [Loop 202 Task Doc](../11_codex_tasks/202_pg_dump_17_client_boundary_and_backup_mismatch_runbook.md)
- [Loop 202.1 Task Doc](../11_codex_tasks/202_1_supabase_db_url_secret_replacement.md)
- [Loop 203 Task Doc](../11_codex_tasks/203_postgresql_17_client_installation_preflight.md)
- [Loop 203 Obsidian Log](../16_obsidian/loop_203_postgresql_17_client_installation_preflight.md)
- [Loop 204 Task Doc](../11_codex_tasks/204_postgresql_17_client_installation_approval_and_execution.md)
- [Loop 204 Obsidian Log](../16_obsidian/loop_204_postgresql_17_client_installation_approval_and_execution.md)
