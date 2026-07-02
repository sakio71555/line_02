# DR Restore Retry Preflight Decision

## Purpose

Define the operator decision package required before any future DR restore retry.

This runbook is a preflight decision guide only. It does not authorize restore execution, `pg_restore`, `psql`, Supabase connection, DB/schema/role/extension/cluster changes, package operations, infrastructure changes, LINE sends, OpenAI calls, runtime changes, or artifact/raw secret disclosure.

## Current State

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
artifact_validation_pass_does_not_authorize_restore=true
restore_retry_preflight_status=ready_for_operator_decision
restricted_actions_remain_no_go=true
```

## Anti-Proliferation Result

```txt
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=dr_restore_retry_preflight_decision
next_loop_requires_new_operator_input=true
```

Loop 275 is forward progress because Loop 274 already passed artifact metadata validation, and this runbook selects one concrete next operator decision instead of adding another metadata/protocol gate.

## Preflight Requirements

```txt
dr_restore_retry_preflight_decision_created=true
requirement_1_production_go_scope_confirmed=true
requirement_2_post_go_monitoring_pass=true
requirement_3_artifact_validation_pass=true
requirement_4_restore_execution_separate_approval_required=true
requirement_5_operator_secret_injection_required=true
requirement_6_restore_target_scope_required=true
requirement_7_no_customer_impact_plan_required=true
requirement_8_stop_on_first_failure_required=true
requirement_9_no_retry_without_new_approval=true
requirement_10_sanitized_result_only=true
restore_target_scope_category=unknown
```

The target scope remains sanitized/category-only until a future operator-approved execution Loop. Do not record target DB names, DB URLs, project refs, schema names, role names, object names, artifact paths, artifact filenames, exact sizes, hashes, raw logs, or content.

## Recommended Path

| option | purpose | allowed now | risk | recommendation |
| --- | --- | --- | --- | --- |
| `option_a_operator_side_restore_preflight_only` | Operator manages secrets and DB URL outside Codex; Codex receives sanitized result only. | decision package only | medium | recommended |
| `option_b_codex_direct_vps_restore_preflight_readonly` | Codex performs read-only sanitized VPS checks only. | optional, not required | medium_high | not recommended unless operator requests it |
| `option_c_defer_restore_retry_and_keep_dr_known_risk` | Keep production Go and accept DR risk for now. | allowed | low short term, high long term | fallback |

```txt
recommended_restore_preflight_path=operator_side_restore_preflight_only
```

Rationale:

- Restore, DB, and secrets are high-risk.
- Operator-side secret handling reduces accidental disclosure risk.
- Codex should receive sanitized outcome only.
- Execution should remain a single explicitly approved attempt with stop-on-first-failure.

## Operator Approval Package

Use this only if the operator chooses to proceed in Loop 276:

```txt
approval_decision=approve_operator_side_controlled_dr_restore_retry
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
operator_secret_handling=operator_side_only
db_url_recording_allowed=false
secret_recording_allowed=false
artifact_path_recording_allowed=false
artifact_filename_recording_allowed=false
raw_log_recording_allowed=false
pg_restore_allowed=true_operator_side_only
psql_allowed=true_operator_side_only_if_required
supabase_connection_allowed=true_operator_side_only_if_required
db_change_allowed=true_operator_side_only_with_stop_conditions
codex_direct_db_access_allowed=false
codex_direct_restore_execution_allowed=false
stop_on_first_failure=true
retry_allowed=false
production_go_unchanged=true
sanitized_result_required=true
```

Read-only Codex VPS preflight, if explicitly approved, remains non-execution:

```txt
approval_decision=approve_codex_direct_vps_restore_preflight_readonly
approval_scope=read_only_sanitized_preflight_only
target_vps=160.251.174.201
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
secret_recording_allowed=false
path_recording_allowed=false
raw_log_recording_allowed=false
production_go_unchanged=true
```

Defer option:

```txt
approval_decision=defer_dr_restore_retry
approval_scope=none
production_go_unchanged=true
dr_risk_acceptance_status=accepted_with_known_risk
restore_execution_allowed=false
```

## Stop Conditions

Stop immediately if any future request requires:

- secret, DB URL, env value, prefix, suffix, length, or hash disclosure
- artifact path, filename, storage URL, exact size, hash, raw log, or content disclosure
- SQL body, DB object name, role name, package name, extension name, row content, production log, LINE identifier, or message body disclosure
- unapproved restore retry
- more than one restore attempt
- retry after failure without new approval
- Codex direct DB access
- production DB restore
- package, cluster, runtime, Nginx, DNS, HTTPS/certbot, LINE, or OpenAI changes

## Execution Boundary

```txt
restore_retry_preflight_decision_does_not_authorize_execution=true
restore_execution_requires_separate_operator_approval=true
restore_retry_attempt_limit_requires_explicit_approval=true
retry_after_failure_requires_new_approval=true
restore_execution_allowed_in_loop_275=false
restore_retry_execution_allowed=false
pg_restore_allowed_in_loop_275=false
psql_allowed_in_loop_275=false
supabase_connection_allowed_in_loop_275=false
db_change_allowed_in_loop_275=false
```

## Expected Loop 275 Output

```txt
dr_restore_retry_preflight_decision_created=true
dr_artifact_validation_preflight_status=pass
recommended_restore_preflight_path=operator_side_restore_preflight_only
restore_retry_preflight_status=ready_for_operator_decision
restore_execution_allowed_in_loop_275=false
next_operator_approval_required=true
next_minimal_action=single_action_for_loop_276
```

## Loop 276 Controlled Execution Approval

Loop 276 finalizes the approval package for a future operator-side controlled restore retry. It still does not authorize Codex direct execution or execute restore.

```txt
dr_restore_retry_controlled_execution_approval_created=true
recommended_execution_mode=operator_side_only
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
operator_side_execution_required=true
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
stop_on_first_failure=true
retry_allowed=false
restore_execution_allowed_in_loop_276=false
restore_retry_execution_allowed_in_loop_276=false
pg_restore_allowed_in_loop_276=false
psql_allowed_in_loop_276=false
supabase_connection_allowed_in_loop_276=false
db_change_allowed_in_loop_276=false
next_operator_approval_required=true
next_minimal_action=single_action_for_loop_277
```

Use [DR Restore Retry Controlled Execution Approval](dr_restore_retry_controlled_execution_approval.md) as the detailed operator approval and sanitized result template.

## Loop 277 Operator-Side Result Intake

Loop 277 recorded the operator-side sanitized restore retry result as `not_attempted`. The restore retry still has not run, so DR readiness remains `not_ready_restore_failed`.

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
next_minimal_action=Loop 278 operator-side restore execution followup
```

