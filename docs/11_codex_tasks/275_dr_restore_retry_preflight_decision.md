# Loop 275: DR Restore Retry Preflight Decision

## Purpose

Create the decision package for whether the next DR step may request operator approval for a controlled restore retry.

This Loop does not execute restore, run `pg_restore`, run `psql`, connect to Supabase, change DB/schema/roles/extensions/clusters, install packages, change infrastructure, send LINE messages, call OpenAI, change runtime code/config, or read/record artifact paths, filenames, exact sizes, hashes, contents, raw logs, DB URLs, secrets, SQL, object names, role names, package names, or extension names.

## Status

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=dr_restore_retry_preflight_decision
next_loop_requires_new_operator_input=true
```

## Current Production And DR State

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
artifact_validation_pass_does_not_authorize_restore=true
restricted_actions_remain_no_go=true
```

## Loop 274 Review

Loop 274 validated sanitized operator artifact metadata and selected candidate A as the restore candidate. Candidate B remains rejected because its sanitized nonempty status is false.

```txt
operator_artifact_metadata_provided=true
selected_artifact_candidate=candidate_a
candidate_b_status=rejected
candidate_b_rejection_reason=artifact_nonempty_false
artifact_exists=true
artifact_nonempty=true
artifact_generation_status=known
artifact_age_category=recent
artifact_storage_category=vps_outside_repo
artifact_format_category=logical_backup
artifact_restore_candidate=true
artifact_integrity_status=operator_attested_pass
artifact_access_status=operator_accessible
artifact_secret_exposure_risk=none_recorded
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_read=false
artifact_hash_recorded=false
artifact_size_exact_recorded=false
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
```

## VPS Read-Only Sanity Check

VPS direct work was not required for this Loop because Loop 271 post-Go monitoring remains pass and Loop 274 artifact metadata is sufficient for a decision package.

```txt
vps_direct_work_used=false
vps_readonly_sanity_check_status=not_attempted_not_required
```

## Restore Retry Preflight Requirements

```txt
dr_restore_retry_preflight_decision_created=true
restore_retry_preflight_status=ready_for_operator_decision
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

The restore target scope remains category-only until the operator approves a future execution Loop. This Loop records no target DB name, DB URL, project ref, schema name, role name, object name, artifact path, artifact filename, exact size, hash, raw log, or content.

## Options

| option | purpose | restore allowed in Loop 275 | risk | recommended |
| --- | --- | --- | --- | --- |
| `option_a_operator_side_restore_preflight_only` | Operator keeps secrets and DB URL outside Codex, then gives Codex sanitized result only. | false | medium | true |
| `option_b_codex_direct_vps_restore_preflight_readonly` | Codex may run read-only sanitized VPS checks only. | false | medium_high | false |
| `option_c_defer_restore_retry_and_keep_dr_known_risk` | Keep production Go and continue accepting DR known risk. | false | low_short_term_high_long_term | false |

```txt
recommended_restore_preflight_path=operator_side_restore_preflight_only
recommended_restore_preflight_path_reason=operator_side_secret_handling_reduces_restore_db_secret_accident_risk
```

## Operator Approval Package

Recommended future approval format for Loop 276:

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

Codex direct VPS approval may be used only for read-only sanitized checks:

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

Defer format:

```txt
approval_decision=defer_dr_restore_retry
approval_scope=none
production_go_unchanged=true
dr_risk_acceptance_status=accepted_with_known_risk
restore_execution_allowed=false
```

## Restore Execution Boundary

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
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
```

## Go / No-Go Matrix

| item | status | note |
| --- | --- | --- |
| Current production runtime | Go | Still limited to `line_api_admin_current_runtime`. |
| Post-Go monitoring | Pass | Loop 271 baseline remains current. |
| DR readiness | Not ready | Restore has not succeeded. |
| Artifact validation | Pass | Loop 274 candidate A passed sanitized validation. |
| Restore retry execution | No-Go | Requires separate operator approval. |
| Recommended next action | Operator decision | Loop 276 should request exactly one operator decision. |

## Next Loop

```txt
next_minimal_action=single_action_for_loop_276
next_recommended_loop=Loop 276: DR restore retry controlled execution approval
```
