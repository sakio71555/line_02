# Obsidian Notes

This folder keeps the Obsidian-facing navigation helpers for the project.

The repo root `/Users/sakio/Desktop/PROJECT/amami-line-crm` may be opened as an Obsidian Vault. Obsidian is used only for reading, searching, linking, and reviewing Markdown logs. It is not a product feature and does not change runtime behavior.

## Official Locations

- DevelopmentLog: [../14_dev_logs](../14_dev_logs/)
- Loop task docs: [../11_codex_tasks](../11_codex_tasks/)
- Runbooks: [../15_runbooks](../15_runbooks/)
- Entry file: [../../OBSIDIAN.md](../../OBSIDIAN.md)
- Link map: [obsidian_link_map.md](obsidian_link_map.md)
- Loop template: [loop_log_template.md](loop_log_template.md)

## Daily Flow

1. Start from [../../OBSIDIAN.md](../../OBSIDIAN.md).
2. Open the latest daily log in [../14_dev_logs](../14_dev_logs/).
3. Follow the matching Loop task doc in [../11_codex_tasks](../11_codex_tasks/).
4. Open related runbooks in [../15_runbooks](../15_runbooks/).
5. Confirm validation, safety boundary, production state, and Next Loop.

## Current Backup Decision Trail

- Loop 194.1 records the Supabase Free Plan limitation result.
- Loop 195 records the backup path decision after Free Plan limitation.
- Loop 196 records `selected_path=B_planning_only`.
- Loop 197 production operations final closeout records that no further required Loop remains.
- Loop 197 Supabase CLI backup dry-run design records an optional backup-design follow-up, still with no execution, no export, and no restore.
- Loop 198 Supabase CLI backup command pack planning records placeholder-only preflight/export/verification/artifact/restore groups and keeps execution blocked: `execution=false`, `next=Loop 199 preflight`.
- Loop 199 Supabase backup export and restore readiness accelerated closeout records the first approved preflight: `preflight_status=complete`, `backup_dir_outside_repo=true`, `backup_readiness_status=blocked_tooling_missing`, `DB export performed=false`, `restore performed=false`.
- Loop 200 Supabase backup tooling installation preflight records `pg_dump_available_after=true`, `psql_available_after=true`, `supabase_cli_installed=false`, and keeps export/restore unexecuted.
- Loop 201 Supabase backup export controlled execution reached the export gate, but `operator_supplied_db_url_present=false`, so `backup_export_status=blocked_operator_secret_not_injected`, `DB export performed=false`, `backup artifact created=false`, and `restore performed=false`.
- Loop 202 pg_dump 17 client boundary records `pg_dump_failure_categories=pg_dump_server_version_mismatch`, `detected_server_major_or_version=17.6`, `detected_pg_dump_major_or_version=16.14`, and blocks retry until PostgreSQL client 17 is available.
- Loop 202.1 Supabase DB URL secret replacement records `supabase_db_url_replaced=true`, `present=true`, `format_check=passed`, `secrets_recorded=false`, `pg_dump_executed=false`, `supabase_export_executed=false`, and `restore_executed=false`. It does not authorize backup export.
- Loop 203 PostgreSQL 17 client installation preflight records Ubuntu 24.04.3 / PostgreSQL client 16 state, notes that current APT cache does not expose `postgresql-client-17`, and keeps install/export/restore unexecuted.
- Loop 204 PostgreSQL 17 client installation records PGDG source/key addition, `postgresql-client-17 17.10` installation, `libpq5` dependency upgrade, explicit pg_dump 17 path verification, and keeps DB export/restore unexecuted.
- Loop 205 pg_dump 17 explicit path backup export retry records one operator-approved export attempt, `backup_export_status=success`, root-only repo-external artifact metadata, and keeps restore blocked for a separate Loop.
- Loop 206 restore drill planning records isolated non-production restore target options, Go/No-Go conditions, artifact verification scope, and keeps `restore_executed=false`, `pg_restore_executed=false`, `psql_executed=false`, and `production_restore_executed=false`.
- Loop 207 restore drill execution gate records target selection criteria, production misconnection prevention, artifact verification boundaries, explicit `pg_restore` 17 boundary, and keeps `restore_target_selected=false`, `restore_executed=false`, `pg_restore_executed=false`, and `psql_executed=false`.
- Loop 208 restore drill target selection chooses `local_isolated_postgresql_on_vps` as the next target candidate, keeps target DB creation/restore unexecuted, and requires explicit operator approval before Loop 209 execution.
- Loop 209 isolated local PostgreSQL restore drill execution reached preflight, verified artifact metadata and `pg_restore` 17 path, then blocked before restore because the local PostgreSQL target was unavailable. Restore, `psql`, Supabase connection, production DB connection, and target DB creation stayed unexecuted.
- Loop 209.1 isolated local PostgreSQL target provisioning installs/provisions the VPS local PostgreSQL 17 restore target, creates cluster `restore_drill_loop2091` and DB `amami_line_crm_restore_drill_loop2091_20260629`, and keeps restore/`pg_restore` restore unexecuted.
- Loop 209.2 isolated local PostgreSQL restore drill retry verifies artifact/target metadata, runs one explicit-path `pg_restore` attempt, records `restore_drill_status=failed` / `failure_category=pg_restore_exit_code_nonzero_without_raw_log`, drops the target DB, and keeps raw logs, row contents, dump contents, DB URL, secrets, Supabase, and production untouched.
- Loop 210 pg_restore failure diagnostics records `pg_restore_failure_category=unknown_without_raw_log`, confirms artifact/tooling/cluster metadata, avoids restore retry and `psql`, and designs Loop 211 as a controlled diagnostic restore with root-only raw logs and sanitized category output.
- Loop 211 controlled diagnostic restore runs one isolated diagnostic restore, stores raw output only in a repo-external root-only log, classifies the primary failure as `role_owner_acl_error_detected`, drops the diagnostic DB, and keeps raw log/dump/row/secret content out of docs and commits.
- Loop 212 role owner ACL restore remediation plan compares remediation candidates, keeps `--no-owner --no-privileges` as the required baseline for the next retry, treats extension/schema as secondary signals, and defines Loop 213 Go/No-Go without rerunning restore.
- Loop 213 controlled restore retry runs one isolated retry with explicit `--no-owner --no-privileges`, records `pg_restore_exit_code=1` / `role_owner_acl_error_count=1`, drops the target DB, and keeps raw log/dump/row/secret content out of docs and commits.

## .obsidian Policy

- `.obsidian/workspace*`, `.obsidian/cache`, `.obsidian/plugins`, and `.obsidian/themes` are ignored because they are local personal state.
- Obsidian settings are not required for the project record.
- Markdown remains the source of truth.
