# Loop 212: Role Owner ACL Restore Remediation Plan

## Decisions

- Loop 212 does not rerun restore.
- Loop 212 uses only the Loop 211 sanitized classifier result.
- Primary category is `role_owner_acl_error_detected`.
- Extension/schema signals are treated as secondary.
- Next retry should keep `--no-owner --no-privileges` explicit as the safest baseline.
- Raw log, dump content, row content, DB URL, and secret values are not recorded.
- Supabase and production connections remain forbidden.

## DevelopmentLog

- Start state was `main...origin/main` with a clean working tree.
- Summarized the Loop 211 sanitized classifier result.
- Compared remediation candidates A through E.
- Recommended a fresh local isolated target, explicit PostgreSQL 17 `pg_restore`, explicit `--no-owner --no-privileges`, one attempt, root-only raw log, sanitized classifier, and target cleanup.
- Defined the Loop 213 execution boundary.
- Defined Loop 213 Go/No-Go conditions.
- Updated task doc, restore runbook, backup export runbook, dev log, Obsidian README, Obsidian link map, docs index, and README.

## Risks

- Misclassification risk remains because raw diagnostic logs were not displayed.
- Extension/schema signals may remain after role/owner/ACL remediation.
- `--no-owner --no-privileges` may still fail.
- A future retry may temporarily expand sensitive data into the local target.
- Target cleanup could be missed if the next Loop fails midway.
- DR readiness remains incomplete until a restore succeeds.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
target_db_created=false
diagnostic_log_displayed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
primary_failure_category_recorded=true
secondary_failure_signals_recorded=true
remediation_plan_created=true
loop_213_retry_ready=true
dr_readiness_status=not_ready_restore_failed
```
