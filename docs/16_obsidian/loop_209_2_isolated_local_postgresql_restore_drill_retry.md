# Loop 209.2: Isolated Local PostgreSQL Restore Drill Retry

## Decisions

- Loop 209.2 restores only to the isolated local PostgreSQL target on the VPS.
- Supabase and production restore remain forbidden.
- PostgreSQL 17 explicit `pg_restore` path is required.
- `SUPABASE_DB_URL` is not used.
- The backup artifact remains outside the repository.
- Row content, dump content, raw restore logs, DB URL, and secret values are not recorded.
- The restore target DB is dropped after the attempt.
- Restore is not retried after the single failed attempt.

## DevelopmentLog

- Start state was `main...origin/main` with a clean working tree.
- Verified artifact metadata, file permission, parent directory permission, size, and checksum.
- Verified `pg_restore` explicit path/version and `psql` availability.
- Verified cluster `restore_drill_loop2091`, port `55432`, loopback-only listen scope, and target DB identity.
- Ran one isolated restore attempt with raw output suppressed.
- Recorded `restore_drill_status=failed` and `failure_category=pg_restore_exit_code_nonzero_without_raw_log`.
- Dropped target DB `amami_line_crm_restore_drill_loop2091_20260629` after the failed attempt.
- Confirmed the target DB no longer exists after cleanup.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- Backup artifact may contain sensitive data.
- The failed restore expanded data into the isolated local target before cleanup.
- Restore capability remains unverified.
- Raw logs are intentionally suppressed, so the exact failure cause is not yet classified.
- Future diagnostics could leak information if raw logs, row contents, DB URLs, or dump contents are displayed.
- Production or Supabase misconnection remains catastrophic and must stay blocked.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
artifact_exists=true
artifact_checksum_verified=true
artifact_permission_checked=true
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
restore_target_verified_isolated=true
restore_target_db_name_contains_restore_drill=true
restore_executed=true
pg_restore_executed=true
restore_attempt_count=1
restore_drill_status=failed
failure_category=pg_restore_exit_code_nonzero_without_raw_log
sanitized_validation_executed=false
row_content_displayed=false
dump_content_displayed=false
raw_log_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
production_schema_changed=false
backup_artifact_copied_into_repo=false
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
loop_210_dr_readiness_summary_ready=false
loop_210_pg_restore_failure_diagnostics_ready=true
```
