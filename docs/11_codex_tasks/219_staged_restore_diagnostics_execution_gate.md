# Loop 219: Staged Restore Diagnostics Execution Gate

## Purpose

Loop 218 planned staged restore diagnostics after the operator-only review returned `unknown_after_operator_review`. Role placeholder remediation is still No-Go, and restore has not succeeded.

This Loop selects the first future diagnostic stage and defines the execution boundary for the next Loop. It does not execute restore, `pg_restore`, `psql`, target DB creation, role changes, Supabase connection, production restore, or raw output display.

## Scope

- Compare staged diagnostic candidates.
- Select exactly one first diagnostic stage for the next Loop.
- Define the next Loop execution boundary.
- Define Go/No-Go conditions.
- Update restore drill runbook, dev log, Obsidian, handoff latest files, DR matrix, verification matrix, README, and docs index.
- Commit and push this docs-only gate.

## Out of Scope

- Restore execution.
- `pg_restore` execution.
- `pg_restore --list` body display.
- `psql` execution.
- Target DB creation or change.
- `CREATE ROLE`, `DROP ROLE`, or `ALTER ROLE`.
- Diagnostic log display, `cat`, `head`, `tail`, `less`, or `strings`.
- Diagnostic log repo copy.
- Backup artifact repo copy.
- Dump content display.
- Row content display.
- TOC body display.
- Object name, table name, function name, policy name, SQL statement, or role name display.
- Supabase connection.
- Production DB connection or production restore.
- DB URL, `.env`, or secret file display.
- Package, cluster, DB, migration, RLS, schema, or production runtime change.
- LINE real send.
- OpenAI API call.
- Nginx, DNS, HTTPS, certbot, or public smoke.

## Loop 218 Result Summary

```txt
operator_subcategory_selected=unknown_after_operator_review
operator_subcategory_confidence=low
role_placeholder_no_go=true
staged_restore_diagnostics_plan_created=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
role_created=false
raw_log_displayed=false
toc_body_displayed=false
dr_readiness_status=not_ready_restore_failed
```

## Candidate Comparison

| Candidate | What it can answer | Relative risk | Target DB needed | Selected order |
| --- | --- | --- | --- | --- |
| TOC count / section count only | What restore sections exist, without exposing TOC entries or object names. | Lowest | No | 1 |
| pre-data only | Whether schema/pre-data setup fails before data load. | Medium | Yes | 2 |
| schema-only | Whether schema-level restore fails without data. | Medium | Yes | 3 |
| data only | Whether data-phase restore fails after schema is prepared. | Higher | Yes | Later |
| post-data only | Whether indexes, constraints, policies, ACL residue, or post-data objects fail. | Higher | Yes | Later |

## Selected Next Diagnostic Stage

```txt
next_diagnostic_stage_selected=true
selected_next_diagnostic_stage=toc_count_only
selected_next_diagnostic_stage_reason=lowest_risk_no_target_db_required
role_placeholder_selected=false
restore_retry_selected=false
```

TOC count / section count only is selected first because it can gather phase-level structure without creating a target DB or running a restore. It still must treat the TOC body as sensitive because TOC entries may contain object, table, function, policy, or schema names.

## Next Loop Execution Boundary

Recommended next Loop:

```txt
Loop 220: TOC count-only staged restore diagnostic execution
```

Loop 220 may be allowed, after explicit operator approval, to run exactly one TOC count-only diagnostic using PostgreSQL 17 explicit path tooling. It must not display the TOC body.

Required boundary:

```txt
pg_restore_17_explicit_path_required=true
bare_pg_restore_allowed=false
diagnostic_phase=toc_count_only
diagnostic_attempt_count=1
target_db_created=false
target_db_required=false
raw_stdout_stderr_repo_external_root_only=true
toc_body_repo_external_root_only=true
toc_body_displayed=false
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

Allowed future result fields:

```txt
diagnostic_phase=toc_count_only
pg_restore_version_checked=true/false
toc_count_diagnostic_executed=true/false
toc_total_entry_count=<number_or_not_executed>
toc_section_pre_data_count=<number_or_not_executed>
toc_section_data_count=<number_or_not_executed>
toc_section_post_data_count=<number_or_not_executed>
toc_unknown_section_count=<number_or_not_executed>
pg_restore_exit_code=<number_or_not_executed>
sanitized_category=<allowlisted_category_or_unknown>
toc_body_displayed=false
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

## Go / No-Go

Go to Loop 220 only if:

- Operator explicitly approves a single TOC count-only diagnostic.
- `pg_restore` 17 explicit path is used.
- TOC body is redirected to a repo-external root-only file.
- Only counts, section classification, exit code, and sanitized category are recorded.
- No target DB is created.
- No restore is run.
- No TOC entry, object name, table name, function name, policy name, SQL statement, role name, row content, dump content, DB URL, or secret is displayed.

No-Go if:

- TOC body must be displayed.
- Object/table/function/policy/role names must be recorded.
- SQL statements or matching lines must be recorded.
- A target DB is required.
- Production or Supabase connection is required.
- More than one diagnostic is needed.
- Any raw output would enter docs, chat, commits, or handoff files.

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
toc_body_displayed=false
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
staged_diagnostics_gate_created=true
next_stage_selected=true
selected_next_diagnostic_stage=toc_count_only
dr_readiness_status=not_ready_restore_failed
```

