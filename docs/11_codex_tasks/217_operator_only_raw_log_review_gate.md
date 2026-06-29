# Loop 217: Operator-Only Raw Log Review Gate

## Purpose

Loop 216 left the remaining Loop 213 role/ACL restore signal as `unknown_role_acl_subcategory_detected=true`.

This Loop defines a safe operator-only raw log review gate. Codex does not read, display, copy, or summarize raw diagnostic log content. The operator may inspect the repo-external root-only diagnostic log directly and return only sanitized `key=value` output.

Restore remains failed and DR readiness remains incomplete.

## Scope

- Record the Loop 216 sanitized result.
- Define the operator-only review protocol.
- Define the exact sanitized `key=value` response format.
- Add an operator result placeholder.
- Define next-Loop branching based on the sanitized result.
- Update restore drill runbook, dev log, Obsidian, handoff latest files, and DR/verification matrices.
- Commit the docs-only gate.

## Out of Scope

- Diagnostic log display, copy, `cat`, `head`, `tail`, `less`, `strings`, or matching-line output.
- Raw log, matching line, role name, SQL statement, object name, dump content, row content, DB URL, or secret recording.
- Restore retry.
- `pg_restore` restore execution.
- `pg_restore --list` full display.
- `psql`.
- Target DB creation or change.
- `CREATE ROLE`, `DROP ROLE`, or `ALTER ROLE`.
- Backup artifact handling.
- Supabase connection.
- Production DB connection or production restore.
- Package, cluster, DB, migration, RLS, schema, or runtime change.
- LINE real send.
- OpenAI API call.
- Nginx, DNS, HTTPS, certbot, or public smoke.
- Push.

## Loop 216 Sanitized Result

```txt
remaining_signal=unknown_role_acl_subcategory
unknown_role_acl_subcategory_count=1
role_placeholder_signal_detected=false
allowlisted_supabase_role_signal_detected=false
raw_log_displayed=false
matching_line_displayed=false
role_name_displayed=false
sql_statement_displayed=false
object_name_displayed=false
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
```

## Operator-Only Review Protocol

The operator may inspect the Loop 213 diagnostic log only in the repo-external root-only environment. Codex must not open or display that log.

The operator must return only the sanitized fields below. If any value would require exposing raw content, a matching line, a role name, a SQL statement, an object name, dump content, row content, a DB URL, a secret, or PII, the operator should return `unknown_after_operator_review`.

```txt
operator_raw_log_review_executed=true/false
operator_raw_log_review_scope=loop213_diagnostic_log
operator_raw_log_shared_with_codex=false
operator_raw_log_shared_with_chatgpt=false
operator_raw_log_committed=false
operator_raw_log_copied_into_repo=false

operator_subcategory_selected=<one_of_allowed_categories>
operator_subcategory_confidence=high/medium/low
operator_role_name_disclosed=false
operator_sql_statement_disclosed=false
operator_object_name_disclosed=false
operator_matching_line_disclosed=false

role_does_not_exist_confirmed=true/false/unknown
owner_required_confirmed=true/false/unknown
acl_grant_revoke_confirmed=true/false/unknown
default_privileges_confirmed=true/false/unknown
policy_owner_confirmed=true/false/unknown
extension_owner_confirmed=true/false/unknown
publication_subscription_owner_confirmed=true/false/unknown
security_definer_owner_confirmed=true/false/unknown
extension_missing_confirmed=true/false/unknown
schema_or_sql_statement_confirmed=true/false/unknown
target_cluster_issue_confirmed=true/false/unknown
other_non_sensitive_category_confirmed=true/false/unknown
```

Allowed categories:

```txt
role_does_not_exist
owner_required
acl_grant_revoke
default_privileges
policy_owner
extension_owner
publication_subscription_owner
security_definer_owner
extension_missing
schema_or_sql_statement
target_cluster_issue
other_non_sensitive_category
unknown_after_operator_review
```

## Operator Warning

- Do not paste raw log text into ChatGPT, Codex, docs, commits, or handoff files.
- Do not paste matching lines.
- Do not paste role names.
- Do not paste SQL statements.
- Do not paste object names.
- Do not paste dump content.
- Do not paste row content.
- Stop if DB URLs or secrets might be exposed.
- Return sanitized `key=value` only.
- If unsure, use `unknown_after_operator_review`.
- Do not create roles or retry restore in this Loop.

## Operator Result Placeholder

```txt
operator_raw_log_review_status=pending_operator_input
operator_raw_log_review_executed=false
operator_subcategory_selected=pending
operator_subcategory_confidence=unknown
operator_sanitized_result_recorded=false
operator_raw_log_shared_with_codex=false
operator_raw_log_shared_with_chatgpt=false
operator_raw_log_committed=false
operator_raw_log_copied_into_repo=false
```

## Next Loop Branching

| Operator subcategory | Next Loop candidate | Boundary |
| --- | --- | --- |
| `role_does_not_exist` | Loop 218: allowlisted role placeholder preflight without restore | Do not record role names. Plan disposable `NOLOGIN` placeholder and cleanup before any creation. |
| `owner_required` | Loop 218: staged restore diagnostics plan | Do not create roles. Consider pre-data/data/post-data diagnostics before another retry. |
| `acl_grant_revoke` | Loop 218: staged restore diagnostics plan | Avoid accepting nonzero. Keep raw lines hidden. |
| `default_privileges` | Loop 218: staged restore diagnostics plan | Treat as privilege residue; no role changes yet. |
| `policy_owner` | Loop 218: staged restore diagnostics plan | Review phase and policy handling without raw SQL exposure. |
| `security_definer_owner` | Loop 218: staged restore diagnostics plan | Review phase and function/security boundary without raw SQL exposure. |
| `extension_owner` | Loop 218: extension remediation preflight | Plan local target extension checks only; no restore. |
| `extension_missing` | Loop 218: extension remediation preflight | Plan extension availability checks only; no install yet. |
| `schema_or_sql_statement` | Loop 218: staged restore diagnostics plan | Classify restore phase without exposing SQL text. |
| `target_cluster_issue` | Loop 218: local restore target health gate | Verify local target health only; no restore. |
| `other_non_sensitive_category` | Loop 218: staged restore diagnostics plan | Keep operator-provided category sanitized. |
| `unknown_after_operator_review` | Loop 218: staged restore diagnostics plan | Treat raw review as inconclusive and move to phase-level diagnostics. |
| `pending` | Wait for operator sanitized result | Do not proceed to role creation or restore retry. |

## Go / No-Go

Go:

- Loop 216 result is summarized.
- Operator-only review protocol is documented.
- Sanitized `key=value` format is documented.
- Raw log exposure boundary is explicit.
- Next Loop branching is defined.
- Obsidian and handoff latest files are updated.

No-Go:

- Raw log text, matching line, role name, SQL statement, object name, dump content, row content, DB URL, secret, or PII would need to be recorded.
- Production or Supabase connection is required.
- Restore retry is required.
- Role creation or target DB creation is required.
- Obsidian or handoff files are not updated.

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
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
target_db_created=false
role_created=false
role_modified=false
diagnostic_log_displayed=false
diagnostic_log_read_by_codex=false
diagnostic_log_copied_into_repo=false
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
operator_review_protocol_created=true
operator_sanitized_result_recorded=false
next_loop_branching_defined=true
dr_readiness_status=not_ready_restore_failed
push_performed=false
```

