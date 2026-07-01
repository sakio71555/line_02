# DR Backup Artifact Validation Preflight

## Purpose

Define the next safe DR step after production Go: a sanitized backup artifact validation preflight before any restore retry is considered.

This runbook does not read artifact contents, reveal artifact paths, execute restore, run `pg_restore`, run `psql`, connect to Supabase, change DB/schema/roles/extensions, install packages, or change runtime infrastructure.

## Current State

```txt
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
```

## Preflight Scope

Allowed in a future approved Loop:

```txt
artifact_metadata_validation_allowed=true
artifact_path_recording_allowed=false
artifact_content_reading_allowed=false
dump_path_recording_allowed=false
secret_recording_allowed=false
raw_log_recording_allowed=false
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
```

The future preflight should use operator-side boolean/count metadata only. The operator should not paste paths, raw logs, dump contents, SQL, DB object names, role names, package names, extension names, DB URLs, secrets, env values, production logs, row contents, LINE identifiers, or message bodies into ChatGPT or Codex.

## Sanitized Metadata Categories

Acceptable future preflight fields:

```txt
operator_artifact_metadata_review_executed=true_or_false
artifact_exists=true_or_false_unknown
artifact_permission_reviewed=true_or_false
artifact_generation_known=true_or_false_unknown
artifact_generation_matches_expected_window=true_or_false_unknown
artifact_checksum_available=true_or_false_unknown
artifact_checksum_match=true_or_false_unknown
artifact_storage_scope=root_only_or_unknown_or_other_sanitized
artifact_content_read=false
artifact_path_recorded=false
secret_recorded=false
restore_execution_allowed=false
```

Do not record the artifact path, dump path, checksum value, file size value, secret values, raw command output, or any content from the dump.

## Loop 273 Artifact Metadata Contract

Loop 273 upgrades the future preflight fields into a strict operator metadata schema. The next intake must use only sanitized categories and booleans:

```txt
operator_artifact_metadata_provided=true_or_false
artifact_exists=true_or_false_or_unknown
artifact_nonempty=true_or_false_or_unknown
artifact_generation_status=known_or_unknown
artifact_age_category=same_day_or_recent_or_stale_or_unknown
artifact_storage_category=operator_managed_outside_repo_or_vps_outside_repo_or_external_backup_storage_or_unknown
artifact_format_category=logical_backup_or_platform_backup_or_unknown
artifact_restore_candidate=true_or_false_or_unknown
artifact_integrity_status=not_checked_or_operator_attested_pass_or_operator_attested_fail_or_unknown
artifact_access_status=operator_accessible_or_not_accessible_or_unknown
artifact_secret_exposure_risk=none_recorded_or_risk_unknown
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_read=false
artifact_hash_recorded=false
artifact_size_exact_recorded=false
```

Reject the intake if it includes artifact path, artifact filename, exact size, hash/checksum value, storage URL, shell output, raw log, DB URL, secret, SQL, DB object name, role name, package name, extension name, dump content, row content, LINE identifier, message body, production log, or any request to execute restore/`pg_restore`/`psql`/Supabase/DB changes.

## Loop 273 Validation Criteria

```txt
dr_backup_artifact_validation_preflight_created=true
artifact_metadata_schema_created=true
operator_artifact_metadata_required=true
operator_artifact_metadata_provided=false
dr_backup_artifact_validation_preflight_status=operator_metadata_required
```

Status meanings:

| status | criteria | restore authorization |
| --- | --- | --- |
| `operator_metadata_required` | no complete sanitized operator payload exists | no |
| `pass` | all required sanitized fields are present, artifact is operator-attested as present/nonempty/accessible, integrity is operator-attested pass, and no forbidden details are recorded | no |
| `partial` | sanitized payload exists but one or more non-execution values remain unknown or not checked | no |
| `blocked` | forbidden content is present or the request asks to execute restore/`pg_restore`/`psql`/Supabase/DB changes | no |

