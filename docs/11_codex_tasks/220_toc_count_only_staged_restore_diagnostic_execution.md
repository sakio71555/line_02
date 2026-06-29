# Loop 220: TOC Count-Only Staged Restore Diagnostic Execution

## Purpose

Loop 219 selected `toc_count_only` as the first staged diagnostic after the restore retry still failed and the operator-only raw log review returned `unknown_after_operator_review`.

This Loop executes the lowest-risk TOC count-only diagnostic. It does not execute restore, create a target DB, run `psql`, connect to Supabase, connect to production, or display TOC body, dump content, row content, raw logs, object names, SQL statements, or secrets.

## Scope

- Confirm the Loop 205 backup artifact metadata without displaying dump content.
- Verify the PostgreSQL 17 `pg_restore` explicit path.
- Run exactly one `pg_restore --list`-equivalent command, redirecting TOC output to a repo-external root-only file.
- Record only count/boolean/path/permission/exit-code metadata.
- Update restore drill runbook, dev log, Obsidian, handoff latest files, DR matrix, verification matrix, README, and docs index.
- Commit locally.

## Out of Scope

- Restore execution.
- `pg_restore` restore execution.
- `psql` execution.
- Target DB creation or change.
- Role creation, deletion, or modification.
- Supabase connection.
- Production DB connection.
- Production restore.
- TOC body display.
- Object, table, function, policy, role, or SQL statement display.
- Dump content or row content display.
- DB URL, `.env`, secret file, or raw log display.
- Backup artifact copy into the repository.
- Package, cluster, runtime, migration, RLS, schema, LINE, OpenAI, Nginx, DNS, HTTPS, certbot, or public smoke changes.
- Push.

## Artifact Metadata

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
artifact_exists=true
artifact_readable=true
artifact_size=259222
artifact_checksum_verified=true
backup_artifact_permission=600
backup_artifact_parent_dir_permission=700
backup_artifact_copied_into_repo=false
dump_content_displayed=false
```

## Tooling

```txt
pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
pg_restore_version=17.10
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
bare_pg_restore_used=false
```

## TOC Diagnostic Result

```txt
diagnostic_phase=toc_count_only
pg_restore_list_executed=true
pg_restore_list_exit_code=0
pg_restore_restore_executed=false
target_db_created=false
psql_executed=false
toc_diagnostic_dir=/root/deploy-backups/amami-line-crm/loop220-toc-count-20260629-233207
toc_diagnostic_dir_permission=700
toc_file_path=/root/deploy-backups/amami-line-crm/loop220-toc-count-20260629-233207/pg_restore-toc.list
toc_file_permission=600
toc_file_size=35517
toc_error_file_path=/root/deploy-backups/amami-line-crm/loop220-toc-count-20260629-233207/pg_restore-toc.err
toc_error_file_permission=600
toc_error_file_size=0
toc_file_committed=false
toc_body_displayed=false
toc_error_log_displayed=false
```

The first local count classifier had a script syntax issue. It did not display TOC body, object names, dump content, row content, secrets, or raw logs. The corrected classifier was rerun against the repo-external root-only TOC file and returned count-only output.

```txt
toc_count_classifier_initial_status=failed_classifier_script_syntax
toc_count_classifier_rerun=true
toc_line_count=477
toc_total_entries_count=462
toc_pre_data_count=186
toc_data_count=46
toc_post_data_count=230
toc_pre_data_label_count=0
toc_data_label_count=47
toc_post_data_label_count=0
toc_schema_entries_count=8
toc_table_entries_count=62
toc_table_data_entries_count=46
toc_sequence_entries_count=5
toc_sequence_set_entries_count=2
toc_index_entries_count=97
toc_constraint_entries_count=106
toc_policy_entries_count=14
toc_trigger_entries_count=11
toc_function_entries_count=50
toc_extension_entries_count=20
toc_acl_entries_count=0
toc_default_acl_entries_count=0
toc_owner_related_count=2
toc_comment_entries_count=38
toc_publication_subscription_entries_count=10
toc_unknown_section_count=0
toc_error_log_error_count=0
toc_error_log_warning_count=0
toc_error_log_fatal_count=0
```

## Selected Next Diagnostic Stage

```txt
selected_next_stage=pre_data_only_restore_diagnostic_gate
selected_next_stage_reason=toc_count_succeeded_and_pre_data_entries_exist
role_placeholder_selected=false
same_restore_retry_selected=false
data_only_selected=false
post_data_only_selected=false
```

Pre-data only is the next smallest useful diagnostic because the TOC count succeeded, a target DB was not created in this Loop, and inferred pre-data entries exist. Data-only and post-data-only diagnostics remain later stages.

## Go / No-Go

Go for a future Loop 221 gate:

- Keep it as a gate before execution.
- Use explicit PostgreSQL 17 tooling.
- Keep raw stdout/stderr repo-external and root-only.
- Keep object names, SQL statements, table names, function names, policy names, role names, dump content, row content, DB URLs, and secrets out of docs, chat, commits, and handoff files.

No-Go:

- Any raw TOC body or matching line must be displayed.
- A target DB is created without a separate execution gate.
- The next Loop expands into data/post-data restore before pre-data is gated.
- Production or Supabase connection is required.

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
restore_executed=false
pg_restore_restore_executed=false
pg_restore_list_executed=true
psql_executed=false
target_db_created=false
target_db_changed=false
role_created=false
role_modified=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
toc_body_displayed=false
toc_error_log_displayed=false
object_name_displayed=false
table_name_displayed=false
function_name_displayed=false
policy_name_displayed=false
sql_statement_displayed=false
role_name_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
package_changed=false
cluster_changed=false
production_runtime_changed=false
dr_readiness_status=not_ready_restore_failed
```

## Next Loop

```txt
Loop 221: pre-data only restore diagnostic gate
```
