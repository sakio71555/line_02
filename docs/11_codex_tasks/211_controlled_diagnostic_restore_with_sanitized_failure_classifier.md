# Loop 211: Controlled Diagnostic Restore With Sanitized Failure Classifier

## 1. Purpose

Run one controlled diagnostic restore against the isolated local PostgreSQL target and classify the `pg_restore` failure without exposing raw logs, dump contents, row contents, DB URLs, or secret values.

This Loop is for failure classification, not for production restore or final DR validation.

## 2. Start State

```txt
start_git_status=main...origin/main_clean
previous_loop=Loop 210
previous_commit=ecbc8af
previous_pg_restore_failure_category=unknown_without_raw_log
restore_target=local_isolated_postgresql_on_vps
cluster=restore_drill_loop2091
port=55432
```

## 3. Diagnostic Target / Log Boundary

```txt
diagnostic_target_db=amami_line_crm_restore_drill_loop211_diag_20260629194109
diagnostic_target_db_created=true
diagnostic_target_verified_isolated=true
diagnostic_log_path=/root/deploy-backups/amami-line-crm/loop211-diagnostics-20260629-194109/pg_restore-diagnostic.log
diagnostic_log_created=true
diagnostic_log_repo_path=false
diagnostic_log_dir_permission=700
diagnostic_log_permission=600
diagnostic_log_permission_checked=true
diagnostic_log_displayed=false
diagnostic_log_committed=false
```

The diagnostic raw log is repo-external and root-only. It was not displayed, copied into the repository, committed, or pasted into docs/Obsidian.

## 4. Artifact / Tooling Preflight

```txt
artifact_exists=true
artifact_readable=true
file_permission=600
parent_dir_permission=700
artifact_size_match=true
artifact_checksum_verified=true
pg_restore_17_path_present=true
pg_restore_version=17.10
cluster_identity_match=true
cluster_identity=17:restore_drill_loop2091:55432:online
diagnostic_precheck_ok=true
```

## 5. Diagnostic Restore Result

```txt
diagnostic_restore_executed=true
restore_attempt_count=1
pg_restore_exit_code=1
restore_drill_status=failed
sanitized_validation_executed=false
```

Post-restore schema/table/count validation did not run because the diagnostic restore failed.

## 6. Sanitized Classifier Result

Only category counts and booleans were emitted. Raw matching lines were not displayed.

```txt
role_owner_acl_error_count=14
extension_missing_count=6
object_conflict_count=0
permission_or_auth_error_count=0
schema_or_sql_statement_error_count=17
restore_option_error_count=0
target_cluster_error_count=1
custom_dump_format_error_count=0
role_owner_acl_error_detected=true
extension_missing_detected=true
object_conflict_detected=false
permission_or_auth_error_detected=false
schema_or_sql_statement_error_detected=true
restore_option_error_detected=false
target_cluster_error_detected=true
custom_dump_format_error_detected=false
pg_restore_failure_category=role_owner_acl_error_detected
sanitized_classifier_executed=true
```

`role_owner_acl_error_detected` is the primary category by priority. Other positive counts may represent secondary categories or overlapping sanitized patterns.

## 7. Cleanup Result

```txt
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
```

The diagnostic target DB was dropped after the attempt.

## 8. Safety Boundary

```txt
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
production_schema_changed=false
line_send_executed=false
openai_api_call_executed=false
nginx_dns_https_certbot_public_smoke_executed=false
production_runtime_changed=false
```

## 9. DR Readiness

```txt
dr_readiness_status=not_ready_restore_failed
restore_capability_verified=false
diagnostic_failure_category_available=true
```

## 10. Next Loop

```txt
Loop 212: role owner ACL restore remediation plan
```

The next Loop should plan how to handle role/owner/ACL errors during restore. It should not run another restore unless explicitly approved.