Loop 273 does not infer artifact metadata from older notes and does not read artifact files. If metadata is not explicitly present as sanitized operator input, keep `operator_artifact_metadata_required=true`.

## Operator-Side Metadata Collection Format

For Loop 274, the operator should paste only this sanitized block:

```txt
operator_artifact_metadata_provided=true
artifact_exists=true_or_false_or_unknown
artifact_nonempty=true_or_false_or_unknown
artifact_generation_status=known_or_unknown
artifact_age_category=same_day_or_recent_or_stale_or_unknown
artifact_storage_category=operator_managed_outside_repo_or_vps_outside_repo_or_external_backup_storage_or_unknown
artifact_format_category=logical_backup_or_platform_backup_or_unknown
artifact_restore_candidate=true_or_false_or_unknown
artifact_integrity_status=not_checked_or_operator_attested_pass_or_operator_attested_fail_or_unknown
artifact_access_status=operator_accessible_or_not_accessible_or_unknown
artifact_secret_exposure_risk=none_recorded_or_risk_unknown
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_read=false
artifact_hash_recorded=false
artifact_size_exact_recorded=false
```

If any field cannot be safely determined without revealing forbidden details, use `unknown`.

## Restore Retry Boundary

```txt
artifact_validation_pass_does_not_authorize_restore=true
restore_retry_requires_separate_operator_approval=true
restore_retry_requires_restore_preflight_loop=true
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
```

## Loop 274 Metadata Intake Result

Loop 274 received operator-provided sanitized artifact metadata and validated it against the Loop 273 contract. Candidate labels are abstract labels only; artifact path, filename, storage URL, exact size, hash/checksum, raw log, and content are not recorded.

```txt
dr_artifact_metadata_intake_created=true
operator_artifact_metadata_provided=true
selected_artifact_candidate=candidate_a
dr_backup_artifact_validation_preflight_status=pass
candidate_b_status=rejected
candidate_b_rejection_reason=artifact_nonempty_false
candidate_b_path_recorded=false
candidate_b_filename_recorded=false
candidate_b_content_read=false
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

The pass result means the artifact metadata can move to a restore retry preflight decision. It still does not authorize restore execution.

```txt
artifact_validation_pass_does_not_authorize_restore=true
restore_retry_requires_separate_operator_approval=true
restore_retry_requires_restore_preflight_loop=true
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
next_execution_sequence_status=ready_for_restore_retry_preflight_decision
next_recommended_loop=Loop 275 DR restore retry preflight decision
```

## Operator Decision Package

Recommended approval format:

```txt
approval_decision=approve_dr_backup_artifact_validation_preflight
approval_scope=sanitized_artifact_metadata_only
artifact_path_recording_allowed=false
artifact_content_reading_allowed=false
secret_recording_allowed=false
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
production_go_unchanged=true
```

Defer format:

```txt
approval_decision=defer_dr_remediation
approval_scope=none
production_go_unchanged=true
dr_risk_acceptance_status=accepted_with_known_risk
```

## Stop Conditions

Stop before any write, commit, or execution if any of the following is requested:

- artifact path disclosure
- artifact content reading
- dump content reading
- raw log disclosure
- DB URL or secret disclosure
- restore, `pg_restore`, or `psql`
- Supabase connection
- DB/schema/role/extension change
- package/apt operation
- production runtime change

## Expected Output

```txt
dr_backup_artifact_validation_preflight_created=true
artifact_metadata_schema_created=true
operator_artifact_metadata_required=false
operator_artifact_metadata_provided=true
selected_artifact_candidate=candidate_a
dr_backup_artifact_validation_preflight_status=pass
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_read=false
artifact_hash_recorded=false
artifact_size_exact_recorded=false
secret_recorded=false
restricted_actions_remain_no_go=true
next_minimal_action=Loop 275 DR restore retry preflight decision
```
