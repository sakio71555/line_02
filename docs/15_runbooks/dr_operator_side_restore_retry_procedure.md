# DR Operator-Side Restore Retry Procedure

## Purpose

Resolve the Loop 280 `restore_procedure_not_found` blocker by defining a concrete, category-only operator-side restore retry procedure.

This runbook is intentionally not an executable script. It is the approved operator-side procedure boundary for one future restore retry attempt while keeping Codex away from secrets, DB URLs, raw logs, artifact details, SQL, object names, role names, package names, extension names, dump contents, row contents, and production logs.

## Current State

```txt
procedure_name=operator_side_single_restore_retry_procedure
procedure_scope=operator_side_only
attempt_limit=1
stop_on_first_failure=true
retry_allowed=false
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
codex_direct_secret_access_allowed=false
codex_direct_artifact_path_access_allowed=false
operator_secret_context_required=true
operator_artifact_context_required=true
restore_target_scope_required=true
restore_target_scope_must_not_be_current_production_without_separate_explicit_approval=true
sanitized_result_required=true
```

## Preconditions

All of the following must be true before an operator runs the restore retry.

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
post_go_monitoring_status=pass
dr_artifact_validation_preflight_status=pass
operator_restore_execution_decision=approved
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restricted_actions_remain_no_go=true
```

The restore target must be explicitly identified by the operator outside Codex. Codex must not infer or record target identifiers, artifact paths, artifact filenames, DB URLs, secret values, raw logs, SQL, object names, role names, package names, extension names, dump contents, row contents, LINE identifiers, message bodies, or production logs.

## Operator-Side Procedure

The operator may execute exactly one restore retry attempt after confirming all categories below. The actual commands, values, paths, files, URLs, secrets, and identifiers stay operator-side only.

```txt
step_1_confirm_restore_target_scope_category
step_2_prepare_operator_secret_context_without_disclosure
step_3_prepare_operator_artifact_context_without_disclosure
step_4_select_restore_tool_or_platform_procedure_operator_side
step_5_execute_single_attempt_only
step_6_stop_on_first_failure
step_7_collect_sanitized_result
step_8_do_not_retry_without_new_approval
step_9_run_read_only_post_restore_validation_if_attempted
```

## Allowed Operator-Side Categories

```txt
operator_side_secret_context_preparation_allowed=true
operator_side_artifact_context_preparation_allowed=true
operator_side_restore_tool_selection_allowed=true
operator_side_single_restore_attempt_allowed=true
operator_side_read_only_post_restore_validation_allowed=true
operator_side_cleanup_allowed=true_if_needed
```

## Codex No-Go Boundary

```txt
codex_restore_execution_allowed=false
codex_pg_restore_allowed=false
codex_psql_allowed=false
codex_supabase_connection_allowed=false
codex_db_change_allowed=false
codex_artifact_read_allowed=false
codex_secret_read_allowed=false
codex_raw_log_read_allowed=false
codex_package_or_apt_operation_allowed=false
codex_service_restart_allowed=false
codex_nginx_dns_https_certbot_allowed=false
codex_line_send_allowed=false
codex_openai_api_allowed=false
```

## Stop Conditions

Stop before or during the operator-side attempt if any of the following occurs.

- More than one restore attempt would be required.
- A retry after failure is requested without a new explicit approval.
- The target scope is ambiguous or could be current production without separate approval.
- The operator cannot keep secrets, DB URLs, artifact details, raw logs, SQL, object names, role names, package names, extension names, dump contents, row contents, LINE identifiers, message bodies, and production logs out of Codex/docs.
- The attempt requires Codex direct DB access, direct restore execution, artifact access, secret access, package changes, service restart, Nginx/DNS/HTTPS/certbot changes, LINE sending, or OpenAI execution.

## Sanitized Result Block

After the operator-side attempt, return only a sanitized block in this shape.

```txt
operator_side_restore_result_provided=true
operator_side_restore_retry_execution_status=success_or_failed_no_retry_or_not_attempted
restore_retry_attempt_count=0_or_1
restore_retry_success=true_or_false_or_not_attempted
failure_reason=sanitized_reason_or_none
restore_retry_retry_executed=false
pg_restore_executed=true_or_false_operator_side
psql_executed=true_or_false_operator_side
supabase_connection_attempted=true_or_false_operator_side
db_change_performed=true_or_false_operator_side
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
production_go_unchanged=true
```

## Loop 281 Resolution

```txt
dr_restore_procedure_blocker_resolution_created=true
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restore_procedure_blocker_resolved=true
operator_side_execution_possible=true
procedure_requires_operator_secret_context=true
procedure_requires_operator_artifact_context=true
procedure_allows_single_attempt=true
procedure_stop_on_first_failure=true
procedure_retry_forbidden=true
restore_execution_status=not_executed
next_execution_sequence_status=ready_for_operator_side_restore_execution_result
next_recommended_loop=Loop 282 conditional DR restore retry execution with resolved procedure
```

## Loop 282 Conditional Execution Result

Loop 282 attempted the resolved-procedure conditional path but stopped before restore execution. The category-only procedure existed locally, but no safe executable procedure/helper/script was available in the checked VPS context.

```txt
loop_282_status=blocked
temporary_codex_direct_restore_execution_override_used=false
ssh_access_available=true
vps_working_directory_available=true
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restore_procedure_blocker_resolved=true
restore_procedure_not_executable_safely=true
restore_retry_execution_status=blocked_before_execution
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=restore_procedure_not_executable_safely
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_readiness_status=not_ready_restore_failed
next_minimal_action=Loop 283 DR restore execution prerequisite resolution
```

The procedure remains the operator-side boundary, but a future attempt must resolve the executable prerequisite without exposing secrets, DB URLs, artifact details, raw logs, SQL, object names, role names, package names, extension names, dump contents, row contents, LINE identifiers, message bodies, or production logs.

## Loop 283 Guarded Helper Addition

Loop 283 adds a guarded executable helper so the procedure is no longer only a category template.

```txt
restore_executable_helper_exists=true
helper_path_repo_relative=scripts/dr/restore_retry_guarded.sh
helper_default_mode=preflight_only
helper_execute_mode_requires_explicit_confirm=true
helper_target_scope_guard=true
helper_attempt_limit=1
helper_stop_on_first_failure=true
helper_retry_forbidden=true
helper_secret_output_forbidden=true
helper_artifact_path_output_forbidden=true
helper_raw_log_output_forbidden=true
```

Reference: [DR Guarded Restore Retry Helper](dr_guarded_restore_retry_helper.md).

## Loop 283 Result

```txt
loop_283_status=blocked
restore_executable_helper_exists=true
vps_sync_status=blocked_vps_git_repository_unavailable
helper_preflight_status=not_run_vps_sync_blocked
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=vps_git_repository_unavailable
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
```

## Loop 284 VPS Helper Delivery

```txt
vps_git_repository_unavailable_blocker_resolved=true
vps_helper_delivery_method=non_git_script_only_delivery
vps_helper_delivery_status=success
vps_helper_available=true
vps_helper_no_input_preflight_status=blocked_safely
runtime_inputs_available_to_codex=false
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_available_to_codex
```

## Loop 285 Runtime Input Handoff Status

```txt
loop_285_status=blocked
runtime_inputs_available_to_codex=false
runtime_input_injection_method=blocked
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_available_to_codex
next_minimal_action=Loop 286 operator-provided runtime input handoff
```
