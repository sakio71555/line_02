# Loop 210: pg_restore Failure Diagnostics Without Raw Log Exposure

## 1. Purpose

Classify the Loop 209.2 `pg_restore` failure without exposing raw logs, dump contents, row contents, DB URLs, or secret values.

This Loop does not retry restore, does not run `pg_restore` restore, does not use `psql`, and does not connect to Supabase or production databases.

## 2. Start State

```txt
start_git_status=main...origin/main_clean
previous_loop=Loop 209.2
previous_commit=5cfd94f
previous_restore_drill_status=failed
previous_failure_category=pg_restore_exit_code_nonzero_without_raw_log
previous_restore_attempt_count=1
previous_restore_target_dropped=true
previous_cleanup_required=false
```

## 3. Safe Metadata Recheck

Only safe metadata was rechecked. Dump contents and raw logs were not displayed.

```txt
artifact_exists=true
artifact_readable=true
file_permission=600
parent_dir_permission=700
artifact_size_match=true
artifact_checksum_verified=true
pg_restore_17_path_present=true
pg_restore_version=17.10
cluster_identity_match=true
cluster_identity=17:restore_drill_loop2091:55432:online
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
```

## 4. Facts Confirmed Without Raw Log

- The backup artifact still exists outside the repository.
- The artifact permission, parent directory permission, size, and checksum match the expected metadata.
- PostgreSQL 17 `pg_restore` is present at the explicit path and reports version 17.10.
- The local restore drill cluster exists and is online on port 55432.
- Loop 209.2 attempted restore exactly once and got exit code 1.
- Loop 209.2 dropped the target DB after the failed attempt.
- No Supabase or production connection was used for Loop 209.2 or Loop 210.

## 5. Not Confirmable Without Raw Log

The following remain unconfirmed because raw `pg_restore` output is intentionally not exposed:

- role / owner / ACL error
- missing extension
- object conflict or target not empty
- permission / auth error
- SQL statement failure
- restore option mismatch
- partial restore progress
- object-specific failure

## 6. Failure Category

```txt
pg_restore_failure_category=unknown_without_raw_log
pg_restore_failure_category_assigned=true
```

The failure should not be narrowed further without a controlled diagnostic restore or a sanitized error classifier.

## 7. Candidate Matrix

| Candidate | Status | Why |
| --- | --- | --- |
| `role_owner_acl_error_suspected` | unconfirmed | raw log required |
| `extension_missing_suspected` | unconfirmed | raw log or sanitized classifier required |
| `database_already_not_empty_suspected` | less_likely_unconfirmed | target identity was verified, but no raw log confirms the failure point |
| `permission_or_auth_suspected` | unconfirmed | raw log required |
| `target_version_or_encoding_suspected` | unconfirmed | PostgreSQL 17 tooling exists, but failure detail is unknown |
| `custom_dump_format_or_artifact_suspected` | less_likely_unconfirmed | artifact metadata/checksum matched |
| `restore_command_option_suspected` | unconfirmed | raw log or diagnostic classifier required |
| `target_cluster_unavailable_suspected` | less_likely_unconfirmed | cluster identity was online before the restore |
| `raw_log_required_but_not_exposed` | confirmed_boundary | details cannot be classified safely in this Loop |

## 8. Loop 211 Diagnostic Restore Design

Loop 211 may be used only with explicit operator approval. It should:

1. Create a new isolated local target DB.
2. Run exactly one diagnostic restore using the explicit PostgreSQL 17 `pg_restore` path.
3. Save stdout/stderr only to a root-only, repo-external diagnostic log.
4. Never paste the raw diagnostic log into docs, Obsidian, chat, or commits.
5. Run a sanitizer or operator-only review that emits only allowlisted categories and counts.
6. Record only `failure_category`, exit code, sanitized error class count, and cleanup result.
7. Drop the target DB after diagnostics.

Allowed diagnostic outputs:

```txt
failure_category=<allowlisted_category>
exit_code=<number>
sanitized_error_class_count=<number>
target_cleanup_result=<boolean>
raw_log_displayed=false
secrets_recorded=false
dump_content_displayed=false
row_content_displayed=false
```

## 9. Safety Boundary

```txt
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
target_db_created=false
target_db_restored=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
```

## 10. DR Readiness

```txt
dr_readiness_status=not_ready_restore_failed
restore_capability_verified=false
loop_211_diagnostic_restore_plan_created=true
```

## 11. Next Loop

```txt
Loop 211: controlled diagnostic restore with sanitized failure classifier
```
