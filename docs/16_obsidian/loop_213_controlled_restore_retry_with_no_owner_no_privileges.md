# Loop 213: Controlled Restore Retry With No Owner No Privileges

## Decisions

- Loop 213 runs exactly one restore retry.
- The retry uses explicit `--no-owner --no-privileges`.
- The target is a fresh isolated local PostgreSQL DB on the VPS.
- Supabase, production DB, and `SUPABASE_DB_URL` remain forbidden.
- Raw diagnostic logs stay repo-external and root-only.
- Docs/Obsidian record sanitized counts and booleans only.
- The target DB is dropped after the attempt.
- Push is intentionally deferred to a later push-only Loop.

## DevelopmentLog

- Start state was `main...origin/main` with a clean working tree.
- Verified backup artifact existence, permission, size, and checksum.
- Verified PostgreSQL 17 `pg_restore` explicit path/version.
- Verified local cluster `restore_drill_loop2091` on port `55432`.
- Created a fresh target DB `amami_line_crm_restore_drill_loop213_20260629201655`.
- Ran one `pg_restore` retry with `--no-owner --no-privileges`.
- Saved raw stdout/stderr only to a repo-external root-only diagnostic log.
- Ran a sanitized classifier and recorded only counts/booleans.
- Dropped the restore target DB and confirmed cleanup.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian note, Obsidian navigation, README, and docs index.

## Risks

- Restore still failed, so DR readiness remains incomplete.
- The raw diagnostic log may contain sensitive object names or SQL details.
- Repeating the same retry is unlikely to add value and could increase exposure risk.
- A remaining role/owner/ACL signal may require role placeholder planning or staged restore.
- Local isolated PostgreSQL may differ from Supabase behavior.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
artifact_checksum_verified=true
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
cluster_identity_match=true
listen_scope_loopback_only=true
target_db_created=true
target_db_verified_isolated=true
restore_retry_executed=true
restore_attempt_count=1
pg_restore_executed=true
restore_options=no-owner,no-privileges
pg_restore_exit_code=1
restore_drill_status=failed
sanitized_classifier_executed=true
pg_restore_failure_category=role_owner_acl_error_detected
role_owner_acl_error_count=1
extension_missing_count=0
schema_or_sql_statement_count=0
sanitized_validation_executed=false
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
diagnostic_log_repo_path=false
diagnostic_log_displayed=false
diagnostic_log_committed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
psql_executed=true_local_isolated_target_cleanup_check
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
production_schema_changed=false
production_runtime_changed=false
push_performed=false
loop_214_role_acl_followup_ready=true
```
