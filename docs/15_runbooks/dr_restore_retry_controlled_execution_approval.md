# DR Restore Retry Controlled Execution Approval

## Purpose

Define the approval package for a future operator-side controlled DR restore retry.

This runbook does not authorize Codex to execute restore, run `pg_restore`, run `psql`, connect to Supabase, change databases, reveal secrets, read artifacts, display raw logs, or change runtime/infra/package state. It prepares the exact operator-side approval scope for a later Loop.

## Current State

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
restore_retry_preflight_status=ready_for_operator_decision
recommended_restore_preflight_path=operator_side_restore_preflight_only
controlled_restore_retry_approval_status=prepared
restricted_actions_remain_no_go=true
```

## Anti-Proliferation Result

```txt
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=dr_restore_retry_controlled_execution_approval
next_loop_requires_new_operator_input=true
```

Loop 276 is forward progress because Loop 275 already selected the operator-side path, and this runbook finalizes the one-attempt approval package instead of repeating preflight readiness.

## Approval Scope

```txt
dr_restore_retry_controlled_execution_approval_created=true
approval_decision=approve_operator_side_controlled_dr_restore_retry
approval_scope=single_restore_retry_attempt_operator_side_only
recommended_execution_mode=operator_side_only
restore_retry_attempt_limit=1
operator_secret_handling=operator_side_only
operator_artifact_handling=operator_side_only
operator_side_execution_required=true
codex_direct_db_access_allowed=false
codex_direct_restore_execution_allowed=false
codex_direct_secret_access_allowed=false
codex_direct_artifact_path_access_allowed=false
stop_on_first_failure=true
retry_allowed=false
production_go_unchanged=true
sanitized_result_required=true
```

Operator-side execution permissions, if explicitly approved in a future Loop:

```txt
pg_restore_allowed=true_operator_side_only_if_required
psql_allowed=true_operator_side_only_if_required
supabase_connection_allowed=true_operator_side_only_if_required
db_change_allowed=true_operator_side_only_with_stop_conditions
```

Codex direct permissions remain No-Go:

```txt
codex_direct_pg_restore_allowed=false
codex_direct_psql_allowed=false
codex_direct_supabase_connection_allowed=false
codex_direct_db_change_allowed=false
codex_direct_restore_execution_allowed=false
codex_direct_secret_access_allowed=false
codex_direct_artifact_path_access_allowed=false
```

## One-Attempt Boundary

```txt
restore_retry_attempt_limit=1
retry_after_failure_allowed=false
retry_after_failure_requires_new_operator_approval=true
stop_on_first_failure=true
raw_log_recording_allowed=false
db_url_recording_allowed=false
secret_recording_allowed=false
artifact_path_recording_allowed=false
artifact_filename_recording_allowed=false
sql_recording_allowed=false
db_object_recording_allowed=false
role_recording_allowed=false
package_name_recording_allowed=false
extension_name_recording_allowed=false
```

## Operator-Side Handoff

Future operator-side execution should follow these category-only steps:

```txt
step_1_operator_secret_context_prepared
step_2_operator_artifact_context_prepared
step_3_single_restore_retry_command_or_procedure_selected_operator_side
step_4_execute_once
step_5_stop_on_first_failure
step_6_collect_sanitized_result_only
step_7_do_not_retry_without_new_approval
```

Operational reminders:

```txt
do_not_paste_secret_or_db_url_to_chat=true
do_not_paste_artifact_path_or_filename_to_chat=true
do_not_paste_raw_restore_log_to_chat=true
do_not_retry_on_failure=true
preserve_production_go_scope=true
```

## Sanitized Result Templates

Success:

```txt
operator_side_restore_retry_execution_status=success
restore_retry_attempt_count=1
restore_retry_success=true
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
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
production_go_unchanged=true
```

Failure:

```txt
operator_side_restore_retry_execution_status=failed_no_retry
restore_retry_attempt_count=1
restore_retry_success=false
failure_reason=sanitized_reason
restore_retry_retry_executed=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
production_go_unchanged=true
```

Not attempted:

```txt
operator_side_restore_retry_execution_status=not_attempted
blocked_reason=sanitized_reason
restore_retry_attempt_count=0
restore_retry_retry_executed=false
production_go_unchanged=true
```

## Loop 276 Boundary

```txt
restore_execution_allowed_in_loop_276=false
restore_retry_execution_allowed_in_loop_276=false
pg_restore_allowed_in_loop_276=false
psql_allowed_in_loop_276=false
supabase_connection_allowed_in_loop_276=false
db_change_allowed_in_loop_276=false
restore_execution_possible_in_next_loop_only_with_explicit_operator_approval=true
operator_side_only=true
codex_direct_restore_execution_allowed=false
```

## Stop Conditions

Stop before approving or recording a future result if any of the following is requested:

- more than one restore retry attempt
- retry after failure without new operator approval
- Codex direct restore, DB access, secret access, or artifact path access
- secret, DB URL, env value, path, filename, exact size, hash, raw log, SQL, object name, role name, package name, extension name, dump content, row content, production log, LINE identifier, or message body disclosure
- production restore without a separate explicit production-specific approval
- package, cluster, runtime, Nginx, DNS, HTTPS/certbot, LINE, or OpenAI changes

## Expected Loop 276 Output

```txt
dr_restore_retry_controlled_execution_approval_created=true
recommended_execution_mode=operator_side_only
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
stop_on_first_failure=true
retry_allowed=false
restore_execution_allowed_in_loop_276=false
next_operator_approval_required=true
next_minimal_action=single_action_for_loop_277
```

## Loop 277 Result Intake

Loop 277 received a sanitized operator-side result block. The result was `not_attempted`, so no restore retry was run and DR readiness remains incomplete.

```txt
operator_side_restore_result_intake_created=true
operator_side_restore_result_provided=true
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=operator_side_restore_not_run
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_restore_retry_status=not_attempted
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
production_go_unchanged=true
production_go_scope_expanded=false
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
next_minimal_action=Loop 278 operator-side restore execution followup
```

## Loop 278 Operator-Side Restore Execution Followup

Loop 278 prepares the final operator-side execution followup after Loop 277 recorded `not_attempted`. It still does not execute restore and keeps actual execution behind a separate operator approval decision.

```txt
operator_side_restore_execution_followup_created=true
operator_restore_followup_decision=prepare_operator_side_restore_execution_runbook_only
approval_scope=operator_side_restore_execution_followup_only
approval_block_required_before_actual_restore_execution=true
restore_execution_allowed_in_loop_278=false
pg_restore_allowed_in_loop_278=false
psql_allowed_in_loop_278=false
supabase_connection_allowed_in_loop_278=false
db_change_allowed_in_loop_278=false
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
actual_restore_execution_requires_next_operator_approval=true
production_go_unchanged=true
production_go_scope_expanded=false
next_minimal_action=Loop 279 operator-side DR restore retry execution approval decision
```

Use [DR Operator-Side Restore Execution Followup](dr_operator_side_restore_execution_followup.md) as the followup runbook for the final approval decision.

## Loop 279 Operator-Side Execution Approval Decision

Loop 279 consumed the sanitized operator decision block and classified it as approved for one operator-side DR restore retry attempt. The approval does not authorize Codex direct restore execution or direct DB access.

```txt
operator_side_restore_execution_approval_decision_created=true
operator_restore_execution_decision=approved
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
operator_side_restore_execution_allowed_next_loop=true
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
pg_restore_allowed=true_operator_side_only_if_required
psql_allowed=true_operator_side_only_if_required
supabase_connection_allowed=true_operator_side_only_if_required
db_change_allowed=true_operator_side_only_with_stop_conditions
stop_on_first_failure=true
retry_allowed=false
production_go_unchanged=true
next_minimal_action=Loop 280 operator-side DR restore retry execution result intake
```

The next Loop should record only sanitized operator-side execution results. It must not record secrets, DB URLs, artifact paths, artifact filenames, raw logs, SQL, DB object names, role names, package names, extension names, LINE identifiers, message bodies, or production logs.

## Loop 280 Conditional Codex-Managed Restore Retry Execution

Loop 280 received a one-time operator override for conditional Codex-managed restore retry execution, but stopped at preflight because no concrete Codex-safe restore procedure was available in the reviewed runbooks.

```txt
loop_280_status=blocked
operator_restore_execution_decision=approved
temporary_codex_direct_restore_execution_override_granted=true
temporary_codex_direct_restore_execution_override_used=false
restore_retry_attempt_limit=1
stop_on_first_failure=true
retry_allowed=false
restore_procedure_exists=false
restore_retry_execution_status=blocked_before_execution
blocked_reason=restore_procedure_not_found
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=restore_procedure_not_found
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go_unchanged=true
production_go_scope_expanded=false
dr_readiness_status=not_ready_restore_failed
next_minimal_action=Loop 281 DR restore execution blocker resolution
```

## Loop 281 Procedure Resolution

Loop 281 adds the missing operator-side restore retry procedure and resolves the Loop 280 blocker without executing restore.

```txt
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restore_procedure_blocker_resolved=true
operator_side_execution_possible=true
procedure_allows_single_attempt=true
procedure_stop_on_first_failure=true
procedure_retry_forbidden=true
restore_execution_status=not_executed
next_execution_sequence_status=ready_for_operator_side_restore_execution_result
```

Use [DR Operator-Side Restore Retry Procedure](dr_operator_side_restore_retry_procedure.md) before any future operator-side attempt. The procedure is category-only and keeps actual commands, values, paths, URLs, secrets, identifiers, raw logs, SQL, object names, role names, package names, extension names, dump contents, row contents, LINE identifiers, and production logs out of docs.

## Loop 282 Conditional Execution Blocked

```txt
loop_282_status=blocked
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restore_procedure_blocker_resolved=true
restore_procedure_not_executable_safely=true
restore_retry_execution_status=blocked_before_execution
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=restore_procedure_not_executable_safely
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
next_minimal_action=Loop 283 DR restore execution prerequisite resolution
```

## Loop 283 Guarded Helper Approval Boundary

Loop 283 keeps the one-time restore retry approval conditional. The approval may be used only if the guarded helper is present, synced, preflighted, and all strict conditions pass.

```txt
restore_executable_helper_exists=true
helper_execute_mode_requires_explicit_confirm=true
restore_retry_attempt_limit=1
stop_on_first_failure=true
retry_allowed=false
codex_direct_restore_execution_allowed=true_if_all_preconditions_pass
codex_direct_secret_internal_use_allowed=true_if_required_but_never_output
codex_direct_artifact_path_internal_use_allowed=true_if_required_but_never_output
production_go_scope_expanded=false
```

## Loop 286 Result

```txt
loop_286_status=blocked
temporary_codex_direct_restore_execution_override_used=false
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=not_provided
runtime_input_injection_method=blocked
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_provided_by_operator
retry_allowed=false
stop_on_first_failure=true
production_go_scope_expanded=false
```

## Loop 285 Result

```txt
loop_285_status=blocked
temporary_codex_direct_restore_execution_override_used=false
runtime_inputs_available_to_codex=false
runtime_input_injection_method=blocked
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_available_to_codex
retry_allowed=false
stop_on_first_failure=true
production_go_scope_expanded=false
```

## Loop 284 Result

```txt
vps_helper_delivery_status=success
vps_helper_available=true
runtime_inputs_available_to_codex=false
restore_retry_execution_status=blocked_before_execution
failure_reason=runtime_inputs_not_available_to_codex
restore_retry_attempt_count=0
retry_allowed=false
production_go_scope_expanded=false
```

## Loop 283 Result

The guarded helper was created, but restore execution did not start because the allowed VPS git sync prerequisite was not satisfied.

```txt
loop_283_status=blocked
temporary_codex_direct_restore_execution_override_used=false
restore_retry_execution_status=blocked_before_execution
failure_reason=vps_git_repository_unavailable
restore_retry_attempt_count=0
retry_allowed=false
production_go_scope_expanded=false
```
