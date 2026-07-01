# DR Operator-Side Restore Execution Followup

## Purpose

Define the operator-side restore execution followup after Loop 277 recorded the controlled restore retry result as `not_attempted`.

This runbook does not authorize Codex to execute restore, run `pg_restore`, run `psql`, connect to Supabase, change databases, reveal secrets, read artifacts, display raw logs, or change runtime/infra/package state. It prepares the final operator approval decision boundary for a later Loop.

## Current State

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
operator_side_restore_execution_followup_created=true
restricted_actions_remain_no_go=true
```

## Anti-Proliferation Result

```txt
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=operator_side_restore_execution_followup
next_loop_requires_new_operator_input=true
```

Loop 278 is forward progress because it turns the Loop 277 `not_attempted` result into a concrete operator-side execution approval decision boundary.

## Followup Decision

```txt
operator_restore_followup_decision=prepare_operator_side_restore_execution_runbook_only
approval_scope=operator_side_restore_execution_followup_only
restore_execution_allowed_in_loop_278=false
pg_restore_allowed_in_loop_278=false
psql_allowed_in_loop_278=false
supabase_connection_allowed_in_loop_278=false
db_change_allowed_in_loop_278=false
codex_direct_restore_execution_allowed=false
codex_direct_db_access_allowed=false
operator_side_execution_required=true
next_operator_approval_required=true
production_go_unchanged=true
```

## Operator-Side Execution Steps

These steps are category-only. They intentionally exclude actual secrets, DB URLs, artifact paths, artifact filenames, SQL, object names, role names, package names, extension names, and raw output.

```txt
step_1_prepare_operator_secret_context
step_2_prepare_operator_artifact_context
step_3_select_single_restore_retry_procedure_operator_side
step_4_execute_once_only_if_operator_approves
step_5_stop_on_first_failure
step_6_collect_sanitized_result_only
step_7_do_not_retry_without_new_approval
```

## Approval Block Required Before Actual Execution

Approve execution:

```txt
approval_decision=approve_operator_side_dr_restore_retry_execution_once
approval_scope=single_restore_retry_attempt_operator_side_only
restore_retry_attempt_limit=1
operator_secret_handling=operator_side_only
operator_artifact_handling=operator_side_only
codex_direct_db_access_allowed=false
codex_direct_restore_execution_allowed=false
codex_direct_secret_access_allowed=false
codex_direct_artifact_path_access_allowed=false
pg_restore_allowed=true_operator_side_only_if_required
psql_allowed=true_operator_side_only_if_required
supabase_connection_allowed=true_operator_side_only_if_required
db_change_allowed=true_operator_side_only_with_stop_conditions
stop_on_first_failure=true
retry_allowed=false
production_go_unchanged=true
sanitized_result_required=true
```

Defer execution:

```txt
approval_decision=defer_operator_side_dr_restore_retry_execution
approval_scope=none
restore_execution_allowed=false
production_go_unchanged=true
dr_risk_acceptance_status=accepted_with_known_risk
```

```txt
approval_block_required_before_actual_restore_execution=true
```

## Sanitized Result Block For Next Intake

Success:

```txt
operator_side_restore_result_provided=true
operator_side_restore_retry_execution_status=success
restore_retry_attempt_count=1
restore_retry_success=true
failure_reason=none
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

Failure:

```txt
operator_side_restore_result_provided=true
operator_side_restore_retry_execution_status=failed_no_retry
restore_retry_attempt_count=1
restore_retry_success=false
failure_reason=sanitized_reason
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

Still not attempted:

```txt
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

## Execution Boundary

```txt
loop_278_restore_execution_allowed=false
loop_278_pg_restore_allowed=false
loop_278_psql_allowed=false
loop_278_supabase_connection_allowed=false
loop_278_db_change_allowed=false
loop_278_codex_direct_restore_execution_allowed=false
loop_278_codex_direct_db_access_allowed=false
actual_restore_execution_requires_next_operator_approval=true
```

## Stop Conditions

Stop before any future execution if any of the following is requested:

- Codex direct restore execution, DB access, secret access, or artifact path access
- more than one restore retry attempt
- retry after failure without a new explicit approval
- secret, DB URL, env value, path, filename, exact size, hash, raw log, SQL, object name, role name, package name, extension name, dump content, row content, production log, LINE identifier, or message body disclosure
- production restore without separate explicit production-specific approval
- package, cluster, runtime, Nginx, DNS, HTTPS/certbot, LINE, or OpenAI changes

## Expected Loop 278 Output

```txt
operator_side_restore_execution_followup_created=true
operator_restore_followup_decision=prepare_operator_side_restore_execution_runbook_only
approval_block_required_before_actual_restore_execution=true
restore_execution_allowed_in_loop_278=false
next_operator_approval_required=true
next_minimal_action=single_action_for_loop_279
```

## Loop 279 Operator-Side Execution Approval Decision

Loop 279 records the operator decision to approve one operator-side DR restore retry attempt. This is an approval decision only; Codex still does not execute restore, run `pg_restore`, run `psql`, connect to Supabase, change DB state, read artifacts, or reveal secrets/raw logs.

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
next_execution_sequence_status=ready_for_operator_side_restore_execution
next_minimal_action=Loop 280 operator-side DR restore retry execution result intake
```

Operator-side execution remains constrained to one attempt. The next Codex Loop may only intake a sanitized result block.

## Loop 280 Conditional Codex-Managed Restore Retry Execution

Loop 280 consumed a temporary one-time operator override that would have allowed Codex-managed restore execution only if all strict preflight conditions passed. The override was not exercised because the reviewed runbooks did not contain a concrete Codex-safe restore procedure.

```txt
loop_280_status=blocked
anti_proliferation_check=pass
temporary_codex_direct_restore_execution_override_granted=true
temporary_codex_direct_restore_execution_override_used=false
restore_procedure_exists=false
restore_retry_execution_status=blocked_before_execution
blocked_reason=restore_procedure_not_found
operator_side_restore_retry_execution_status=not_attempted
restore_retry_attempt_count=0
restore_retry_success=not_attempted
failure_reason=restore_procedure_not_found
restore_retry_retry_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go_unchanged=true
production_go_scope_expanded=false
dr_restore_retry_status=blocked_before_execution
dr_readiness_status=not_ready_restore_failed
next_minimal_action=Loop 281 DR restore execution blocker resolution
```

Loop 280 did not record secrets, DB URLs, artifact paths, artifact filenames, raw logs, SQL, object names, role names, package names, extension names, dump content, row content, LINE identifiers, message bodies, or production logs.

## Loop 281 DR Restore Execution Blocker Resolution

Loop 281 resolves the Loop 280 `restore_procedure_not_found` blocker by adding a concrete category-only operator-side restore retry procedure. This does not authorize Codex direct restore execution or DB access.

Procedure:

- [DR Operator-Side Restore Retry Procedure](dr_operator_side_restore_retry_procedure.md)

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
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_readiness_status=not_ready_restore_failed
next_execution_sequence_status=ready_for_operator_side_restore_execution_result
next_minimal_action=Loop 282 conditional DR restore retry execution with resolved procedure
```

The Loop 281 procedure remains operator-side only. It must not record secrets, DB URLs, artifact paths, artifact filenames, raw logs, SQL, object names, role names, package names, extension names, dump content, row content, LINE identifiers, message bodies, or production logs.
