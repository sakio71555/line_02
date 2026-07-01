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
