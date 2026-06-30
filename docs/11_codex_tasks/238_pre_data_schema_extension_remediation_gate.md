# Loop 238: Pre-Data Schema Extension Remediation Gate

## Purpose

Loop 237 moved the pre-data restore failure away from permission/auth and role/ACL signals and into schema/extension signals:

```txt
permission_or_auth_error_count=0
role_owner_acl_error_count=0
schema_or_sql_statement_error_count=1
extension_missing_count=2
```

Loop 238 documents the next safe remediation gate. It does not inspect raw diagnostic logs, run restore, run `pg_restore`, run `psql`, create target DBs, create extensions, change schema, change roles, change cluster config, or touch Supabase/production.

## Scope

- Summarize Loop 237 sanitized result.
- Record that permission/auth and role/ACL signals are currently resolved to count `0`.
- Treat the remaining failure area as schema/extension.
- Compare remediation candidates.
- Select one next Loop.
- Define the operator-only sanitized classifier format for Loop 239.
- Update runbook, dev log, Obsidian, handoff, DR readiness matrix, verification matrix, README, and docs index.
- Commit and push after validation.

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
- Matching line, SQL statement, object name, table name, function name, policy name, extension name, or role name display.
- Dump content or row content display.
- Backup artifact operations.
- Supabase or production DB connection.
- DB URL, `.env`, or secret display.
- LINE, OpenAI, Nginx, DNS, HTTPS, certbot, public smoke, or production runtime changes.

## Loop 237 Result Summary

```txt
restore_attempt_count=1
pg_restore_exit_code=1
pre_data_retry_status=failed
permission_or_auth_error_count=0
role_owner_acl_error_count=0
schema_or_sql_statement_error_count=1
extension_missing_count=2
target_db_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
raw_log_displayed=false
object_names_displayed=false
sql_displayed=false
role_names_displayed=false
dump_content_displayed=false
row_content_displayed=false
supabase_connection_executed=false
production_restore_executed=false
```

## Permission/Auth And Role/ACL Re-Evaluation

Loop 237 used an owner-aligned target DB and the explicit `--section=pre-data --no-owner --no-privileges` retry options. The remaining sanitized classifier output shows:

```txt
permission_auth_current_count=0
role_acl_current_count=0
owner_aligned_target_db_effective_likely=true
same_permission_auth_retry_no_go=true
same_role_acl_retry_no_go=true
```

This does not prove restore readiness, but it does indicate the next remediation should not start with permission/auth or role placeholder work.

## Remaining Schema / Extension Issues

### Extension Missing

```txt
extension_missing_count=2
extension_name_disclosed=false
extension_category_known=false
extension_category_standard_postgres=unknown
extension_category_supabase_related=unknown
extension_category_optional_observability=unknown
local_isolated_extension_installability=unknown
```

Creating extensions requires DB changes and must be split into a later execution Loop if selected.

### Schema Or SQL Statement

```txt
schema_or_sql_statement_error_count=1
sql_line_disclosed=false
object_name_disclosed=false
extension_dependency_possible=true
independent_schema_ddl_failure_possible=true
raw_log_required_for_exact_cause=true
```

Without a sanitized operator review of the root-only diagnostic log, the schema signal should not be over-interpreted.

## Remediation Candidates

| Candidate | Decision | Reason |
| --- | --- | --- |
| A. Operator-only sanitized schema extension classifier | Recommended | Gets category-level facts without exposing raw log, object names, SQL, extension names, role names, dump content, or row content. |
| B. Extension preflight without restore | Later | Useful after category is known; may need local-only `psql` or package checks and must be split. |
| C. Create standard extensions in fresh target DB | Later / gated | May help if extensions are standard PostgreSQL, but requires DB changes and exact category. |
| D. Exclude extension-related objects or accept missing extension | No-Go for now | Reduces restore fidelity and weakens DR readiness. |
| E. Retry immediately | No-Go | No new remediation has occurred, so another retry is likely to repeat failure. |

## Recommended Next Loop

```txt
selected_next_loop=Loop 239: operator-only sanitized schema extension classifier
selected_next_loop_reason=classify_schema_extension_without_restore_or_raw_log_exposure
restore_retry_no_go=true
data_restore_no_go=true
```

## Loop 239 Boundary

Allowed:

- Operator-only review of the repo-external root-only diagnostic log.
- Return sanitized `key=value` only.
- Record extension/schema category booleans and counts only.
- Keep extension names, SQL, object names, role names, raw lines, dump content, row content, DB URLs, and secrets undisclosed.
- No restore, `pg_restore`, `psql`, DB changes, extension creation, role changes, Supabase, or production connection.

Suggested sanitized response:

```txt
operator_raw_log_review_executed=true_or_false
operator_raw_log_shared_with_codex=false
operator_raw_log_shared_with_chatgpt=false
extension_missing_count=2
extension_name_disclosed=false
extension_category_known=true_or_false
extension_category_standard_postgres=true_or_false
extension_category_supabase_related=true_or_false
extension_category_optional_observability=true_or_false
schema_error_count=1
schema_error_category=extension_dependency_or_schema_exists_or_permission_or_function_language_or_type_or_domain_or_unknown
sql_line_disclosed=false
object_name_disclosed=false
role_name_disclosed=false
raw_log_disclosed=false
```

Forbidden:

- Raw log paste.
- Matching line display.
- Exact extension name display.
- SQL statement display.
- Object/table/function/policy name display.
- Role name display.
- DB URL or secret display.
- Restore retry.
- Extension creation.
- DB change.
- Supabase or production DB connection.

## Go / No-Go

Go for Loop 239:

- Loop 237 sanitized result is recorded.
- Permission/auth and role/ACL counts are recorded as `0`.
- Schema/extension is recorded as the remaining failure area.
- Operator-only sanitized classifier format is defined.
- Next Loop is singular and bounded.
- Raw log, object, SQL, extension name, role name, dump content, row content, DB URL, and secrets remain undisclosed.

No-Go:

- Any raw diagnostic log display is required.
- Exact SQL/object/extension/role names must be documented.
- Production/Supabase connection is required.
- DB changes or extension creation are required.
- Restore retry is requested before classification.
- Obsidian or handoff updates are missing.

## Cleanup

```txt
target_db_currently_absent=true
target_db_exists_after_drop=false
cleanup_required=false
```

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
backup_artifact_touched=false
backup_artifact_copied_into_repo=false
diagnostic_log_displayed=false
raw_log_displayed=false
object_names_displayed=false
sql_displayed=false
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
schema_extension_remediation_gate_created=true
next_loop_selected=true
dr_readiness_status=not_ready_restore_failed
```
