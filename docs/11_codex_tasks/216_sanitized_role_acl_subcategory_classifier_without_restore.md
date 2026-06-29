# Loop 216: Sanitized Role ACL Subcategory Classifier Without Restore

## Purpose

Classify the remaining Loop 213 role/owner/ACL restore signal without rerunning restore, running `pg_restore`, running `psql`, creating a target DB, displaying raw diagnostic logs, or touching production/Supabase.

Loop 213 reduced the sanitized role/owner/ACL signal from `14` to `1` by using explicit `--no-owner --no-privileges`, but restore still failed with `pg_restore_exit_code=1`.

## Scope

- Confirm the working tree starts clean on `main...origin/main`.
- Read Loop 213 sanitized metadata.
- Run a category-only classifier against the repo-external root-only Loop 213 diagnostic log.
- Display only boolean/count results.
- Do not display raw lines, matching lines, role names, SQL statements, object names, dump contents, row contents, DB URLs, or secret values.
- Update restore drill runbook, dev log, Obsidian, handoff latest files, and DR/verification matrices.
- Commit the docs-only result.

## Out of Scope

- Restore retry.
- `pg_restore` restore execution.
- `pg_restore --list` full display.
- `psql`.
- Target DB creation or changes.
- `CREATE ROLE`, `DROP ROLE`, `ALTER ROLE`.
- Package, cluster, DB, schema, migration, or RLS changes.
- Diagnostic log display or repo copy.
- Backup artifact repo copy.
- Supabase connection.
- Production DB connection or production restore.
- LINE real send.
- OpenAI API call.
- Nginx, DNS, HTTPS, certbot, or public smoke.
- Push.

## Start State

```txt
start_working_directory=/Users/sakio/Desktop/PROJECT/amami-line-crm
start_git_status=main...origin/main_clean
previous_goal_stage_1_commit=c8d4973
previous_goal_stage_2_commit=d10136b
loop_213_commit=813236b
loop_213_restore_options=no-owner,no-privileges
loop_213_pg_restore_exit_code=1
loop_213_restore_drill_status=failed
loop_213_role_owner_acl_error_count=1
loop_213_extension_missing_count=0
loop_213_schema_or_sql_statement_count=0
loop_213_target_db_exists_after_drop=false
loop_213_cleanup_required=false
dr_readiness_status=not_ready_restore_failed
```

## Classifier Target

```txt
classifier_target=loop213_repo_external_root_only_diagnostic_log
diagnostic_log_found=true
diagnostic_log_repo_path=false
diagnostic_log_displayed=false
diagnostic_log_copied_into_repo=false
matching_line_displayed=false
role_name_displayed=false
sql_statement_displayed=false
object_name_displayed=false
```

The diagnostic log content stayed on the VPS in a repo-external root-only location. This Loop did not print, copy, parse into docs, or expose raw diagnostic lines.

## Subcategory Classifier Result

Only booleans and counts were emitted.

```txt
role_does_not_exist_detected=false
role_does_not_exist_count=0
owner_required_detected=false
owner_required_count=0
acl_grant_revoke_detected=false
acl_grant_revoke_count=0
default_privileges_detected=false
default_privileges_count=0
policy_owner_detected=false
policy_owner_count=0
extension_owner_detected=false
extension_owner_count=0
publication_subscription_owner_detected=false
publication_subscription_owner_count=0
security_definer_owner_detected=false
security_definer_owner_count=0
allowlisted_supabase_role_signal_detected=false
allowlisted_role_signal_count=0
role_placeholder_signal_detected=false
role_placeholder_signal_count=0
unknown_role_acl_subcategory_detected=true
unknown_role_acl_subcategory_count=1
subcategory_counts_recorded=true
```

## Decision

The sanitized category-only classifier did not identify an allowlisted role placeholder signal, owner-required signal, ACL/default-privilege signal, policy owner signal, extension owner signal, publication/subscription owner signal, or security-definer owner signal.

Because the remaining signal is still unknown after safe category-only classification, the next Loop should not create placeholder roles or rerun restore.

```txt
next_loop_selected=true
next_loop=Loop 217: operator-only raw log review gate
```

## Go / No-Go

Go to Loop 217 only if:

- The operator accepts that raw log content stays root-only and is not pasted into docs/chat.
- The operator reviews only enough detail to return a sanitized subcategory.
- No role name, SQL statement, object name, row content, dump content, DB URL, or secret value is recorded.

No-Go if:

- Raw log content would need to be pasted into docs/chat.
- A role placeholder would be created before the remaining subcategory is known.
- Restore or `pg_restore` must be rerun.
- Supabase/production connection is required.

## Verification

```txt
git_diff_check=passed
docs_link_check=passed
secret_pattern_check=passed
lint=passed
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
target_db_changed=false
role_created=false
role_modified=false
diagnostic_log_displayed=false
diagnostic_log_copied_into_repo=false
raw_log_displayed=false
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
line_real_send_executed=false
openai_api_call_executed=false
nginx_dns_https_certbot_public_smoke_executed=false
production_runtime_changed=false
push_performed=false
```
