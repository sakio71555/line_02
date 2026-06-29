# Supabase Backup Export Controlled Execution

Loop 201 runbook.

## 1. Purpose

Execute a controlled Supabase backup export only when an operator-supplied database URL is present in the exact execution environment.

This run was blocked safely because the operator-supplied database URL was not present in the non-interactive VPS environment.

## 2. Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

No runtime state was changed.

## 3. Approved Scope

```txt
ALLOW_SUPABASE_CLI_PREFLIGHT=false
ALLOW_SUPABASE_CLI_OR_API_CALL=false
ALLOW_PG_DUMP_EXECUTION=true
ALLOW_DB_EXPORT=true
ALLOW_BACKUP_ARTIFACT_CREATION=true
ALLOW_BACKUP_ARTIFACT_CHECKSUM=true
ALLOW_SECRET_OPERATOR_INJECTION=true
ALLOW_RESTORE=false
ALLOW_PRODUCTION_RESTORE=false
ALLOW_RUNTIME_CHANGES=false
ALLOW_LINE_SEND=false
ALLOW_OPENAI_API=false
ALLOW_NGINX_DNS_CERTBOT_CHANGES=false
```

## 4. Safety Checks

```txt
vps_host=vm-227d8253-eb
api_service_active=true
admin_service_active=true
api_direct_8788_health_status=200
https_api_health_status=200
https_admin_root_status=200
https_admin_customers_status=200
https_admin_api_no_header_customers_status=401
https_line_invalid_signature_status=401
pg_dump_available=true
pg_dump_version_check=ok
backup_dir_ready=true
backup_dir_outside_repo=true
```

## 5. Secret Handling Result

```txt
operator_supplied_db_url_present=false
operator_supplied_db_url_used=false
DB URL value not recorded
secrets_recorded=false
```

No Supabase URL, key, database URL, project identifier, database password, provider token, `.env` content, secret file content, LINE secret, webhook suffix, LINE identifier, reply token, OpenAI key, model value, prompt body, response body, or Bearer token was recorded.

## 6. Export Result

```txt
backup_export_status=blocked_operator_secret_not_injected
backup_export_execution_status=blocked_operator_secret_not_injected
pg_dump executed=false
pg_dump connection attempted=false
DB export performed=false
backup artifact created=false
backup_artifact_path_recorded=false
backup_artifact_size_bytes=not_recorded
backup_artifact_sha256_recorded=false
backup_artifact_contents_displayed=false
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
```

`pg_dump` was available, but it was not executed against a database because the operator-supplied database URL was absent.

## 7. Restore And Runtime Boundary

```txt
restore performed=false
production_restore_performed=false
non_production_restore_performed=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
supabase_write_migration_rls_changes=false
Supabase CLI/API called=false
```

## 8. Artifact Policy

```txt
artifact_path_policy=outside_repo_required
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
backup_artifact_contents_displayed=false
```

Because no artifact was created, no checksum or size could be recorded.

## 9. Next Loop

```txt
Loop 201.1: Supabase backup export operator secret injection retry
```

The retry must inject the database URL into the same non-interactive execution context, verify only presence, and never display or record the value.

## 10. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 201 Task Doc](../11_codex_tasks/201_supabase_backup_export_controlled_execution.md)

## 11. Loop 202 Version Mismatch Follow-Up

After Loop 201, the backup export failure category was recorded as a PostgreSQL server/client version mismatch. Do not retry export with the PostgreSQL 16 client.

```txt
pg_dump_failure_categories=pg_dump_server_version_mismatch
detected_server_major_or_version=17.6
detected_pg_dump_major_or_version=16.14
raw_log_not_displayed=true
secrets_recorded=false
pg_dump_17_client_required=true
pg_dump_16_retry_allowed=false
backup_export_retry_before_pg_dump_17=false
postgresql_client_17_installation_performed=false
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
```

## 12. Loop 202.1 SUPABASE_DB_URL Secret Replacement

The incorrect `SUPABASE_DB_URL` was replaced through operator input and root-only handling. The value is not displayed or recorded.

```txt
secret_replaced=true
present=true
format_check=passed
secrets_recorded=false
raw_log_not_displayed=true
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
```

Do not use this replacement as approval to retry export. Backup export remains blocked until the PostgreSQL 17 client boundary is resolved in a separate Loop.

## 13. Loop 204 PostgreSQL 17 Client Installation Follow-Up

PostgreSQL 17 client tooling is now installed on the VPS, but DB export has still not been retried.

