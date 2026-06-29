# Loop 221: Pre-Data Only Restore Diagnostic Gate

## Purpose

Loop 220 completed the TOC count-only diagnostic and selected `pre_data_only_restore_diagnostic_gate` as the next staged diagnostic.

This Loop defines the gate for running one future pre-data only restore diagnostic. It does not execute restore, run `pg_restore`, run `psql`, create a target DB, connect to Supabase, connect to production, create roles, display logs, display object names, or change runtime.

## Scope

- Summarize the Loop 220 TOC count-only result.
- Define the future pre-data only diagnostic execution boundary.
- Define when a fresh local isolated target DB may be created in the next Loop.
- Require PostgreSQL 17 explicit `pg_restore` path.
- Require raw stdout/stderr to be stored in a repo-external root-only diagnostic log.
- Prohibit object/table/function/policy/role names, SQL statements, dump content, row content, DB URLs, and secrets from docs, chat, commits, and handoff files.
- Define success/failure classification, cleanup rules, and Go/No-Go.
- Update restore drill runbook, dev log, Obsidian, handoff latest files, DR matrix, verification matrix, README, and docs index.
- Commit and push after validation.

## Out of Scope

- Restore execution.
- `pg_restore` restore execution.
- `pg_restore --list` body display.
- `psql` execution.
- Target DB creation or change.
- Role creation, deletion, or modification.
- Package or cluster changes.
- Diagnostic log display.
- TOC body display.
- Object, table, function, policy, role, or SQL statement display.
- Dump content or row content display.
- Backup artifact copy into the repository.
- Supabase connection.
- Production DB connection.
- Production restore.
- DB URL, `.env`, or secret file display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, or production runtime changes.

## Loop 220 Result Summary

```txt
pg_restore_list_exit_code=0
toc_total_entries_count=462
toc_pre_data_count=186
toc_data_count=46
toc_post_data_count=230
toc_acl_entries_count=0
toc_default_acl_entries_count=0
toc_unknown_section_count=0
toc_body_displayed=false
object_name_displayed=false
table_name_displayed=false
function_name_displayed=false
policy_name_displayed=false
sql_statement_displayed=false
role_name_displayed=false
selected_next_stage=pre_data_only_restore_diagnostic_gate
dr_readiness_status=not_ready_restore_failed
```

## Pre-Data Only Execution Boundary

Future Loop 222 may execute exactly one pre-data only diagnostic only after explicit operator approval.

Required command boundary:

```txt
diagnostic_phase=pre_data_only
diagnostic_attempt_count=1
pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
pg_restore_17_explicit_path_required=true
bare_pg_restore_allowed=false
pg_restore_options_required=--section=pre-data --no-owner --no-privileges
target_db_required=true
target_db_scope=local_isolated_postgresql_only
target_db_host=localhost
supabase_connection_allowed=false
production_db_connection_allowed=false
production_restore_allowed=false
```

Output handling:

```txt
raw_stdout_stderr_destination=repo_external_root_only_diagnostic_log
diagnostic_log_permission_required=600
diagnostic_log_dir_permission_required=700
diagnostic_log_displayed=false
diagnostic_log_committed=false
object_name_displayed=false
table_name_displayed=false
function_name_displayed=false
policy_name_displayed=false
sql_statement_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
```

## Fresh Target DB Conditions

Loop 222 may create a fresh local isolated target DB only if all conditions are true:

- The operator approves one pre-data diagnostic attempt.
- The target host is localhost on the VPS isolated PostgreSQL cluster.
- The target DB name clearly includes `restore_drill`, `pre_data`, and a Loop/timestamp marker.
- The target DB is not derived from `SUPABASE_DB_URL`.
- Runtime services are not pointed at the target DB.
- The target DB can be dropped after the attempt, or explicitly recorded as quarantined.
- No migration, RLS, schema change outside the isolated target, package change, cluster change, production runtime change, or Supabase connection is bundled.

No target DB may be created in Loop 221.

## Success / Failure Classification

Success:

```txt
pg_restore_exit_code=0
diagnostic_phase=pre_data_only
phase_success=true
phase_failure_detected=false
target_db_dropped_or_isolated=true
raw_log_displayed=false
secrets_recorded=false
```

Failure:

```txt
pg_restore_exit_code=nonzero
diagnostic_phase=pre_data_only
phase_success=false
phase_failure_detected=true
phase_failure_category=<allowlisted_category_or_unknown>
raw_log_displayed=false
matching_line_displayed=false
object_name_displayed=false
sql_statement_displayed=false
role_name_displayed=false
target_db_dropped_or_isolated=true
cleanup_required=true/false
```

Allowed sanitized categories:

- `pre_data_extension_error_detected`
- `pre_data_schema_statement_error_detected`
- `pre_data_role_owner_acl_error_detected`
- `pre_data_permission_error_detected`
- `pre_data_target_cluster_error_detected`
- `pre_data_unknown_without_raw_log`
- `pre_data_success`

## Cleanup Policy

Loop 222 must record one of:

```txt
target_db_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
```

or:

```txt
target_db_quarantined=true
target_db_network_scope=localhost_only
cleanup_required=true
cleanup_reason=<sanitized_reason>
```

Quarantine is allowed only if dropping the target would hide required sanitized metadata. It must still avoid row content and raw log display.

## Go / No-Go

Go to Loop 222 only if:

- The operator explicitly approves one pre-data only diagnostic execution.
- The command uses `/usr/lib/postgresql/17/bin/pg_restore`.
- The target is a fresh local isolated DB.
- Raw stdout/stderr goes to a repo-external root-only diagnostic log.
- All reported output is sanitized count/boolean/exit-code/category only.
- The cleanup plan is written before execution.

No-Go if:

- Any raw diagnostic log, matching line, object name, table name, function name, policy name, SQL statement, role name, dump content, row content, DB URL, `.env`, or secret must be displayed.
- A production or Supabase connection is required.
- More than one attempt is needed.
- The step expands into data/post-data restore.
- Package, cluster, runtime, migration, RLS, schema, LINE, OpenAI, Nginx, DNS, HTTPS, or certbot work is requested in the same Loop.

## Verification

```txt
git_diff_check=required
docs_link_check=required
secret_pattern_check=required
lint=required
typecheck=skipped_docs_only
test=skipped_docs_only
test_integration=skipped_docs_only
```

## Safety

```txt
docs_only=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_changed=false
role_created=false
role_modified=false
diagnostic_log_displayed=false
object_name_displayed=false
table_name_displayed=false
function_name_displayed=false
policy_name_displayed=false
sql_statement_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
package_changed=false
cluster_changed=false
production_runtime_changed=false
pre_data_diagnostic_gate_created=true
loop_222_pre_data_execution_ready=true
dr_readiness_status=not_ready_restore_failed
```

## Next Loop

```txt
Loop 222: pre-data only restore diagnostic execution
```
