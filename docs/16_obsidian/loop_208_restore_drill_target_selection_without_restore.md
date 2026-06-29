# Loop 208: Restore Drill Target Selection Without Restore

## Decisions

- Loop 208 selects the restore target only.
- Restore, `pg_restore`, `psql`, Supabase connection, production DB connection, and target DB creation are not executed.
- Production/Supabase production restore is forbidden.
- Recommended restore target is candidate A: local isolated PostgreSQL on VPS.
- Loop 209 may consider isolated restore drill execution only after explicit operator approval.
- Secret values, DB URL, raw logs, and dump contents are not recorded.

## DevelopmentLog

- Compared candidate A local isolated PostgreSQL on VPS, candidate B developer Mac local PostgreSQL, candidate C disposable non-production PostgreSQL database, and candidate D Supabase-separated verification DB.
- Selected candidate A because the artifact already lives on the VPS, PostgreSQL 17 tooling is available there, and no artifact transfer is required.
- Defined Loop 209 allow/deny boundary.
- Defined misconnection prevention checklist.
- Defined minimum success criteria and failure stop conditions.
- Ran docs-only validation commands.

## Risks

- Restore is still unverified, so recoverability remains unproven.
- Production/Supabase production misconnection remains the primary catastrophic risk.
- Backup artifact may contain sensitive production data.
- Local non-production PostgreSQL may differ from Supabase production in extensions, owner, privileges, RLS, or policy behavior.
- Target cleanup must be performed in the future execution Loop.
- Dump content or raw log display could leak sensitive data.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
restore_target_selection_documented=true
restore_target_selected=true
selected_restore_target=local_isolated_postgresql_on_vps
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
target_db_created=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
loop_209_restore_drill_execution_ready=true_pending_operator_approval
```
