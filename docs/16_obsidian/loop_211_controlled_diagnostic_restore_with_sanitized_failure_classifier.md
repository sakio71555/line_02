# Loop 211: Controlled Diagnostic Restore With Sanitized Failure Classifier

## Decisions

- Loop 211 runs exactly one diagnostic restore.
- Raw diagnostic log is stored outside the repository in a root-only directory.
- Raw diagnostic log is not displayed, committed, or pasted into docs/Obsidian.
- Docs/Obsidian record only sanitized category counts and the primary failure category.
- Supabase and production connections remain forbidden.
- `SUPABASE_DB_URL` is not used.
- The diagnostic target DB is dropped after the attempt.

## DevelopmentLog

- Start state was `main...origin/main` with a clean working tree.
- Verified artifact metadata, permissions, size, and checksum.
- Verified PostgreSQL 17 `pg_restore` explicit path/version.
- Verified local cluster `restore_drill_loop2091` on port `55432`.
- Created diagnostic log directory and file with root-only permissions.
- Created diagnostic target DB `amami_line_crm_restore_drill_loop211_diag_20260629194109`.
- Ran one diagnostic restore attempt with stdout/stderr written only to the root-only diagnostic log.
- Ran a sanitized classifier that emitted counts and booleans only.
- Classified the primary failure as `role_owner_acl_error_detected`.
- Dropped the diagnostic target DB and confirmed cleanup.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- Diagnostic log may contain sensitive object names or SQL details.
- Raw log leakage remains a risk if future operators display or copy it.
- Restore temporarily expands data into the isolated local target before cleanup.
- Category counts can overlap; secondary counts do not prove separate root causes.
- Restore has not succeeded, so DR readiness remains incomplete.
- Local PostgreSQL cluster lifecycle still needs management.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
artifact_checksum_verified=true
diagnostic_log_created=true
diagnostic_log_repo_path=false
diagnostic_log_permission_checked=true
diagnostic_log_displayed=false
diagnostic_log_committed=false
diagnostic_target_db_created=true
diagnostic_target_verified_isolated=true
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
diagnostic_restore_executed=true
restore_attempt_count=1
pg_restore_exit_code=1
restore_drill_status=failed
sanitized_classifier_executed=true
pg_restore_failure_category=role_owner_acl_error_detected
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
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
loop_212_restore_retry_or_fix_ready=true
```
