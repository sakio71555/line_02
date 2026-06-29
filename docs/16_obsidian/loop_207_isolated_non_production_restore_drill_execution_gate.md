# Loop 207: Isolated Non-Production Restore Drill Execution Gate

## Decisions

- Loop 207 creates the restore drill execution gate only.
- Restore, `pg_restore`, `psql`, Supabase connection, production restore, migration, RLS, schema change, and production runtime change are not executed.
- Restore target is not selected in this Loop.
- Future execution must choose exactly one isolated non-production target before restore.
- Production database and Supabase production project are forbidden restore targets.
- Dump contents, raw logs, DB URL, and secret values are not recorded.

## DevelopmentLog

- Referenced Loop 205 artifact metadata from prior sanitized records.
- Added a target selection matrix to narrow future restore target choice.
- Added production misconnection prevention checklist.
- Added artifact checksum verification boundaries without displaying dump contents.
- Added explicit PostgreSQL 17 `pg_restore` boundary for a future execution Loop.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- Restore is still unexecuted, so backup recoverability remains unproven.
- Artifact may contain sensitive production data and must remain outside Git.
- Future target selection could accidentally point at production if the gate is skipped.
- Local/non-production restore may differ from Supabase production in extensions, owner, privileges, RLS, or policies.
- Raw restore logs or dump inspection could leak sensitive data.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
restore_execution_gate_created=true
restore_target_selected=false
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
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
