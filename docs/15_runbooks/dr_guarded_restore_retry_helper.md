# DR Guarded Restore Retry Helper

## Purpose

Provide a guarded, executable helper for one DR restore retry attempt without exposing secrets, DB URLs, artifact details, raw logs, SQL, object names, role names, package names, extension names, LINE identifiers, message bodies, or production logs.

This helper exists because Loop 282 blocked on `restore_procedure_not_executable_safely`. It converts the category-only operator-side procedure into an executable boundary while preserving the same one-attempt and stop-on-first-failure policy.

## Helper

```txt
restore_executable_helper_exists=true
helper_path_repo_relative=scripts/dr/restore_retry_guarded.sh
helper_default_mode=preflight_only
helper_execute_mode_requires_explicit_confirm=true
helper_target_scope_guard=true
helper_scope=dr_or_staging_restore_target_only
helper_attempt_limit=1
helper_stop_on_first_failure=true
helper_retry_forbidden=true
helper_secret_output_forbidden=true
helper_db_url_output_forbidden=true
helper_artifact_path_output_forbidden=true
helper_raw_log_output_forbidden=true
```

## Allowed Target Scope

```txt
allowed_target_scope=dr_validation_target_or_staging_restore_target
blocked_target_scope=current_production_or_production_or_unknown
```

The helper must not be used for current production restore without a separate explicit production restore approval. Loop 283 approval keeps `production_go_scope=line_api_admin_current_runtime` and does not expand it.

## Required Internal Inputs

The helper reads internal operator-provided inputs from environment variables, but it never prints or records their values.

```txt
DR_RESTORE_TARGET_SCOPE=required
DR_RESTORE_CONFIRM=required
DR_RESTORE_DB_URL=required
DR_RESTORE_ARTIFACT_PATH=required
DR_RESTORE_TOOL=required
DR_RESTORE_ALLOW_PSQL=conditional_only_when_psql_selected
```

Execute mode requires this exact confirmation category:

```txt
DR_RESTORE_CONFIRM=single_restore_retry_approved
```

## Modes

```txt
default_mode=preflight
preflight_mode_restore_executed=false
execute_mode_requires_all_preflight_checks_pass=true
execute_mode_restore_attempt_limit=1
retry_after_failure_allowed=false
```

## Output Contract

The helper prints only sanitized `key=value` metadata. It must not print command lines, raw command output, secret values, DB URLs, artifact paths, artifact filenames, SQL, object names, role names, package names, extension names, dump content, row content, LINE identifiers, message bodies, or production logs.

Key result fields:

```txt
helper_preflight_status=pass_or_blocked
restore_target_scope_confirmed=true_or_false
restore_target_scope_category=dr_validation_target_or_staging_restore_target_or_current_production_or_unknown
operator_secret_context_available=true_or_false
operator_artifact_context_available=true_or_false
artifact_exists=true_or_false
artifact_nonempty=true_or_false
restore_tool_selected=pg_restore_or_psql_or_none
restore_retry_attempt_limit=1
retry_allowed=false
stop_on_first_failure=true
restore_retry_attempted=true_or_false
restore_retry_success=true_or_false_or_not_attempted
failure_reason=sanitized_reason_or_none
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
```

## Local Validation

Loop 283 local validation:

```txt
bash_n_status=pass
helper_preflight_without_inputs=blocked_safely
secret_output=false
db_url_output=false
artifact_path_output=false
raw_log_output=false
```

## Stop Conditions

Stop before restore execution when any of these are true:

- target scope is missing, unknown, production, or current production.
- explicit confirmation is missing.
- secret context is unavailable.
- artifact context is unavailable.
- artifact existence or non-empty check fails.
- restore tool is missing, disallowed, or unavailable.
- attempt lock cannot be created.
- attempt lock already exists.
- any raw output or secret/path/log visibility would be required.

## Loop 283 Status

```txt
loop_283_helper_created=true
vps_sync_status=blocked_vps_git_repository_unavailable
vps_helper_preflight_status=not_run_vps_sync_blocked
restore_retry_execution_status=blocked_before_execution
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=vps_git_repository_unavailable
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_readiness_status=not_ready_restore_failed
```

## Loop 284 VPS Helper Delivery Result

```txt
vps_git_repository_unavailable_blocker_resolved=true
vps_helper_delivery_method=non_git_script_only_delivery
vps_helper_delivery_status=success
vps_helper_available=true
vps_helper_bash_validation_status=pass
vps_helper_no_input_preflight_status=blocked_safely
runtime_inputs_available_to_codex=false
helper_preflight_status=blocked
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_available_to_codex
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_readiness_status=not_ready_restore_failed
```

## Loop 285 Runtime Input Injection Result

```txt
loop_285_status=blocked
anti_proliferation_check=pass
vps_helper_available=true
vps_helper_bash_validation_status=pass
vps_helper_no_input_preflight_status=blocked_safely
runtime_inputs_available_to_codex=false
runtime_input_injection_method=blocked
restore_target_scope_input_present=false
restore_confirm_input_present=false
db_url_input_present=false
artifact_path_input_present=false
restore_tool_input_present=false
psql_allow_input_present=false
helper_preflight_status=not_run
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_available_to_codex
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_readiness_status=not_ready_restore_failed
```
