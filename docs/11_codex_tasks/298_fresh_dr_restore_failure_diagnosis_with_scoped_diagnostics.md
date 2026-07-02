# Loop 298: Fresh DR Restore Failure Diagnosis With Scoped Diagnostics

## Purpose

Diagnose the fresh DR validation target restore failure with scoped VPS and DR target diagnostics, without running another restore attempt.

Loop 298 does not run restore, does not run helper preflight, does not run helper execute, does not run `pg_restore` restore, does not run `psql` against production, does not change any DB, and does not expand production Go scope.

## Official Starting State

```txt
loop_295_status=complete
loop_296_status=blocked
loop_297_status=complete
operator_side_fresh_restore_result_intake=true
loop_296_human_side_execution_status=failed_no_retry
fresh_target_restore_attempt_already_consumed=true
restore_attempt_count_fresh_target=1
restore_success_fresh_target=false
retry_allowed=false
second_restore_attempt_allowed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
```

## Local Diagnostics

```txt
working_directory_confirmed=true
git_status_initial=clean
local_helper_exists=true
local_helper_bash_validation_status=pass
loop_297_record_found=true
fresh_restore_failed_record_found=true
restore_attempt_count_fresh_target_recorded=1
retry_allowed_recorded=false
```

## Scoped VPS And Artifact Diagnostics

```txt
ssh_access_available=true
vps_working_directory_available=true
vps_helper_available=true
vps_helper_bash_validation_status=pass
pg_restore_available=true
pg_restore_version_checked=true
psql_available=true
psql_version_checked=true
pg_restore_running=false
psql_running=false
attempt_lock_exists=true
attempt_lock_state=exists
artifact_candidate_available=true
artifact_exists=true
artifact_nonempty=true
archive_list_status=pass
archive_list_internally_reviewed=true
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_recorded=false
artifact_hash_recorded=false
artifact_exact_size_recorded=false
```

## Raw Log Diagnosis

```txt
raw_log_available=true
raw_log_internally_reviewed=true
raw_log_candidate_count_category=present
raw_log_signal_classification=mixed_or_not_fresh_specific
raw_role_permission_signal=present
raw_schema_object_signal=present
raw_extension_signal=present
raw_connection_auth_signal=present
raw_log_recorded=false
raw_log_secret_leak_detected_in_output=not_checked
exact_failure_cause_available_without_recording_sensitive_values=false
```

The raw-log side did not yield one safe, exact fresh-attempt cause without recording protected values. The mixed signals are therefore not used as the primary failure category.

## Fresh DR Target PSQL Diagnostics

```txt
runtime_db_url_available_for_codex=false
psql_diagnostic_executed=false
psql_diagnostic_scope=not_used
psql_connection_status=not_attempted_runtime_input_missing
psql_read_only_enforced=not_applicable
fresh_target_partial_restore_state=unknown
fresh_target_schema_conflict_signals=unknown
fresh_target_permission_conflict_signals=unknown
fresh_target_extension_conflict_signals=unknown
fresh_target_managed_schema_conflict_signals=unknown
db_url_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
extension_name_recorded=false
```

## Classification

```txt
loop_298_status=complete
fresh_dr_restore_failure_diagnosis_status=limited
diagnosis_scope=vps_and_fresh_dr_target_scoped_diagnostics
likely_failure_domain=helper_taxonomy_insufficient_category
diagnosis_confidence=medium
raw_log_needed_for_exact_cause=true
next_remediation_direction=sanitized_helper_taxonomy_improvement_without_restore
second_restore_attempt_executed=false
retry_allowed=false
db_change_performed_in_loop_298=false
dr_readiness_status=not_ready_restore_failed
```

This is remediation-ready because the artifact can be listed, the helper and tooling are available, no restore process is running, and the current blocker is that the helper exposes only a generic sanitized failure category.

## Helper Taxonomy Plan

```txt
helper_failure_taxonomy_current=sanitized_restore_failed_only
helper_taxonomy_limitation=generic_failure_output_insufficient_for_safe_remediation
helper_taxonomy_improvement_needed=true
helper_taxonomy_improvement_plan_created=true
helper_runtime_behavior_changed=false
helper_script_changed=false
helper_bash_validation_status=pass
```

Recommended improvement: add a future docs-approved helper mode or guarded classifier path that preserves raw failure output outside docs, emits only allowlisted sanitized categories, and still forbids protected values, raw text, second attempts, and production DB access.

## Safety Boundary

```txt
restore_executed_in_loop_298=false
pg_restore_restore_executed_in_loop_298=false
helper_preflight_executed_in_loop_298=false
helper_execute_executed_in_loop_298=false
psql_diagnostic_executed=false
supabase_connection_attempted_in_loop_298=false
db_change_performed_in_loop_298=false
second_restore_attempt_executed=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
password_recorded=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_recorded=false
artifact_hash_recorded=false
artifact_exact_size_recorded=false
sql_recorded=false
db_object_recorded=false
role_recorded=false
schema_name_recorded=false
table_name_recorded=false
relation_name_recorded=false
package_name_recorded=false
extension_name_recorded=false
host_or_url_recorded=false
project_ref_recorded=false
sqlstate_recorded=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
production_restore_allowed=false
restricted_actions_remain_no_go=true
```

## Anti-Proliferation Check

```txt
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=scoped_restore_failure_diagnosis_and_taxonomy_bottleneck_identification
next_loop_requires_code_or_helper_taxonomy_decision=true
```

## Next Loop

```txt
next_loop_candidate=Loop 299 sanitized helper taxonomy improvement without restore
loop_299_auto_progression_allowed=false
```

## Verification

```txt
git_diff_check=pass
local_helper_bash_validation_status=pass
docs_link_check=pass
secret_artifact_value_check=pass
validation_passed=true
lint=pass
typecheck=not_run_result_intake_and_docs_only
test=not_run_result_intake_and_docs_only
commit_created=true
push_executed=true
```
