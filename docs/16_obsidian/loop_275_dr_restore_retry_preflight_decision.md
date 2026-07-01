# Loop 275: DR Restore Retry Preflight Decision

## Decisions

- Loop 275 is a preflight decision package only.
- `production_go=true` remains scoped to `line_api_admin_current_runtime`.
- `dr_readiness_status=not_ready_restore_failed` remains accepted as known risk.
- Loop 274 artifact validation pass is sufficient to choose a next operator decision, but it does not authorize restore execution.
- The recommended path is `operator_side_restore_preflight_only`.
- Any future restore retry must be operator-side only, one attempt only, stop-on-first-failure, and sanitized-result-only.
- Codex direct VPS work, if approved later, is limited to read-only sanitized checks and cannot execute restore, `pg_restore`, `psql`, Supabase connection, or DB changes.
- Loop 276 is only a candidate and must not run automatically.

## DevelopmentLog

- Reviewed Loop 274 candidate A validation pass and candidate B rejection.
- Created `docs/11_codex_tasks/275_dr_restore_retry_preflight_decision.md`.
- Added `docs/15_runbooks/dr_restore_retry_preflight_decision.md`.
- Updated DR remediation, artifact validation, production readiness, final operator handoff, handoff latest files, readiness matrices, README, index, and dev log.
- Did not use VPS direct work because Loop 271 post-Go monitoring and Loop 274 artifact validation were sufficient for this decision package.
- Verification planned: `git diff --check`, docs link check, secret pattern boolean check, `npx pnpm@10.12.1 lint`.

## Risks

- Restore remains unverified, so DR readiness remains incomplete.
- Operator-side execution still carries DB/change risk and must require explicit approval.
- Recording artifact paths, filenames, exact sizes, hashes, raw logs, DB URLs, secrets, SQL, object names, role names, dump content, or row content would violate the safety boundary.
- Treating the decision package as execution approval would be unsafe.
- Codex direct VPS work must remain read-only sanitized only unless a later Loop explicitly expands scope.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
production_go=true
production_go_scope=line_api_admin_current_runtime
post_go_monitoring_status=pass
dr_readiness_status=not_ready_restore_failed
dr_risk_acceptance_status=accepted_with_known_risk
dr_artifact_validation_preflight_status=pass
dr_restore_retry_preflight_decision_created=true
restore_retry_preflight_status=ready_for_operator_decision
recommended_restore_preflight_path=operator_side_restore_preflight_only
next_operator_approval_required=true
restore_execution_allowed=false
restore_retry_execution_allowed=false
restore_execution_performed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
db_change_performed=false
vps_direct_work_used=false
vps_readonly_sanity_check_status=not_attempted_not_required
artifact_path_recorded=false
artifact_filename_recorded=false
artifact_content_read=false
artifact_hash_recorded=false
artifact_size_exact_recorded=false
secret_recorded=false
raw_log_recorded=false
restricted_actions_remain_no_go=true
next_loop_selected=true
next_loop_auto_progression=false
```
