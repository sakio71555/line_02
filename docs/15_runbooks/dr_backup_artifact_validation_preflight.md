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
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
artifact_path_recorded=false
artifact_content_read=false
secret_recorded=false
next_minimal_action=Loop 273 DR backup artifact validation preflight
```
