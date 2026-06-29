# Loop 222: Pre-Data Only Restore Diagnostic Execution

## Purpose

Loop 221 created the pre-data only diagnostic gate. Loop 222 executes one pre-data only diagnostic against a fresh local isolated PostgreSQL target DB.

This Loop diagnoses whether the pre-data section can be restored safely. It does not attempt a full restore, data restore, post-data restore, Supabase connection, production DB connection, production restore, migration, RLS change, runtime change, LINE send, OpenAI call, or infrastructure change.

## Scope

- Confirm git state.
- Confirm backup artifact metadata and checksum.
- Confirm local isolated PostgreSQL cluster identity.
- Create a fresh disposable target DB on the local isolated cluster.
- Verify PostgreSQL 17 explicit `pg_restore` path.
- Run `pg_restore --section=pre-data --no-owner --no-privileges` exactly once.
- Store stdout/stderr in a repo-external root-only diagnostic log.
- Record only sanitized category/count metadata.
- Drop the target DB and record cleanup.
- Update docs, runbook, dev log, Obsidian, handoff, DR matrix, and verification matrix.
- Commit locally.

## Out of Scope

- Full restore.
- Data or post-data restore.
- Retry beyond the one pre-data attempt.
- Supabase connection.
- Production DB connection.
- Production restore.
- `SUPABASE_DB_URL` usage.
- DB URL, `.env`, secret file, raw log, dump content, row content, object name, table name, function name, policy name, role name, or SQL statement display.
- Diagnostic log copy into the repository.
- Backup artifact copy into the repository.
- Package, cluster, migration, RLS, schema, runtime, LINE, OpenAI, Nginx, DNS, HTTPS, certbot, or public smoke changes.
- Push.

## Start State

```txt
workdir=/Users/sakio/Desktop/PROJECT/amami-line-crm
git_status_start=main...origin/main
loop_221_commit=dda3a7a docs: add pre-data restore diagnostic gate
dr_readiness_status_before=not_ready_restore_failed
```

## Artifact And Cluster Preflight

```txt
artifact_exists=true
artifact_readable=true
file_permission=600
parent_dir_permission=700
artifact_size=259222
artifact_checksum_verified=true
local_cluster_name=restore_drill_loop2091
local_cluster_found=true
local_cluster_port=55432
local_cluster_status=online
local_cluster_socket_or_loopback_scope=true
supabase_connection_executed=false
production_db_connection_executed=false
supabase_db_url_used=false
```

## Target DB And Diagnostic Log

The first helper path attempted TCP localhost target creation and was interrupted before any `pg_restore` attempt because it did not reach the restore phase. The actual restore attempt used the local socket plus port `55432`.

```txt
pre_restore_helper_interrupted_before_pg_restore=true
pre_restore_helper_restore_attempt_count=0
fresh_target_db_name=amami_line_crm_restore_drill_loop222_pre_data_20260630_075241
fresh_target_db_created=true
fresh_target_verified_isolated=true
fresh_target_db_name_contains_restore_drill=true
fresh_target_db_name_contains_loop222_or_pre_data=true
diagnostic_log_path=/root/deploy-backups/amami-line-crm/loop222-pre-data-20260630_075241/pg_restore-pre-data-diagnostic.log
diagnostic_log_repo_path=false
diagnostic_log_permission=600
diagnostic_log_dir_permission=700
diagnostic_log_displayed=false
diagnostic_log_committed=false
```

## pg_restore Execution

```txt
pg_restore_17_path_present=true
pg_restore_version=17.10
pg_restore_17_version_check_passed=true
restore_stage=pre_data
restore_options=--section=pre-data --no-owner --no-privileges
restore_options_pre_data_no_owner_no_privileges=true
restore_attempt_count=1
pg_restore_exit_code=1
pre_data_diagnostic_status=failed
```

## Sanitized Classifier Result

```txt
failure_category=pre_data_permission_error_detected
sanitized_classifier_executed=true
role_owner_acl_error_detected=false
role_owner_acl_error_count=0
extension_missing_detected=false
extension_missing_count=0
object_conflict_detected=false
object_conflict_count=0
permission_or_auth_error_detected=true
permission_or_auth_error_count=1
schema_or_sql_statement_error_detected=false
schema_or_sql_statement_error_count=0
restore_option_error_detected=false
restore_option_error_count=0
target_cluster_error_detected=false
target_cluster_error_count=0
custom_dump_format_error_detected=false
custom_dump_format_error_count=0
unknown_error_detected=false
generic_error_count=1
warning_count=0
```

No matching line, object name, table name, function name, policy name, role name, SQL statement, dump content, row content, DB URL, or secret was displayed.

## Sanitized Validation

Pre-data restore failed, so success validation was not executed.

```txt
sanitized_validation_executed=false
sanitized_validation_status=not_executed
schema_count=not_executed
table_count=not_executed
extension_count=not_executed
sequence_count=not_executed
function_count=not_executed
policy_count=not_executed
trigger_count=not_executed
row_content_displayed=false
```

## Cleanup

```txt
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
pg_restore_comm_count_after=0
createdb_comm_count_after=0
psql_comm_count_after=0
```

## Selected Next Stage

```txt
selected_next_stage=Loop 223: pre-data permission/auth remediation gate
selected_next_stage_reason=pre_data_failed_with_permission_or_auth_signal
dr_readiness_status=not_ready_restore_failed
```

## Safety

```txt
restore_attempt_count=1
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
supabase_db_url_used=false
migration_executed=false
rls_changed=false
production_schema_changed=false
production_runtime_changed=false
raw_log_displayed=false
diagnostic_log_displayed=false
diagnostic_log_committed=false
object_name_displayed=false
table_name_displayed=false
function_name_displayed=false
policy_name_displayed=false
sql_statement_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
push_performed=false
```

## Next Loop

```txt
Loop 223: pre-data permission/auth remediation gate
```
