# Loop 212: Role Owner ACL Restore Remediation Plan

## 1. Purpose

Plan the next remediation step after Loop 211 classified the diagnostic restore failure as `role_owner_acl_error_detected`.

This is a docs-only planning Loop. It does not rerun restore, run `pg_restore`, run `psql`, create a target DB, display diagnostic logs, connect to Supabase, or touch production.

## 2. Start State

```txt
start_git_status=main...origin/main_clean
previous_loop=Loop 211
previous_commit=ad272e8
diagnostic_restore_executed=true
restore_attempt_count=1
pg_restore_exit_code=1
restore_drill_status=failed
primary_failure_category=role_owner_acl_error_detected
role_owner_acl_error_count=14
extension_missing_count=6
schema_or_sql_statement_error_count=17
target_cluster_error_count=1
object_conflict_count=0
permission_or_auth_error_count=0
restore_option_error_count=0
custom_dump_format_error_count=0
diagnostic_log_displayed=false
diagnostic_log_committed=false
target_db_exists_after_drop=false
cleanup_required=false
```

## 3. Loop 211 Result Summary

The Loop 211 sanitized classifier indicates:

- Primary category: `role_owner_acl_error_detected`
- Secondary signals: `extension_missing_detected`, `schema_or_sql_statement_error_detected`
- `target_cluster_error_count=1` is treated as a secondary classifier signal, not the primary root cause, because the diagnostic target was created and cleanup succeeded.
- `object_conflict`, `permission_or_auth`, `restore_option`, and `custom_dump_format` did not appear as primary signals.

Because raw diagnostic logs are intentionally not displayed, these are classifier results rather than a full root-cause proof.

## 4. Remediation Candidate Comparison

| Candidate | Summary | Safety | Restore success potential | Risks | Next-loop fit |
| --- | --- | --- | --- | --- | --- |
| A. Explicit `--no-owner --no-privileges` retry | Keep ownership and ACL restoration disabled during retry | Strong: avoids owner/ACL replay and does not require Supabase/production | Medium: necessary baseline, but Loop 211 still produced role/ACL signals so it may not be sufficient alone | May still fail if dump contains role-dependent SQL outside owner/ACL restore | Good as a required baseline for Loop 213 |
| B. Create Supabase role placeholders in local target | Add local placeholder roles before restore | Medium: local-only, but creates more target state | Medium to high if errors are missing roles | Can drift from Supabase behavior; must drop target after retry | Plan separately if A fails again or classifier still shows missing roles |
| C. Preinstall required extensions | Add extensions to local target before restore | Medium: local-only but changes target setup | Medium if extension signals are real blockers | Requires knowing safe extension list without raw log exposure | Separate Loop if extension signals remain after role remediation |
| D. Split schema/data/ACL restore | Restore in stages to isolate failing phase | Strong if logs remain sanitized | High diagnostic value | More complex; multiple stages can increase cleanup burden | Good later diagnostic option after one bounded retry |
| E. Operator-only root log review | Operator inspects root-only diagnostic log and records category only | Strong if no raw content leaves root-only boundary | High classification value | Human error could leak raw log details | Useful before risky target-state changes |

## 5. Recommended Direction

Recommended for Loop 213:

1. Use a fresh isolated local target DB.
2. Use explicit PostgreSQL 17 `pg_restore` path.
3. Explicitly pass `--no-owner --no-privileges` and record this boundary.
4. Run only one restore attempt.
5. Save raw stdout/stderr only to a repo-external root-only diagnostic log.
6. Record only sanitized category counts/booleans and aggregate metadata.
7. Drop the target DB unless a clear, time-bounded isolated retention reason is documented.

Important nuance:

- `--no-owner --no-privileges` is still the safest baseline and must remain explicit.
- Because Loop 211 already reported role/owner/ACL signals, Loop 213 should treat `--no-owner --no-privileges` as necessary but potentially insufficient.
- If role/owner/ACL persists after Loop 213, move to a separate role placeholder or staged restore plan rather than repeating restore attempts.
- If extension signals persist, split extension preflight/remediation into another Loop.

## 6. Loop 213 Execution Boundary

Loop 213 candidate:

```txt
Loop 213: controlled restore retry with no-owner no-privileges
```

Allowed:

- artifact metadata/checksum recheck
- new local isolated target DB creation
- PostgreSQL 17 explicit `pg_restore` path/version check
- one `pg_restore` attempt with `--no-owner --no-privileges`
- raw stdout/stderr saved only to repo-external root-only diagnostic log
- sanitized classifier only
- success validation with schema/table/key-table/aggregate metadata only
- target DB drop or explicitly documented isolated retention

Forbidden:

- Supabase or production DB connection
- production restore
- `SUPABASE_DB_URL` usage
- DB URL, `.env`, secret file, raw log, dump content, or row content display
- migration/RLS/schema change
- LINE/OpenAI/Nginx/DNS/HTTPS/certbot/public smoke
- production runtime change
- unlimited retries

## 7. Loop 213 Go / No-Go

Go when:

- Loop 211 commit is pushed.
- `role_owner_acl_error_detected` is treated as the primary category.
- extension/schema signals are recorded as secondary.
- `--no-owner --no-privileges` retry boundary is documented.
- raw diagnostic logs remain root-only and undisplayed.
- target is local isolated PostgreSQL only.
- restore attempt count is limited to one.
- target cleanup plan is explicit.
- Obsidian logging is ready.

No-Go when:

- raw diagnostic log display is required.
- extension preinstall is required but not planned.
- production/Supabase connection is required.
- target identity is unclear.
- artifact checksum mismatches.
- raw log/dump/row content display is needed.
- cleanup plan is unclear.
- Obsidian logging is not updated.

## 8. Safety Boundary

```txt
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
target_db_created=false
diagnostic_log_displayed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
production_runtime_changed=false
```

## 9. Current Assessment

```txt
primary_failure_category_recorded=true
secondary_failure_signals_recorded=true
remediation_plan_created=true
loop_213_retry_ready=true
dr_readiness_status=not_ready_restore_failed
```

DR readiness remains incomplete until an isolated restore succeeds and is validated without exposing sensitive content.

## 10. Next Loop

```txt
Loop 213: controlled restore retry with no-owner no-privileges
```
