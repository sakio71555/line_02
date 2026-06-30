# Loop 236: Owner-Aligned Pre-Data Retry Gate Resume

## Purpose

Loop 235 refined the restore drill cluster listen classifier and confirmed:

```txt
local_cluster_loopback_only=true
external_interface_listen_detected=false
listen_entry_count=2
loopback_ipv4_count=2
wildcard_ipv4_count=0
wildcard_ipv6_count=0
non_loopback_count=0
listen_addresses_category=localhost_or_loopback
```

Loop 236 resumes the owner-aligned pre-data retry gate after Loop 233 was blocked. It documents the next execution boundary without running restore, `pg_restore`, `psql`, target DB creation, role changes, cluster changes, or backup artifact operations.

## Scope

- Summarize Loop 235 listen classifier result.
- Re-evaluate the Loop 233 blocker as likely classifier false positive.
- Record that the Loop 231/233 owner-aligned target DB is currently absent.
- Define the next execution Loop boundary.
- Define Go/No-Go, cleanup, and branch outcomes for Loop 237.
- Update docs, runbook, dev log, Obsidian, handoff, and DR/verification matrices.
- Commit and push after validation.

## Out of Scope

- Restore or `pg_restore`.
- `psql`.
- Target DB creation/change.
- Role creation/change.
- Cluster config changes.
- Restart or reload.
- Package or firewall changes.
- Backup artifact operations.
- Diagnostic/raw log display.
- Supabase or production DB connection.
- DB URL, `.env`, or secret display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, or production runtime operations.

## Loop 235 Result

```txt
loop235_listen_scope_confirmed=true
local_cluster_loopback_only=true
external_interface_listen_detected=false
listen_entry_count=2
loopback_ipv4_count=2
loopback_ipv6_count=0
wildcard_ipv4_count=0
wildcard_ipv6_count=0
non_loopback_count=0
unknown_listen_count=0
listen_addresses_category=localhost_or_loopback
classifier_false_positive_likely=true
```

## Loop 233 Blocker Re-Evaluation

Loop 233 blocked before restore because listen preflight returned:

```txt
loop233_local_cluster_loopback_only=false
loop233_external_interface_listen_detected=true
loop233_restore_attempt_count=0
loop233_pg_restore_exit_code=not_executed
```

After Loop 235, the blocker is treated as likely classifier false positive, not confirmed external listen.

```txt
loop233_blocker_false_positive_likely=true
confirmed_external_listen=false
retry_gate_can_resume=true
immediate_restore_allowed=false
```

## Target DB Current State

Loop 233 dropped the previously retained owner-aligned target DB.

```txt
target_db_currently_absent=true
target_db_exists_after_drop=false
cleanup_required=false
prior_target_db_name=amami_line_crm_restore_drill_loop231_20260630
next_target_db_candidate=amami_line_crm_restore_drill_loop237_20260630
```

Loop 237 must create a fresh disposable owner-aligned target DB before retrying pre-data restore.

## Loop 237 Execution Boundary

Recommended next Loop:

```txt
selected_next_loop=Loop 237: owner-aligned target DB reprovision and pre-data retry execution
selected_next_loop_reason=loop235_loopback_confirmed_and_loop233_target_db_dropped
```

Loop 237 may combine the reprovision and one pre-data retry so the restore drill can move forward with a single controlled execution Loop.

### Allowed In Loop 237

- Confirm local git state is clean.
- Reconfirm local cluster listen safety.
- Confirm backup artifact metadata and checksum.
- Create one fresh local-only disposable owner-aligned target DB.
- Verify target DB identity and owner alignment.
- Confirm explicit `pg_restore` path/version.
- Run exactly one pre-data restore retry with:

```txt
--section=pre-data --no-owner --no-privileges
```

- Save raw stdout/stderr to repo-external root-only diagnostic log.
- Record only sanitized metadata in docs.
- Drop target DB after retry by default.
- Commit result locally.

### Forbidden In Loop 237

- Supabase or production DB connection.
- Production restore.
- `SUPABASE_DB_URL` use.
- Role creation/change.
- Cluster config change.
- Restart/reload.
- Package/firewall change.
- Backup artifact copy into repo.
- Raw log display.
- Dump content display.
- Row content display.
- Object name, SQL statement, or role name display.
- Multiple restore retries.
- Push. Push must be a separate push-only Loop.

## Loop 237 Go / No-Go

Go:

- `git status` is clean.
- Local cluster is online.
- `local_cluster_loopback_only=true`.
- `external_interface_listen_detected=false`.
- Backup artifact exists.
- Backup artifact file permission is `600`.
- Backup artifact parent directory permission is `700`.
- Backup artifact checksum matches.
- Target DB candidate does not already exist.
- Owner alignment can be verified without role creation/change.
- Raw log directory can be created repo-external root-only.

No-Go:

- `local_cluster_loopback_only=false`.
- `external_interface_listen_detected=true`.
- Backup artifact checksum mismatch.
- Target DB candidate already exists.
- Owner alignment cannot be verified.
- Raw log directory cannot be created.
- Secret, DB URL, raw log, dump content, or row content exposure would be required.
- Supabase or production connection risk is detected.

## Cleanup Policy

Loop 237 should drop the target DB after the retry by default, regardless of success/failure.

Required fields:

```txt
restore_target_dropped=true_or_false
target_db_exists_after_drop=true_or_false
cleanup_required=true_or_false
```

If the drop fails:

```txt
cleanup_required=true
selected_next_loop=Loop 238: restore target cleanup-only
```

## Loop 237 Branching

```txt
loop237_success_next=Loop 238: pre-data success follow-up and data-only restore gate
loop237_failed_permission_auth_next=Loop 238: owner-aligned pre-data permission/auth follow-up
loop237_failed_schema_extension_next=Loop 238: pre-data schema extension remediation gate
loop237_blocked_next=Loop 238: pre-data retry blocked follow-up
loop237_cleanup_failure_next=Loop 238: restore target cleanup-only
```

## Safety

```txt
docs_only=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
role_created=false
role_modified=false
cluster_modified=false
cluster_restarted=false
cluster_reloaded=false
firewall_modified=false
package_modified=false
backup_artifact_used=false
backup_artifact_copied_into_repo=false
diagnostic_log_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
dump_content_displayed=false
row_content_displayed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
loop235_listen_scope_confirmed=true
loop233_blocker_false_positive_likely=true
target_db_currently_absent=true
next_loop_selected=true
dr_readiness_status=not_ready_restore_failed
```

## Verification

```txt
git_status_checked=true
git_diff_check_required=true
docs_link_check_required=true
secret_pattern_boolean_check_required=true
lint_required=true
typecheck_skipped_reason=docs_only_runtime_code_unchanged
test_skipped_reason=docs_only_runtime_code_unchanged
```
