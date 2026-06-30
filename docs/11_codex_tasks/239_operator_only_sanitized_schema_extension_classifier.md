# Loop 239: Operator-Only Sanitized Schema Extension Classifier

## Purpose

Loop 237 showed that the owner-aligned pre-data restore retry moved away from permission/auth and role/ACL signals, while schema/extension signals remain:

```txt
permission_or_auth_error_count=0
role_owner_acl_error_count=0
schema_or_sql_statement_error_count=1
extension_missing_count=2
```

Loop 239 defines and records an operator-only sanitized schema/extension classifier. Codex does not read, display, copy, or summarize the repo-external root-only diagnostic log. Only sanitized `key=value` fields may be recorded.

## Scope

- Summarize Loop 237 and Loop 238 sanitized results.
- Define the operator-only schema/extension review protocol.
- Define the allowed sanitized `key=value` result format.
- Record the current operator result status.
- Select one next Loop.
- Update runbook, dev log, Obsidian, handoff, DR readiness matrix, verification matrix, README, and docs index.
- Commit after validation.

## Out of Scope

- Restore retry.
- `pg_restore`.
- `psql`.
- Target DB creation or modification.
- Extension creation.
- Schema modification.
- Role creation or modification.
- Cluster changes, restart, reload, package changes, or firewall changes.
- Diagnostic/raw log display.
- Diagnostic log `cat`, `head`, `tail`, `less`, or `strings`.
- Matching line display.
- Exact SQL statement display.
- Object, table, function, policy, extension, or role name display.
- Dump content or row content display.
- Backup artifact operations.
- Supabase or production DB connection.
- DB URL, `.env`, or secret display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, or production runtime changes.
- Push.

## Loop 237 / 238 Result Summary

```txt
loop_237_restore_attempt_count=1
loop_237_pg_restore_exit_code=1
loop_237_pre_data_retry_status=failed
permission_or_auth_error_count=0
role_owner_acl_error_count=0
schema_or_sql_statement_error_count=1
extension_missing_count=2
target_db_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
raw_log_displayed=false
sql_displayed=false
object_names_displayed=false
extension_names_displayed=false
role_names_displayed=false
dump_content_displayed=false
row_content_displayed=false
supabase_connection_executed=false
production_restore_executed=false
loop_238_schema_extension_remediation_gate_created=true
loop_238_restore_retry_no_go=true
loop_238_data_restore_no_go=true
dr_readiness_status=not_ready_restore_failed
```

## Operator-Only Review Protocol

The operator may review the repo-external root-only diagnostic log outside Codex. Codex may receive only sanitized `key=value` output.

Codex must reject and not record any response containing:

- Raw diagnostic log text.
- Matching lines.
- SQL statements.
- Object names.
- Table names.
- Function names.
- Policy names.
- Extension names.
- Role names.
- Dump contents.
- Row contents.
- DB URLs.
- Secrets or `.env` values.

## Allowed Sanitized Key/Value Format

```txt
operator_raw_log_review_executed=true_or_false
operator_raw_log_review_scope=loop237_pre_data_diagnostic_log
operator_raw_log_shared_with_codex=false
operator_raw_log_shared_with_chatgpt=false
operator_raw_log_committed=false
operator_raw_log_copied_into_repo=false

extension_missing_count=2
extension_name_disclosed=false
extension_category_known=true_or_false
extension_category_standard_postgres=true_or_false
extension_category_supabase_related=true_or_false
extension_category_optional_observability=true_or_false
extension_category_unknown=true_or_false

schema_error_count=1
schema_error_category=extension_dependency_or_schema_exists_or_permission_or_function_language_or_type_or_domain_or_other_non_sensitive_category_or_unknown
schema_error_confidence=high_or_medium_or_low

sql_line_disclosed=false
object_name_disclosed=false
role_name_disclosed=false
raw_log_disclosed=false
dump_content_disclosed=false
row_content_disclosed=false
```

## Operator Result Status

No operator sanitized result was provided during Loop 239.

```txt
operator_schema_extension_review_status=pending_operator_input
operator_sanitized_result_recorded=false
extension_category_known=false
schema_error_category=unknown_pending_operator_input
schema_error_confidence=unknown
```

## Branching Rules

| Sanitized result | Next Loop direction |
| --- | --- |
| `extension_category_standard_postgres=true` | Standard extension preflight without restore. |
| `extension_category_supabase_related=true` | Supabase-specific extension compatibility gate. |
| `extension_category_optional_observability=true` | Optional extension restore fidelity decision gate. |
| `schema_error_category=extension_dependency` | Extension dependency remediation gate. |
| `schema_error_category=function_language` | Function language compatibility gate. |
| `schema_error_category=permission` | Schema permission follow-up gate. |
| `schema_error_category=unknown` or no operator result | Operator sanitized result collection. |

## Selected Next Loop

Because no operator sanitized result is available yet, the next Loop is:

```txt
selected_next_loop=Loop 240: operator sanitized schema extension result collection
selected_next_loop_reason=collect_operator_key_value_result_without_raw_log_or_exact_name_exposure
restore_retry_no_go=true
extension_creation_no_go=true
schema_change_no_go=true
```

## Go / No-Go

Go:

- Loop 237 / 238 sanitized result is summarized.
- Operator-only protocol is documented.
- Allowed `key=value` format is documented.
- Operator result status is recorded as pending.
- Next Loop is singular and bounded.
- Obsidian and handoff are updated.

No-Go:

- Raw log, matching line, SQL, object name, extension name, or role name must be recorded.
- Production/Supabase connection is required.
- DB changes, schema changes, role changes, or extension creation are required.
- Restore retry is required.
- Obsidian or handoff updates are missing.

## Safety

```txt
docs_only=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_modified=false
extension_created=false
schema_modified=false
role_created=false
role_modified=false
cluster_modified=false
cluster_restarted=false
cluster_reloaded=false
package_modified=false
backup_artifact_touched=false
backup_artifact_copied_into_repo=false
diagnostic_log_displayed=false
diagnostic_log_copied_into_repo=false
raw_log_displayed=false
matching_line_displayed=false
sql_displayed=false
object_names_displayed=false
extension_names_displayed=false
role_names_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
push_performed=false
dr_readiness_status=not_ready_restore_failed
```
