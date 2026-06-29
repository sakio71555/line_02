# Loop 206: Restore Drill Planning Without Production Restore

## Decisions

- Loop 206 does not execute restore.
- Production restore is forbidden.
- Restore drill candidates are isolated non-production environments only.
- Dump contents, raw logs, and secret values are not recorded.
- Only Loop 205 artifact metadata is recorded.

## DevelopmentLog

- Referenced the Loop 205 artifact path, size, checksum, and permissions.
- Planned candidate restore environments: isolated local PostgreSQL, disposable non-production database, and separated verification database.
- Defined Go/No-Go conditions for a future restore drill.
- Defined expected future `pg_restore` boundary: `/usr/lib/postgresql/17/bin/pg_restore`.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- The backup artifact may contain sensitive production data.
- Restore is still unverified, so recoverability is not guaranteed.
- Production restore could be catastrophic if target selection is ambiguous.
- Local/non-production DB extension, owner, privilege, and RLS behavior may differ from production.
- Dump content or raw log display could leak information.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
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
restore_drill_plan_created=true
loop_207_restore_drill_execution_ready=false_pending_operator_approval_and_target_selection
```