```txt
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_version=17.10
pg_dump_17_version_check_passed=true
pg_dump_16_preserved=true
postgresql_client_17_installed=true
pg_dump_db_connection_executed=false
supabase_connection_executed=false
db_export_executed=false
backup_artifact_created=false
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
```

The next export Loop must call `/usr/lib/postgresql/17/bin/pg_dump` explicitly and must keep DB URL and raw log output redacted.

## 14. Loop 205 Backup Export Retry Result

Loop 205 used the explicit PostgreSQL 17 `pg_dump` path and completed one operator-approved export attempt successfully.

```txt
pg_dump_17_path=/usr/lib/postgresql/17/bin/pg_dump
pg_dump_17_version=17.10
pg_dump_17_explicit_path_used=true
supabase_db_url_present=true
supabase_db_url_format_check=passed
pg_dump_executed=true
pg_dump_attempt_count=1
backup_export_status=success
backup_artifact_created=true
backup_artifact_in_repo=false
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
restore_executed=false
secrets_recorded=false
raw_log_displayed=false
dump_contents_displayed=false
```

The artifact may contain production data and remains outside the repository. Do not copy it into Git, chat, or docs. Restore is still blocked until a separate explicit restore drill Loop.

## 15. Loop 206 Restore Drill Planning Result

Loop 206 planned the restore drill for the Loop 205 artifact without executing restore or connecting to any database.

```txt
restore_drill_plan_created=true
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
secrets_recorded=false
loop_207_restore_drill_execution_ready=false_pending_operator_approval_and_target_selection
```

Allowed future targets are isolated local PostgreSQL, a disposable non-production database, or a Supabase-separated verification database. Production restore remains forbidden. The future execution Loop must verify artifact metadata and use the explicit PostgreSQL 17 `pg_restore` path before attempting restore.

## 16. Loop 207 Restore Drill Execution Gate Result

Loop 207 added the pre-execution gate for restore drill target selection and command boundaries. It still did not execute restore or connect to any database.

```txt
restore_execution_gate_created=true
restore_target_selected=false
selected_restore_target=not_selected
production_target_allowed=false
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
loop_208_restore_drill_target_selection_ready=true
```

Before execution, choose exactly one isolated non-production target, verify artifact metadata, and confirm `/usr/lib/postgresql/17/bin/pg_restore` explicitly. Production restore remains forbidden.

## 17. Loop 208 Restore Target Selection Result

Loop 208 selected the target candidate for the future restore drill without creating the target database or running restore.

```txt
restore_target_selection_documented=true
restore_target_selected=true
selected_restore_target=local_isolated_postgresql_on_vps
selected_restore_target_candidate=A
target_db_created=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
loop_209_restore_drill_execution_ready=true_pending_operator_approval
```

Loop 209 must use only a localhost-only disposable PostgreSQL target on the VPS unless a new Loop changes the target decision. Production and Supabase production remain forbidden restore targets.

## 18. Loop 209 Restore Drill Execution Result

Loop 209 attempted the preflight for the selected local isolated PostgreSQL target and stopped before restore.

```txt
restore_drill_status=blocked
failure_category=isolated_local_postgresql_target_unavailable
artifact_exists=true
artifact_checksum_verified=true
artifact_permission_checked=true
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
postgres_user_present=false
local_postgresql_ready=false
target_db_created=false
restore_executed=false
pg_restore_executed=false
pg_restore_version_check_executed=true
psql_executed=false
restore_attempt_count=0
sanitized_validation_executed=false
restore_target_dropped=false
cleanup_required=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
```

No restore target was created, so no cleanup action was required. The next step is a separate provisioning approval Loop before restore can be retried.

## 19. Loop 209.1 Restore Target Provisioning Result

Loop 209.1 provisioned the isolated local PostgreSQL target for a future restore retry. It still did not restore the backup artifact.

```txt
target_provisioning_status=success
package_operation_executed=true
postgresql_17_server_installed=true
local_cluster_created=true
local_cluster_name=restore_drill_loop2091
local_cluster_port=55432
local_cluster_started=true
local_cluster_local_only=true
restore_target_db_created=true
restore_target_db_name=amami_line_crm_restore_drill_loop2091_20260629
restore_target_db_name_contains_restore_drill=true
restore_target_verified_isolated=true
pg_restore_17_path_present=true
pg_restore_17_version_check_passed=true
restore_executed=false
pg_restore_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
backup_artifact_copied_into_repo=false
dump_content_displayed=false
raw_log_displayed=false
secrets_recorded=false
rollback_plan_documented=true
loop_209_2_restore_drill_retry_ready=true
```

