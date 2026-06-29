# Loop 210: pg_restore Failure Diagnostics Without Raw Log Exposure

## Decisions

- Loop 210 does not retry restore.
- Raw log, dump content, row content, DB URL, and secret values are not displayed or recorded.
- Loop 209.2 exit code 1 is split into confirmed facts and unconfirmed causes.
- Failure category is assigned as `unknown_without_raw_log`.
- A future diagnostic restore must use root-only raw logs and publish only sanitized categories.
- Supabase and production connections remain forbidden.

## DevelopmentLog

- Start state was `main...origin/main` with a clean working tree.
- Reviewed Loop 209.2 failure facts from docs and runbooks.
- Rechecked artifact metadata, permission, size, and checksum without displaying dump contents.
- Rechecked PostgreSQL 17 `pg_restore` path/version and local cluster identity.
- Confirmed Loop 210 did not run restore, `pg_restore` restore, or `psql`.
- Documented what can and cannot be concluded without raw logs.
- Created a failure category matrix.
- Created the Loop 211 diagnostic restore plan.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- Raw logs may include object names or operational details and must remain unexposed.
- Dump object names may be sensitive.
- Misclassifying the failure could lead to unnecessary or unsafe restore retries.
- Restore remains unsuccessful, so DR readiness is incomplete.
- The local PostgreSQL target cluster remains provisioned and requires lifecycle management.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
loop_209_2_failure_reviewed=true
pg_restore_failure_category_assigned=true
pg_restore_failure_category=unknown_without_raw_log
loop_211_diagnostic_restore_plan_created=true
dr_readiness_status=not_ready_restore_failed
```
