# Loop 273: DR Backup Artifact Validation Preflight

## Purpose

Create the safe preflight boundary for validating a DR backup artifact with operator-provided sanitized metadata before any restore retry is considered.

This Loop does not access the artifact, read artifact content, record artifact path or filename, run restore, run `pg_restore`, run `psql`, connect to Supabase, change DB/schema/roles/extensions, change packages, change infrastructure, send LINE messages, call OpenAI, or change runtime code/config.

## Status

```txt
loop_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=dr_artifact_validation_preflight
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
```

## Scope

- Define the sanitized backup artifact metadata schema.
- Define pass / partial / blocked / operator_metadata_required criteria.
- Define operator-side metadata collection instructions.
- Record that no sufficient sanitized operator artifact metadata is present in this Loop.
- Keep restore retry separated from artifact validation.
- Update runbook, dev log, Obsidian, handoff, and readiness matrices.

## Out Of Scope

- Artifact path, filename, exact size, hash, checksum, storage URL, raw log, dump content, or row content recording.
- Artifact content reads or repo copies.
- Restore, `pg_restore`, `psql`, Supabase connection, DB/schema/role/extension changes.
- Package/apt, cluster, VPS, Nginx, DNS, HTTPS/certbot, service restart, LINE, OpenAI, runtime code, package, or config changes.

## Artifact Metadata Schema

Only the following sanitized fields are accepted for the next operator intake:

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

Do not provide artifact path, artifact filename, exact artifact size, artifact hash/checksum value, storage URL, command output, raw log, DB URL, secret, SQL, DB object name, role name, package name, extension name, dump content, row content, LINE identifier, message body, or production log.

## Current Loop Result

The repo does not currently contain a sufficient Loop 273 sanitized operator artifact metadata payload. Therefore this Loop records the preflight as requiring operator metadata before any validation status can pass.

```txt
dr_backup_artifact_validation_preflight_created=true
artifact_metadata_schema_created=true
operator_artifact_metadata_provided=false
operator_artifact_metadata_required=true
dr_backup_artifact_validation_preflight_status=operator_metadata_required
artifact_validation_pass_does_not_authorize_restore=true
restore_retry_requires_separate_operator_approval=true
restore_retry_requires_restore_preflight_loop=true
```

## Criteria

### operator_metadata_required

Use this status when no complete sanitized operator payload exists. This is the current Loop 273 state.

### pass

Allowed only when all required sanitized fields are present, no forbidden values are recorded, artifact is operator-attested as present/nonempty/accessible, integrity is operator-attested pass, and no path/filename/hash/exact size/content is recorded.

### partial

Use when a sanitized payload is present but one or more non-execution metadata values remain unknown or not checked. Partial does not authorize restore.

### blocked

Use when the input includes forbidden content, raw logs, artifact path/filename/hash/exact size, secrets, DB URLs, SQL, object names, role names, command output, or asks to execute restore/`pg_restore`/`psql`/Supabase/DB changes.

## Restricted Actions

```txt
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
restricted_actions_remain_no_go=true
```

## Operator Collection Instructions

For Loop 274, the operator should return only the sanitized key/value block from the schema above. The operator should verify artifact facts on their side and provide only categories/booleans. If a value cannot be safely determined without exposing forbidden data, use `unknown`.

## DR Readiness

Artifact validation preflight is not restore validation. Even if future metadata passes, DR remains incomplete until a separate approved restore drill succeeds.

```txt
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
```

## Next Loop

```txt
next_recommended_loop=Loop 274: DR artifact metadata intake and validation
next_loop_requires_operator_metadata=true
```
