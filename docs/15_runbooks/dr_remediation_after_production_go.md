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
restricted_actions_remain_no_go=true
```

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
| backup validation plan | true | define checksum/metadata-only validation boundaries | do not expose artifact paths or contents |
| restore retry execution | false | execute `pg_restore` or create target DB | requires future explicit approval |
| Supabase production restore | false | restore into production | No-Go |
| DB/schema/role/package changes | false | modify target/runtime systems | No-Go |

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
next_dr_step=operator_reviewed_restore_strategy_or_backup_validation_plan
candidate_path_1=restore_strategy_review_without_execution
candidate_path_2=backup_validation_plan_without_restore
candidate_path_3=alternate_dr_fallback_plan_without_production_restore
```

Any future execution Loop must explicitly restate the No-Go boundaries and require a clean git state before work begins.