The target is ready for a separate restore retry Loop with explicit operator approval.

## 20. Loop 209.2 Restore Drill Retry Result

Loop 209.2 executed the first isolated restore attempt against the VPS local PostgreSQL target. The attempt failed, and the target DB was dropped afterward.

```txt
restore_attempt_count=1
restore_executed=true
pg_restore_executed=true
pg_restore_explicit_path_used=true
pg_restore_version=17.10
pg_restore_exit_code=1
restore_drill_status=failed
failure_category=pg_restore_exit_code_nonzero_without_raw_log
sanitized_validation_executed=false
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
backup_artifact_copied_into_repo=false
row_content_displayed=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
```

Artifact metadata remained valid, and the target identity was verified as `local_isolated_postgresql_on_vps` before the attempt. Restore capability is not yet proven. The next Loop should diagnose the failure without displaying raw restore logs, DB URLs, secrets, dump contents, or row contents.

## 21. Loop 210 pg_restore Failure Diagnostics Result

Loop 210 did not retry restore. It rechecked only safe metadata and classified the Loop 209.2 failure conservatively.

```txt
artifact_exists=true
artifact_checksum_verified=true
pg_restore_17_path_present=true
pg_restore_version=17.10
cluster_identity_match=true
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
pg_restore_failure_category=unknown_without_raw_log
pg_restore_failure_category_assigned=true
loop_211_diagnostic_restore_plan_created=true
dr_readiness_status=not_ready_restore_failed
```

The next diagnostic Loop must not expose raw logs. It may record only allowlisted failure categories and counts after a separately approved diagnostic restore.

## 22. Loop 211 Controlled Diagnostic Restore Result

Loop 211 ran one diagnostic restore and classified the failure using sanitized counts only.

```txt
diagnostic_log_created=true
diagnostic_log_repo_path=false
diagnostic_log_permission=600
diagnostic_log_displayed=false
diagnostic_log_committed=false
diagnostic_target_db_created=true
diagnostic_target_verified_isolated=true
diagnostic_restore_executed=true
restore_attempt_count=1
pg_restore_exit_code=1
restore_drill_status=failed
role_owner_acl_error_count=14
extension_missing_count=6
schema_or_sql_statement_error_count=17
target_cluster_error_count=1
pg_restore_failure_category=role_owner_acl_error_detected
sanitized_classifier_executed=true
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_restore_executed=false
```

The backup artifact remains repo-external. Restore capability is still not proven; the next Loop should plan role/owner/ACL remediation before any retry.

## 23. Loop 212 Role Owner ACL Restore Remediation Plan

Loop 212 planned the next remediation step without rerunning restore or displaying raw diagnostic logs.

```txt
primary_failure_category=role_owner_acl_error_detected
secondary_failure_signals=extension_missing_detected,schema_or_sql_statement_error_detected
candidate_a_no_owner_no_privileges=required_baseline
candidate_b_role_placeholders=defer_until_needed
candidate_c_extension_preflight=defer_if_secondary_signal_persists
candidate_d_staged_restore=defer_for_deeper_diagnostics
candidate_e_operator_only_raw_log_review=optional_before_more_risky_changes
recommended_next_loop=Loop 213: controlled restore retry with no-owner no-privileges
restore_retried=false
pg_restore_restore_executed=false
psql_executed=false
target_db_created=false
diagnostic_log_displayed=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_restore_executed=false
loop_213_retry_ready=true
dr_readiness_status=not_ready_restore_failed
```

Loop 213 should use one fresh isolated target and one explicit `pg_restore --no-owner --no-privileges` retry only after confirming the Go/No-Go checklist.

## 24. Loop 213 Controlled Restore Retry With No Owner No Privileges

Loop 213 performed the approved isolated local restore retry with explicit `--no-owner --no-privileges`.

```txt
backup_artifact_in_repo=false
artifact_checksum_verified=true
restore_target=local_isolated_postgresql_on_vps
cluster_identity=17:restore_drill_loop2091:55432:online
listen_scope_loopback_only=true
restore_options=no-owner,no-privileges
restore_attempt_count=1
pg_restore_exit_code=1
restore_drill_status=failed
pg_restore_failure_category=role_owner_acl_error_detected
role_owner_acl_error_count=1
extension_missing_count=0
schema_or_sql_statement_count=0
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
psql_executed=true_local_isolated_target_cleanup_check
supabase_connection_executed=false
production_restore_executed=false
```

The backup artifact remains repo-external. Restore capability is still not proven, so DR readiness remains incomplete.
