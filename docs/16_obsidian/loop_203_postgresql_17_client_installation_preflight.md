# Loop 203: PostgreSQL 17 Client Installation Preflight

## Summary

Loop 203 checked the VPS OS/package state before any PostgreSQL 17 client installation. It did not install packages, did not run `pg_dump`, did not connect to Supabase, and did not create a backup artifact.

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
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
current_pg_dump_major=16
required_pg_dump_major=17
pg_dump_server_version_mismatch_recorded=true
loop_204_install_ready=false_without_operator_approval_for_pgdg_source
```

## Decisions

- Loop 203 is preflight only, not an install Loop.
- Backup export retry remains a separate future Loop.
- Existing `pg_dump` 16.14 should not be removed or broken.
- Prefer side-by-side PostgreSQL 17 client installation and explicit path usage.
- Prefer `/usr/lib/postgresql/17/bin/pg_dump` in backup runbooks rather than bare `pg_dump`.
- Do not record secret values, DB URLs, raw logs, or secret file contents in Obsidian.

## DevelopmentLog

- Confirmed VPS OS: Ubuntu 24.04.3 LTS / noble.
- Confirmed installed PostgreSQL client packages include `postgresql-client` 16, `postgresql-client-16` 16.14, `postgresql-client-common`, and `libpq5`.
- Confirmed `/usr/bin/pg_dump` points to `pg_wrapper`, with current PostgreSQL 16 binary at `/usr/lib/postgresql/16/bin/pg_dump`.
- Confirmed current APT cache/sources did not expose `postgresql-client-17`.
- Updated Loop task doc, pg_dump boundary runbook, dev log, and Obsidian link map.
- Install/package changes, `pg_dump`, Supabase connection, DB export, artifact creation, and restore were not executed.

## Risks

- Supabase backup export is still not successful.
- PostgreSQL 17 client is not installed.
- PostgreSQL official APT repository or another approved source is likely required.
- Incorrect binary path usage could reproduce the version mismatch.
- Adding package sources requires a separate rollback plan and operator approval.
- Secret values are intentionally not recoverable from repo docs or Obsidian notes.

## Checklist

- [x] `working_directory_confirmed=true`
- [x] `tmp_used=false`
- [x] `obsidian_updated=true`
- [x] `package_install_executed=false`
- [x] `apt_update_executed=false`
- [x] `apt_install_executed=false`
- [x] `pg_dump_executed=false`
- [x] `supabase_connection_executed=false`
- [x] `db_export_executed=false`
- [x] `backup_artifact_created=false`
- [x] `restore_executed=false`
- [x] `secrets_recorded=false`
- [x] `raw_log_displayed=false`
- [x] `current_pg_dump_major=16`
- [x] `required_pg_dump_major=17`
- [x] `pg_dump_server_version_mismatch_recorded=true`
- [x] `loop_204_install_ready=false_without_operator_approval_for_pgdg_source`

## Next Loop

- Loop 204: PostgreSQL 17 client installation approval and execution
