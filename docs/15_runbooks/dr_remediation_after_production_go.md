# DR Remediation After Production Go

## Purpose

This runbook plans DR remediation after the operator accepted scope-limited production Go for the current LINE/API/Admin runtime.

It does not execute restore, `pg_restore`, `psql`, Supabase connections, DB changes, schema changes, role changes, extension creation, package operations, or artifact operations.

## Current State

```txt
dr_current_status=not_ready_restore_failed
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
restricted_actions_remain_no_go=true
```

## Loop 272 Strategy Review

```txt
dr_remediation_strategy_review_created=true
dr_current_status=not_ready_restore_failed
dr_blocker_type=sanitized_restore_drill_not_successful
dr_last_known_failure=sanitized_restore_failure_without_raw_log
dr_risk_acceptance_status=accepted_with_known_risk
production_go_scope=line_api_admin_current_runtime
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
restore_retry_execution_allowed=false
operator_decision_required_before_any_restore_execution=true
artifact_path_recording_allowed=false
secret_recording_allowed=false
```

Loop 272 chooses the backup artifact validation preflight as the next safest DR move. It does not re-open the classifier/package/extension route and does not authorize restore execution.

## Remediation Priority

```txt
dr_remediation_priority=high_after_post_go_stability
post_go_monitoring_status=pass
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
operator_decision_required_before_restore_retry=true
```

The production Go decision is not a DR completion signal. DR should be resumed only through a separate small Loop after post-Go stability has been reviewed.

## Safe Next DR Options

| option | allowed_now | purpose | notes |
| --- | --- | --- | --- |
| operator-reviewed restore strategy | true | choose whether to continue local isolated restore, backup validation, or alternate DR path | planning only |
| backup validation plan | true | define sanitized artifact metadata boundaries | recommended next strategy; do not expose artifact paths or contents |
| restore retry execution | false | execute `pg_restore` or create target DB | requires future explicit approval |
| Supabase production restore | false | restore into production | No-Go |
| DB/schema/role/package changes | false | modify target/runtime systems | No-Go |

## DR Remediation Options

| option | purpose | allowed_scope | required_operator_input | forbidden_actions | stop_conditions | expected_output | risk_level | next_loop_candidate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `option_a_restore_retry_preflight_only` | Check only future restore retry prerequisites. | docs and operator input validation only | approval for preflight-only restore-readiness review | restore, `pg_restore`, `psql`, Supabase connection, DB change | any request to execute restore or reveal secret/path/raw data | sanitized restore preflight decision package | medium | use only if artifact validation is already sufficient |
| `option_b_backup_artifact_validation_plan` | Validate backup artifact metadata policy before restore retry. | sanitized artifact metadata policy only | approval for metadata-only validation without path/content disclosure | artifact path recording, artifact content reading, restore, `pg_restore`, `psql`, Supabase connection | path/content/secret/raw log disclosure request | operator-side sanitized artifact validation preflight | low | Loop 273 DR backup artifact validation preflight |
| `option_c_fresh_dr_baseline_after_production_go` | Reframe DR from current production Go baseline. | DR design and runbook only | approval to pause restore retry and redesign DR baseline | DB export, Supabase connection, restore, package/cluster changes | any request to run export/restore/change DB | revised DR baseline plan | medium | future DR baseline design Loop |

## Recommended Strategy

```txt
recommended_dr_strategy=backup_artifact_validation_plan_before_restore_retry
recommended_strategy_reason=lowest_risk_next_step_after_post_go_monitoring_pass
next_recommended_loop=Loop 273 DR backup artifact validation preflight
dr_next_operator_decision_required=true
next_minimal_action=Loop 273 DR backup artifact validation preflight
```

## Artifact And Secret Policy

```txt
backup_artifact_handling_policy=no_artifact_path_or_secret_recording
secret_recording_policy=never_record
raw_log_recording_policy=never_record
dump_content_recording_policy=never_record
row_content_recording_policy=never_record
db_url_recording_policy=never_record
```

## Operator Decision Points

Before any future DR execution Loop, the operator should choose one path:

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

Alternative decisions:

```txt
approval_decision=approve_dr_restore_retry_preflight_only
approval_scope=restore_preflight_without_execution
restore_execution_allowed=false
pg_restore_allowed=false
psql_allowed=false
supabase_connection_allowed=false
db_change_allowed=false
secret_recording_allowed=false
production_go_unchanged=true
```

```txt
approval_decision=defer_dr_remediation
approval_scope=none
production_go_unchanged=true
dr_risk_acceptance_status=accepted_with_known_risk
```

Any future execution Loop must explicitly restate the No-Go boundaries and require a clean git state before work begins.
