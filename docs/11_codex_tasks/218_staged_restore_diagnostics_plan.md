# Loop 218: Staged Restore Diagnostics Plan

## Purpose

Loop 213's isolated restore retry with `--no-owner --no-privileges` still exited with code `1`. Loop 216 could not classify the remaining one role/ACL signal using category-only counts. Loop 217 established an operator-only raw log review gate.

The operator-only review returned only sanitized metadata: the diagnostic log exists, is one line / 167 bytes, has `pg_restore_error_count=1` and `pg_restore_fatal_count=1`, and does not match the existing role/owner/ACL/extension/schema/target-cluster categories.

This Loop plans staged restore diagnostics so the next execution Loop can determine which restore phase fails without exposing raw logs, TOC content, role names, SQL statements, object names, dump contents, row contents, DB URLs, or secrets.

## Scope

- Record the Loop 217 operator sanitized result.
- Mark role placeholder remediation as No-Go for now.
- Define a staged restore diagnostics plan.
- Define future diagnostic candidates:
  - pre-data only
  - data only
  - post-data only
  - schema-only
  - list/TOC count and section classification only
- Define no-raw-output diagnostic rules.
- Define success/failure criteria.
- Update restore drill runbook, dev log, Obsidian, handoff latest files, DR matrix, verification matrix, README, and docs index.
- Commit and push this docs-only plan.

## Out of Scope

- Restore execution.
- `pg_restore` execution.
- `pg_restore --list` full display.
- `psql` execution.
- Target DB creation or change.
- `CREATE ROLE`, `DROP ROLE`, or `ALTER ROLE`.
- Diagnostic log body display.
- Matching line display.
- Role name display.
- SQL statement display.
- Object name display.
- Dump content display.
- Row content display.
- Supabase connection.
- Production DB connection or production restore.
- DB URL display.
- `.env` or secret file display.
- Backup artifact repo copy.
- Package, cluster, DB, migration, RLS, schema, or production runtime change.
- LINE real send.
- OpenAI API call.
- Nginx, DNS, HTTPS, certbot, or public smoke.

## Operator Sanitized Result

```txt
operator_raw_log_review_executed=true
operator_subcategory_selected=unknown_after_operator_review
operator_subcategory_confidence=low
log_exists=true
log_size_bytes=167
log_line_count=1
pg_restore_error_count=1
pg_restore_fatal_count=1
pg_restore_warning_count=0
pg_restore_toc_count=0
pg_restore_ignored_errors_count=0
role_does_not_exist_confirmed=false
owner_required_confirmed=false
acl_grant_revoke_confirmed=false
default_privileges_confirmed=false
policy_owner_confirmed=false
extension_owner_confirmed=false
extension_missing_confirmed=false
schema_or_sql_statement_confirmed=false
target_cluster_issue_confirmed=false
raw_log_displayed=false
matching_line_displayed=false
role_name_disclosed=false
sql_statement_disclosed=false
object_name_disclosed=false
```

## Decision

Role placeholder remediation is No-Go at this point.

Reason:

- `operator_subcategory_selected=unknown_after_operator_review`
- `role_does_not_exist_confirmed=false`
- `role_placeholder_signal_detected=false` from Loop 216
- No role name may be disclosed or recorded
- Creating a PostgreSQL role without a confirmed category would introduce global-state risk without evidence

Next direction: plan staged restore diagnostics. Do not create roles or retry the full restore yet.

## Staged Restore Diagnostics Plan

Future diagnostics should split restore into narrow phases against a fresh isolated non-production target. Each future execution Loop must have explicit approval and may run only one small diagnostic at a time.

| Candidate | Purpose | Future execution boundary | Raw output rule |
| --- | --- | --- | --- |
| pre-data only | Determine whether schema/pre-data setup fails before data load. | Fresh isolated target only; one attempt. | Raw output to repo-external root-only log only. |
| data only | Determine whether table data restore fails after schema is prepared. | Only after a safe pre-data plan exists. | Count-only sanitized result; no rows displayed. |
| post-data only | Determine whether indexes, constraints, policies, ACL residue, or post-data objects fail. | Only after pre-data/data prerequisites are clear. | Count/category only; no SQL/object names. |
| schema-only | Determine whether schema-level restore is the failure zone. | Fresh isolated target; no production connection. | No schema SQL text displayed. |
| list/TOC count | Count TOC sections without displaying entries. | `pg_restore --list` body must stay repo-external root-only. | Section/count only; no TOC body. |

## No-Raw Diagnostic Rules

Future execution Loops must follow these rules:

- Do not display raw restore logs.
- Do not display matching lines.
- Do not display role names.
- Do not display SQL statements.
- Do not display object names.
- Do not display TOC entries.
- Do not display dump contents.
- Do not display row contents.
- Do not display DB URLs or secrets.
- Store raw outputs, if produced by a future approved execution Loop, only in repo-external root-only files.
- Record only booleans, counts, phase name, exit code, and allowlisted failure category.

## Future Sanitized Result Shape

```txt
diagnostic_phase=pre_data_only|data_only|post_data_only|schema_only|toc_count_only
diagnostic_attempt_count=1
pg_restore_exit_code=<number_or_not_executed>
phase_success=true/false
phase_failure_detected=true/false
phase_failure_category=<allowlisted_category_or_unknown>
raw_log_displayed=false
matching_line_displayed=false
role_name_disclosed=false
sql_statement_disclosed=false
object_name_disclosed=false
toc_body_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
target_db_dropped_or_isolated=true/false
cleanup_required=true/false
```

Allowlisted phase categories:

```txt
pre_data_failure
data_failure
post_data_failure
schema_only_failure
toc_classification_failure
role_acl_signal
extension_signal
schema_or_sql_signal
target_cluster_signal
unknown_after_staged_diagnostics
```

## Success / Failure Criteria

Success for a future staged diagnostic:

- The selected phase runs exactly once in an isolated target.
- Raw output remains repo-external and root-only.
- Sanitized result records exit code, phase status, and category/count only.
- Target is dropped or explicitly isolated after the attempt.
- No DB URL, secret, raw log, role name, SQL statement, object name, TOC entry, dump content, or row content is recorded.

Failure / Stop:

- Any raw output would need to be pasted into docs/chat.
- Any role name, SQL statement, object name, TOC body, row content, DB URL, or secret would need to be recorded.
- Target identity is unclear.
- Production or Supabase connection is required.
- More than one diagnostic attempt is needed.
- Cleanup status is unclear.

## Next Loop Candidate

Recommended next Loop:

```txt
Loop 219: staged restore diagnostics execution gate
```

Loop 219 should select exactly one diagnostic phase, define the execution command boundary without running it unless explicitly approved, and keep raw output hidden.

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
diagnostic_log_body_displayed=false
pg_restore_list_body_displayed=false
matching_line_displayed=false
role_name_displayed=false
sql_statement_displayed=false
object_name_displayed=false
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
dr_readiness_status=not_ready_restore_failed
```