## Loop 278 Operator-Side Restore Execution Followup

Loop 278 prepares the operator-side execution followup. Actual restore execution remains disallowed in Loop 278 and requires a separate operator approval decision.

```txt
operator_side_restore_execution_followup_created=true
operator_restore_followup_decision=prepare_operator_side_restore_execution_runbook_only
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

## Loop 279 Operator-Side Execution Approval Decision

Loop 279 records the separate operator approval decision required by Loop 278. The decision approves one operator-side attempt only.

```txt
operator_side_restore_execution_approval_decision_created=true
operator_restore_execution_decision=approved
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
operator_side_restore_execution_allowed_next_loop=true
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
stop_on_first_failure=true
retry_allowed=false
production_go_unchanged=true
production_go_scope_expanded=false
next_minimal_action=Loop 280 operator-side DR restore retry execution result intake
```

## Loop 280 Conditional Codex-Managed Restore Retry Execution

Loop 280 changed the immediate execution mode for this one Loop only: the operator temporarily allowed Codex-managed execution if every strict preflight passed. The restore did not run because the preflight found no concrete Codex-safe restore procedure in the reviewed runbooks.

```txt
loop_280_status=blocked
temporary_codex_direct_restore_execution_override_granted=true
temporary_codex_direct_restore_execution_override_used=false
restore_procedure_exists=false
restore_target_scope_confirmed=false
restore_target_scope_category=unknown
operator_secret_context_available=not_checked_restore_procedure_blocked
selected_artifact_candidate=not_checked_restore_procedure_blocked
restore_retry_execution_status=blocked_before_execution
blocked_reason=restore_procedure_not_found
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_readiness_status=not_ready_restore_failed
next_minimal_action=Loop 281 DR restore execution blocker resolution
```

## Loop 282 Preflight Result

Loop 282 reached the conditional execution preflight after Loop 281 resolved the missing procedure blocker, but it stopped before restore execution because the procedure was not safely executable in the checked VPS context.

```txt
loop_282_status=blocked
restore_procedure_exists=true
restore_procedure_source=new_operator_side_template
restore_procedure_blocker_resolved=true
restore_procedure_not_executable_safely=true
restore_target_scope_confirmed=false
restore_target_scope_category=unknown
operator_secret_context_available=not_checked_procedure_blocked
selected_artifact_candidate=not_checked_procedure_blocked
restore_retry_execution_status=blocked_before_execution
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=restore_procedure_not_executable_safely
next_minimal_action=Loop 283 DR restore execution prerequisite resolution
```

## Loop 283 Helper Preflight Decision

Loop 283 adds a guarded helper and makes helper preflight a required gate before any restore retry.

```txt
restore_executable_helper_exists=true
helper_preflight_required=true
helper_preflight_without_inputs_expected=blocked_safely
execute_mode_requires_all_preflight_checks_pass=true
restore_retry_attempt_limit=1
retry_allowed=false
```

## Loop 283 Result

```txt
helper_preflight_status=not_run_vps_sync_blocked
restore_retry_execution_status=blocked_before_execution
failure_reason=vps_git_repository_unavailable
restore_retry_attempt_count=0
restore_retry_success=not_attempted
```

## Loop 284 Result

```txt
vps_helper_delivery_status=success
vps_helper_no_input_preflight_status=blocked_safely
runtime_inputs_available_to_codex=false
helper_preflight_status=blocked
restore_retry_execution_status=blocked_before_execution
failure_reason=runtime_inputs_not_available_to_codex
```

## Loop 285 Result

```txt
loop_285_status=blocked
runtime_inputs_available_to_codex=false
runtime_input_injection_method=blocked
helper_preflight_status=not_run
restore_target_scope_confirmed=false
restore_target_scope_category=unknown
restore_tool_selected=none
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_available_to_codex
next_recommended_loop=Loop 286 operator-provided runtime input handoff
```

## Loop 286 Result

```txt
loop_286_status=blocked
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=not_provided
runtime_input_injection_method=blocked
helper_preflight_status=not_run
restore_target_scope_confirmed=false
restore_target_scope_category=unknown
restore_tool_selected=none
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=runtime_inputs_not_provided_by_operator
next_recommended_loop=Loop 287 operator runtime input execution
```

## Loop 287 Result

```txt
loop_287_status=blocked
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=still_not_provided
helper_preflight_status=not_run
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=operator_runtime_input_still_not_provided
dr_readiness_status=not_ready_restore_failed
dr_restore_validation_status=paused_waiting_for_operator_runtime_input
next_action=wait_for_operator_to_provide_runtime_input
```

## Loop 288 Result

```txt
loop_288_status=complete
helper_preflight_status=pass
restore_target_scope_confirmed=true
restore_target_scope_category=dr_validation_target
operator_secret_context_available=true
operator_artifact_context_available=true
artifact_exists=true
artifact_nonempty=true
restore_tool_selected=pg_restore
restore_retry_attempt_limit=1
retry_allowed=false
stop_on_first_failure=true
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=sanitized_result_only
restore_retry_attempted=false
restore_retry_success=not_attempted
failure_reason=none
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
dr_readiness_status=not_ready_restore_failed
dr_restore_validation_status=preflight_pass_waiting_for_operator_execution_decision
next_action=operator_approval_decision_for_restore_execution
```

Loop 288 does not execute restore. The preflight result only proves that the operator-side helper preflight can pass when runtime input values exist in the operator-side shell.

## Loop 289 Approval Decision

```txt
loop_289_status=complete
operator_restore_execution_decision=approved_for_next_loop_only
approval_scope=single_restore_retry_attempt_dr_validation_target_only
execute_allowed_in_loop_289=false
execute_allowed_next_loop=true_only_with_explicit_operator_instruction
restore_retry_attempt_limit=1
retry_allowed=false
target_scope=dr_validation_target
production_restore_allowed=false
pg_restore_allowed_next_loop=true_only_if_helper_preflight_still_passes
psql_allowed_next_loop=false
supabase_connection_allowed_next_loop=true_only_as_part_of_guarded_helper_execute
db_change_allowed_next_loop=true_only_on_dr_validation_target
secrets_recording_allowed=false
raw_log_recording_allowed=false
artifact_path_recording_allowed=false
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 290 one-time DR restore retry execution
loop_290_requires_explicit_operator_instruction=true
loop_290_auto_progression_allowed=false
```

Loop 289 does not run preflight or execute restore. It only records the future execution decision and the stop conditions for a separately approved Loop.

## Loop 290 Result

```txt
loop_290_status=failed_no_retry
runtime_inputs_available_to_codex=false
runtime_input_handoff_status=operator_side_sanitized_result_only
runtime_input_injection_method=operator_side_only
restore_target_scope_input_present=not_recorded_operator_side
restore_confirm_input_present=not_recorded_operator_side
db_url_input_present=not_recorded_operator_side
artifact_path_input_present=not_recorded_operator_side
restore_tool_input_present=not_recorded_operator_side
psql_allow_input_present=not_recorded_operator_side
helper_preflight_status=pass_operator_side_sanitized
operator_side_restore_retry_execution_status=failed_no_retry
restore_retry_attempted=true
restore_retry_attempt_count=1
restore_retry_success=false
failure_reason=sanitized_restore_failed
retry_allowed=false
pg_restore_executed=true
psql_executed=false
supabase_connection_attempted=true
db_change_performed=true
dr_readiness_status=not_ready_restore_failed
next_recommended_loop=Loop 291 DR restore failure diagnosis without retry
next_loop_requires_new_operator_input=false
```

Loop 290 has one human-side restore retry result recorded as sanitized `failed_no_retry` metadata. The next step must not run another restore retry and should be limited to failure diagnosis without secret, artifact, raw log, or DB URL disclosure.

## Loop 291 Diagnosis Result

```txt
loop_291_status=complete
diagnosis_without_retry=true
loop_290_status=failed_no_retry
restore_retry_attempt_count=1
restore_retry_success=false
retry_allowed=false
second_restore_attempt_executed=false
pg_restore_executed_in_loop_291=false
psql_executed_in_loop_291=false
supabase_connection_attempted_in_loop_291=false
db_change_performed_in_loop_291=false
helper_failure_taxonomy_reviewed=true
helper_failure_taxonomy_current=sanitized_restore_failed_only
helper_exact_failure_cause_available_without_raw_log=false
artifact_readability_checked_sanitized=true
archive_list_status=pass
sanitized_restore_failure_diagnosis_status=limited
likely_failure_domain=restore_target_compatibility_or_permission_unknown
raw_log_needed_for_exact_cause=true
raw_log_accessed=false
secret_accessed=false
db_url_accessed=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_recorded=false
artifact_hash_recorded=false
artifact_exact_size_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
package_name_recorded=false
extension_name_recorded=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_readiness_status=not_ready_restore_failed
restricted_actions_remain_no_go=true
next_loop_requires_new_operator_input=true
```

Loop 291 confirmed that the archive is list-readable and the helper/tooling path is available, but the helper's execution-failure taxonomy remains intentionally sanitized. Exact root cause cannot be obtained without raw restore output or protected detail disclosure, so DR readiness remains not ready and no retry is allowed.
