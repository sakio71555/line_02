# Loop 220: TOC Count-Only Staged Restore Diagnostic Execution

## Decisions

- Loop 220 executed only the TOC count-only staged diagnostic.
- `pg_restore --list` output was redirected to repo-external root-only storage.
- TOC body, object names, SQL statements, role names, dump content, row content, DB URLs, and secrets were not displayed or committed.
- Restore, `pg_restore` restore, `psql`, target DB creation, role changes, Supabase connection, and production restore were not executed.
- The next diagnostic stage is `pre_data_only_restore_diagnostic_gate`.

## DevelopmentLog

- Confirmed Loop 205 artifact metadata and checksum.
- Verified `/usr/lib/postgresql/17/bin/pg_restore` reports version `17.10`.
- Ran exactly one `pg_restore --list`-equivalent command and stored TOC output in `/root/deploy-backups/amami-line-crm/loop220-toc-count-20260629-233207/`.
- Corrected the count-only classifier after an initial script syntax issue; no TOC body was displayed during either step.
- Recorded counts: total entries `462`, inferred pre-data `186`, data `46`, post-data `230`, ACL `0`, default ACL `0`.
- Updated task doc, restore drill runbook, dev log, handoff latest files, DR matrix, verification matrix, README, docs index, and Obsidian navigation.

## Risks

- TOC body may contain sensitive object/table/function/policy names and must remain hidden.
- The classifier is count-only and does not prove restore readiness.
- Restore has not succeeded, so DR readiness remains `not_ready_restore_failed`.
- The next pre-data diagnostic must be gated separately to avoid broad restore retry creep.
- Repo-external diagnostic files remain root-only and should not be copied into the repo.

## Checklist

- `working_directory_confirmed=true`
- `tmp_used=false`
- `obsidian_updated=true`
- `handoff_latest_codex_result_updated=true`
- `handoff_latest_gpt_review_prompt_updated=true`
- `artifact_checksum_verified=true`
- `pg_restore_17_version_check_passed=true`
- `pg_restore_list_executed=true`
- `pg_restore_list_exit_code=0`
- `pg_restore_restore_executed=false`
- `restore_executed=false`
- `psql_executed=false`
- `target_db_created=false`
- `role_created=false`
- `toc_body_displayed=false`
- `toc_error_log_displayed=false`
- `object_name_displayed=false`
- `table_name_displayed=false`
- `function_name_displayed=false`
- `policy_name_displayed=false`
- `sql_statement_displayed=false`
- `role_name_displayed=false`
- `dump_content_displayed=false`
- `row_content_displayed=false`
- `secrets_recorded=false`
- `backup_artifact_copied_into_repo=false`
- `supabase_connection_executed=false`
- `production_restore_executed=false`
- `production_runtime_changed=false`
- `selected_next_stage=pre_data_only_restore_diagnostic_gate`
- `dr_readiness_status=not_ready_restore_failed`
