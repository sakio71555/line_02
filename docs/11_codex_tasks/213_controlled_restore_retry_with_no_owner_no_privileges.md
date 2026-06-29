# Loop 213: Controlled Restore Retry With No Owner No Privileges

## 1. Purpose

Retry the isolated local PostgreSQL restore once using explicit `--no-owner --no-privileges`, following the Loop 212 remediation plan.

This Loop used only the VPS local isolated PostgreSQL target. It did not connect to Supabase, did not connect to production DB, did not use `SUPABASE_DB_URL`, and did not perform production restore.

## 2. Start State

```txt
start_git_status=main...origin/main_clean
previous_loop=Loop 212
previous_commit=47e8c73
previous_primary_failure_category=role_owner_acl_error_detected
required_retry_options=--no-owner --no-privileges
cluster=restore_drill_loop2091
port=55432
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
```

## 3. Preflight Result

```txt
artifact_exists=true
artifact_file_permission=600
artifact_dir_permission=700
artifact_size=259222
artifact_size_match=true
artifact_checksum_verified=true
pg_restore_17_path_present=true
pg_restore_version=17.10
cluster_identity=17:restore_drill_loop2091:55432:online
cluster_identity_match=true
listen_scope_loopback_only=true
precheck_ok=true
```

## 4. Retry Boundary

```txt
run_id=loop213-20260629-201655
diagnostic_log_repo_path=false
diagnostic_log_dir_permission=700
diagnostic_log_permission=600
diagnostic_log_displayed=false
diagnostic_log_committed=false
restore_options=no-owner,no-privileges
restore_attempt_limit=1
target_db=amami_line_crm_restore_drill_loop213_20260629201655
target_db_created=true
target_db_verified_isolated=true
```

Raw stdout/stderr was written only to a repo-external root-only diagnostic log. It was not displayed, copied into the repository, committed, or pasted into docs/Obsidian.

## 5. Restore Retry Result

```txt
restore_retry_executed=true
restore_attempt_count=1
pg_restore_executed=true
pg_restore_exit_code=1
restore_drill_status=failed
sanitized_validation_executed=false
```

The restore still failed, so post-restore schema/table/aggregate validation did not run.

## 6. Sanitized Classifier Result

Only category counts and booleans were emitted. Raw matching lines were not displayed.

```txt
role_owner_acl_error_count=1
role_owner_acl_error_detected=true
extension_missing_count=0
extension_missing_detected=false
object_conflict_count=0
object_conflict_detected=false
permission_or_auth_count=0
permission_or_auth_detected=false
schema_or_sql_statement_count=0
schema_or_sql_statement_detected=false
restore_option_count=0
restore_option_detected=false
target_cluster_count=0
target_cluster_detected=false
custom_dump_format_count=0
custom_dump_format_detected=false
pg_restore_failure_category=role_owner_acl_error_detected
sanitized_classifier_executed=true
raw_log_displayed=false
```

## 7. Cleanup Result

```txt
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
```

The isolated target DB was dropped after the single retry.

## 8. Safety Boundary

```txt
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
line_send_executed=false
openai_api_call_executed=false
nginx_dns_https_certbot_public_smoke_executed=false
production_runtime_changed=false
push_performed=false
```

## 9. Assessment

Explicit `--no-owner --no-privileges` reduced the visible sanitized signal to one remaining role/owner/ACL category, but it did not make restore succeed.

DR readiness remains incomplete:

```txt
restore_capability_verified=false
dr_readiness_status=not_ready_restore_failed
role_owner_acl_error_persists=true
loop_214_role_acl_followup_ready=true
```

## 10. Verification

```txt
git_diff_check=passed
secret_pattern_check=passed
lint=passed
typecheck=passed
test=passed
test_integration=passed_after_standalone_rerun
```

The first `test:integration` run was launched concurrently with `test` and hit a copy-based release fixture assertion. The standalone rerun passed.

The final lint run passed after clearing ignored test-generated `tmp/backup-*` directories.

## 11. Next Loop

```txt
Loop 214: role owner ACL follow-up remediation gate
```

The next Loop should not repeat the same restore retry. It should decide whether to use role placeholders, staged restore, or operator-only root-log category refinement while keeping raw logs, dump contents, row contents, DB URLs, and secrets out of docs/chat/commits.
