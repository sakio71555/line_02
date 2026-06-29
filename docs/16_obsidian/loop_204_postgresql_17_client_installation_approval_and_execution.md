# Loop 204: PostgreSQL 17 Client Installation Approval And Execution

## Summary

Loop 204 installed PostgreSQL 17 client tooling on the VPS and verified the explicit `pg_dump` 17 binary path. It did not connect to Supabase, export data, create backup artifacts, or restore anything.

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
pgdg_source_added=true
apt_update_executed=true
apt_install_executed=true
postgresql_client_17_installed=true
pg_dump_17_path_present=true
pg_dump_17_version_check_passed=true
pg_dump_16_preserved=true
usr_bin_pg_dump_symlink_modified=false
pg_wrapper_package_modified=false
pg_dump_update_alternatives_modified=false
manual_update_alternatives_modified=false
pg_dump_db_connection_executed=false
psql_executed=false
supabase_connection_executed=false
db_export_executed=false
backup_artifact_created=false
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
loop_205_backup_export_retry_ready=true_after_operator_approval
```

## Decisions

- Loop 204 allowed package operations only for PostgreSQL 17 client installation.
- PostgreSQL server package remained out of scope and was not installed.
- Future backup export must use `/usr/lib/postgresql/17/bin/pg_dump`.
- `/usr/bin/pg_dump` remains a pg_wrapper symlink; no manual symlink or pg_dump alternative change was made.
- DB connection/export/restore stays separated into Loop 205 or later.
- Secret values are not recorded in Obsidian.

## DevelopmentLog

- Pre-install inventory showed Ubuntu 24.04.3 LTS / noble, PostgreSQL client 16.14, and no PGDG source.
- Added PGDG source `/etc/apt/sources.list.d/pgdg.list`.
- Added PGDG key `/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc`.
- Ran `apt update`.
- Installed `postgresql-client-17 17.10-1.pgdg24.04+1`.
- Upgraded dependency `libpq5` to `18.4-1.pgdg24.04+1`.
- Confirmed `/usr/lib/postgresql/17/bin/pg_dump --version` returns PostgreSQL 17.10.
- Confirmed `/usr/lib/postgresql/16/bin/pg_dump --version` still returns PostgreSQL 16.14.
- Confirmed `postgresql-17` server package is not installed.

## Risks

- Backup export is still not proven successful.
- Bare `pg_dump --version` now resolves to 17.10 through pg_wrapper, so runbooks should use the explicit PostgreSQL 17 path to avoid ambiguity.
- PGDG source is now part of APT configuration and must be considered in future package operations.
- `libpq5` was upgraded as a dependency and may need rollback planning if package conflicts appear later.
- Secret values remain intentionally unrecoverable from repo docs and Obsidian notes.

## Checklist

- [x] `working_directory_confirmed=true`
- [x] `tmp_used=false`
- [x] `obsidian_updated=true`
- [x] `pgdg_source_added=true`
- [x] `apt_update_executed=true`
- [x] `apt_install_executed=true`
- [x] `postgresql_client_17_installed=true`
- [x] `pg_dump_17_path_present=true`
- [x] `pg_dump_17_version_check_passed=true`
- [x] `pg_dump_16_preserved=true`
- [x] `usr_bin_pg_dump_symlink_modified=false`
- [x] `pg_wrapper_package_modified=false`
- [x] `pg_dump_update_alternatives_modified=false`
- [x] `manual_update_alternatives_modified=false`
- [x] `pg_dump_db_connection_executed=false`
- [x] `psql_executed=false`
- [x] `supabase_connection_executed=false`
- [x] `db_export_executed=false`
- [x] `backup_artifact_created=false`
- [x] `restore_executed=false`
- [x] `secrets_recorded=false`
- [x] `raw_log_displayed=false`
- [x] `loop_205_backup_export_retry_ready=true_after_operator_approval`

## Next Loop

- Loop 205: Supabase backup export retry with explicit pg_dump 17 path
