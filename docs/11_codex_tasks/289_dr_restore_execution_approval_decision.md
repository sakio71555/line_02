# Loop 289: DR Restore Execution Approval Decision

## Purpose

Create a docs-only approval decision package for one future DR restore retry execution.

Loop 288 recorded that the operator-side guarded helper preflight passed using runtime inputs that remained operator-side only. Loop 289 does not execute restore. It records whether a future Loop may execute exactly one guarded restore retry, and it defines the approval scope, stop conditions, and sanitized result requirements for that future Loop.

## Preconditions

```txt
loop_287_commit=24fd2d1
loop_288_commit=aec376d
helper_preflight_status=pass
restore_target_scope_category=dr_validation_target
restore_tool_selected=pg_restore
restore_retry_attempted=false
restore_retry_success=not_attempted
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
production_go=true
dr_readiness_status=not_ready_restore_failed
```

## Approval Decision

```txt
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
```

## Loop 289 Execution Boundary

Loop 289 is docs-only and does not authorize execution inside this Loop.

```txt
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
production_db_connection_executed=false
db_change_performed=false
vps_operation_executed=false
helper_executed=false
preflight_executed=false
execute_flag_used=false
runtime_input_values_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
raw_log_recorded=false
line_send_executed=false
openai_api_executed=false
loop_290_auto_progression_allowed=false
```

## Future Loop Stop Conditions

If Loop 290 is explicitly approved, it must stop before execution when any of these are true:

- Helper preflight does not pass.
- Target scope is not `dr_validation_target`.
- Production or current production scope is detected.
- Artifact metadata indicates missing or empty.
- `pg_restore` is unavailable.
- Attempt lock cannot be created or already exists.
- A secret, DB URL, artifact path, artifact filename, raw log, SQL, object name, role name, package name, extension name, dump content, or row content would need to be displayed or recorded.
- A first attempt fails. Retry remains disallowed.

## Future Loop Reporting Requirements

The future execution Loop, if separately approved, must report only sanitized result metadata:

```txt
restore_retry_attempt_count=0_or_1
restore_retry_success=true_or_false_or_not_attempted
pg_restore_executed=true_or_false
psql_executed=false
supabase_connection_attempted=true_only_as_part_of_guarded_helper_execute_or_false
db_change_performed=true_only_on_dr_validation_target_or_false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
production_restore_allowed=false
retry_allowed=false
```

## Production And DR State

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_readiness_status=not_ready_restore_failed
dr_ready_after_loop_289=false
```

DR readiness cannot become ready until an actual restore execution result succeeds and a sanitized validation result is recorded in a later Loop.

## Next Loop Candidate

```txt
next_loop_candidate=Loop 290 one-time DR restore retry execution
loop_290_requires_explicit_operator_instruction=true
```

Loop 290 must not start automatically from Loop 289.

## Verification Plan

```txt
git_status_checked=true
git_diff_check_required=true
docs_link_check_required=true
secret_artifact_value_check_required=true
lint_required=true
typecheck_allowed=true
test_allowed=true
```
