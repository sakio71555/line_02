# Loop 232: Owner-Aligned Pre-Data Restore Retry Gate

## Purpose

Loop 231 provisioned the owner-aligned target DB for the next restore drill step:

```txt
target_db=amami_line_crm_restore_drill_loop231_20260630
target_db_owner_aligned=true
target_db_retained=true
cleanup_required=true
local_cluster_loopback_only=true
external_interface_listen_detected=false
dr_readiness_status_before=not_ready_restore_failed
```

Loop 232 is a docs-only gate for the next step: one owner-aligned pre-data restore retry against the retained local target DB.

This Loop does not run restore, does not run `pg_restore`, does not run `psql`, does not create or modify the target DB, does not modify roles, does not modify the cluster, does not touch the backup artifact, and does not connect to Supabase or production DB.

## Scope

- Summarize the Loop 231 result.
- Define the owner-aligned pre-data retry boundary for the next Loop.
- Define the exact options and attempt limit for the future retry.
- Define raw log handling.
- Define cleanup and retention policy.
- Define Go/No-Go conditions.
- Update runbook, dev log, Obsidian log, handoff files, and DR/verification matrices.

## Out Of Scope

- Restore execution.
- `pg_restore` execution.
- `psql` execution.
- Target DB creation or modification.
- Role creation or modification.
- Cluster/package/firewall/runtime changes.
- Backup artifact copy into the repository.
- Supabase or production DB connection.
- DB URL, secret, raw log, dump content, row content, object name, table name, SQL statement, or role detail display.
- LINE, OpenAI, Nginx, DNS, HTTPS, or certbot operations.

## Loop 231 Result Summary

```txt
loop_231_commit=456de70 docs: record owner-aligned target DB provisioning
target_cluster=17/restore_drill_loop2091
target_cluster_port=55432
local_cluster_loopback_only=true
external_interface_listen_detected=false
target_db=amami_line_crm_restore_drill_loop231_20260630
target_db_exists_after_create=true
target_db_owner_aligned=true
future_restore_execution_user_matches_owner=true
target_db_local_only=true
target_db_retained=true
target_db_restricted=true_by_loopback_cluster
cleanup_required=true
cleanup_deadline=after_loop232_or_before_2026-07-01
restore_executed=false
pg_restore_executed=false
backup_artifact_used=false
supabase_connection_executed=false
production_restore_executed=false
```

## Pre-Data Retry Boundary

The next execution Loop should run only the pre-data section retry against the retained local target DB.

```txt
selected_next_loop=Loop 233: owner-aligned pre-data restore retry execution
target_db_reuse_allowed=true
target_db_name_required=amami_line_crm_restore_drill_loop231_20260630
target_db_must_exist_before_retry=true
target_db_owner_alignment_recheck_required=true
local_cluster_loopback_recheck_required=true
artifact_metadata_recheck_required=true
artifact_checksum_recheck_required=true
pg_restore_17_explicit_path_required=true
pg_restore_options=--section=pre-data --no-owner --no-privileges
restore_attempt_limit=1
raw_log_destination=repo_external_root_only
docs_recording=sanitized_metadata_only
```

Allowed in Loop 233:

- Check git status.
- Confirm the local restore drill cluster identity and loopback-only listen status with sanitized booleans/counts only.
- Confirm the retained target DB exists and remains owner-aligned using local metadata only.
- Confirm backup artifact metadata and checksum without displaying dump content.
- Confirm `/usr/lib/postgresql/17/bin/pg_restore --version`.
- Run exactly one `pg_restore` pre-data retry with `--section=pre-data --no-owner --no-privileges`.
- Save raw stdout/stderr to a repo-external root-only diagnostic log.
- Record only exit code, sanitized category/counts, and cleanup status.
- Drop the target DB after the attempt, or explicitly retain it only if the next gate says so.

Forbidden in Loop 233:

- Multiple restore attempts.
- Full restore, data-only restore, or post-data restore.
- Role creation or modification.
- Cluster/package/firewall/runtime changes.
- Supabase or production DB connection.
- Production restore.
- Raw log, dump content, row content, DB URL, secret, SQL statement, role detail, or object detail display.

## Cleanup Policy

The retained target DB is already marked `cleanup_required=true`.

```txt
cleanup_policy_created=true
target_db_drop_after_retry_default=true
target_db_retain_after_retry_allowed=false_unless_next_gate_approves
target_db_drop_on_failed_preflight=true
target_db_drop_on_failed_owner_alignment=true
target_db_drop_on_failed_loopback_check=false_if_no_db_change
target_db_drop_on_restore_attempt_complete=true
cleanup_required_until_drop=true
```

If Loop 233 cannot run promptly, create a cleanup-only Loop to drop `amami_line_crm_restore_drill_loop231_20260630`. The retained target DB must not be left open-ended.

## Go / No-Go

Go for Loop 233 only if all are true:

- Git status is clean.
- Target cluster is `17/restore_drill_loop2091`.
- Cluster port is `55432`.
- Listen scope remains loopback-only.
- Target DB `amami_line_crm_restore_drill_loop231_20260630` exists.
- Target DB owner alignment is still true.
- Backup artifact metadata and checksum match prior recorded values.
- PostgreSQL 17 `pg_restore` explicit path is available.
- The command is limited to `--section=pre-data --no-owner --no-privileges`.
- Attempt count is exactly one.
- Raw log stays repo-external/root-only.
- Target DB cleanup plan is explicit.

No-Go:

- Target DB missing or owner alignment is unclear.
- Cluster identity or loopback status is unclear.
- Artifact checksum cannot be verified.
- Any Supabase or production connection is required.
- Role, cluster, package, or firewall changes are needed.
- Raw log, DB URL, secret, dump content, row content, object detail, SQL statement, or role detail must be displayed.
- More than one restore attempt is requested.

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
package_modified=false
firewall_modified=false
backup_artifact_used=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
db_url_displayed=false
secrets_recorded=false
raw_log_displayed=false
diagnostic_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
owner_aligned_pre_data_retry_gate_created=true
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

## Next Loop

```txt
Loop 233: owner-aligned pre-data restore retry execution
```
