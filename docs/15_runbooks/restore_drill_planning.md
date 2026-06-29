# Restore Drill Planning

Loop 206 runbook.

## 1. Purpose

Plan a restore drill for the Loop 205 Supabase backup artifact without performing restore.

This runbook exists because a backup export is not enough: restore capability must be verified in an isolated non-production environment before the backup process can be considered operationally complete.

## 2. Hard Boundary

```txt
restore_executed=false
production_restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
migration_executed=false
rls_changed=false
production_runtime_changed=false
```

Production restore is forbidden. Production DB connection is forbidden. The Loop 205 dump content must not be displayed or copied into the repository.

## 3. Source Artifact

```txt
backup_artifact_path=/root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
backup_artifact_size_bytes=259222
backup_artifact_sha256=432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493
backup_artifact_permission=600
backup_dir_permission=700
backup_artifact_in_repo=false
```

The artifact may contain production data. Keep it root-only and outside Git.

## 4. Restore Target Candidates

| Candidate | Status | Rule |
| --- | --- | --- |
| Isolated local PostgreSQL | Allowed in a future approved Loop | Use a disposable database and no production credentials. |
| Disposable non-production database | Allowed in a future approved Loop | Destroy or lock after validation. |
| Separate Supabase verification database | Allowed in a future approved Loop | Must be separate from production. |
| Production database | Forbidden | Never use for a drill. |

## 5. pg_restore Boundary

Future restore drill execution should use:

```txt
expected_pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
expected_pg_restore_major=17
```

Do not rely on a bare `pg_restore` command. Do not change pg_wrapper, update-alternatives, or symlinks as part of restore execution.

## 6. Pre-Restore Artifact Verification

Allowed checks in a future execution Loop:

- Path exists.
- Parent directory permission is `700`.
- File permission is `600`.
- File size matches `259222` bytes.
- SHA-256 matches the recorded checksum.

Do not show dump contents or raw restore logs.

## 7. Validation Checklist For Future Drill

- Schema restore completes.
- Expected core tables exist.
- Sanitized table counts can be collected without exposing row contents.
- RLS and policy behavior is reviewed separately.
- Extension differences are recorded.
- Owner and privilege differences are recorded.
- App runtime remains unchanged.
- Teardown/lockdown of the restore target is completed.

## 8. Go / No-Go

Go:

- Operator approval is explicit.
- Target is confirmed non-production.
- Artifact metadata matches.
- `pg_restore` 17 explicit path is available.
- Raw logs and dump contents will remain hidden.

No-Go:

- Target is production or unclear.
- Production credentials would be used.
- Artifact checksum/permission mismatch.
- Any step would expose secrets, raw logs, or dump contents.
- Restore is bundled with migration, RLS, runtime, LINE, OpenAI, Nginx, DNS, HTTPS, or certbot changes.

## 9. Next Loop

```txt
Loop 207: isolated non-production restore drill execution gate
```

## 10. Loop 207 Execution Gate

Loop 207 adds an execution gate for the restore drill. It does not execute restore, `pg_restore`, `psql`, Supabase connection, migration, RLS, schema change, or production runtime change.

### 10.1 Restore Target Selection Matrix

Use this matrix to narrow the future restore target to exactly one candidate before execution.

| Candidate | Isolation | Supabase similarity | Setup risk | Decision |
| --- | --- | --- | --- | --- |
| Isolated local PostgreSQL | High if disposable and separated from production | Medium | Medium | Preferred first target when it can be created safely. |
| Disposable non-production database | High if newly created for the drill | High | Medium | Acceptable if local restore is impractical. |
| Supabase-separated verification database | High only if separate from production | Highest | Higher | Requires explicit operator approval and proof it is not production. |
| Production database | None | Production | Catastrophic | Forbidden. |

Current state:

```txt
restore_target_selected=false
selected_restore_target=not_selected
production_target_allowed=false
loop_208_restore_drill_target_selection_ready=true
```

### 10.2 Production Misconnection Prevention

Before any future restore execution, confirm:

- Target is explicitly non-production.
- Target credentials are not production credentials.
- Target is not the Supabase production project/database.
- Restore target variable is not `SUPABASE_DB_URL`.
- Runtime services are not pointed at the restore target.
- No application restart, runtime switch, migration, RLS, or schema change is bundled into the restore drill.

Unknown target or credential status means No-Go.

### 10.3 Artifact Verification Boundary

Allowed in a future execution Loop:

- Check artifact path existence.
- Check backup directory permission is `700`.
- Check backup file permission is `600`.
- Check backup file size is `259222` bytes.
- Check SHA-256 equals `432dc75113b4b1a552c94b971d2fb0afca67554077992d425105f09510666493`.

Future command shape, not executed in Loop 207:

```sh
# Metadata only. Do not show dump contents.
stat -c '%a %s %n' /root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
sha256sum /root/deploy-backups/amami-line-crm/loop205-20260629-182014/supabase-db-loop205-20260629-182014.dump
```

Forbidden:

- Dump content display.
- Raw restore log display.
- Repo copy of the artifact.
- Secret or DB URL display.

### 10.4 Isolated Target DB Requirements

The target selected in a future Loop must be disposable or approved for destructive restore testing, disconnected from production application traffic, clearly non-production by name/host, and paired with a written teardown or lockdown plan. The target connection string must not be committed or recorded in docs.

### 10.5 Command Boundary

Future execution must use:

```txt
expected_pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
expected_pg_restore_major=17
bare_pg_restore_allowed=false
```

Loop 207 result:

```txt
restore_execution_gate_created=true
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
```

## 11. Loop 208 Target Selection

Loop 208 selects one restore drill target for the next execution Loop. It still does not create a target database, execute restore, run `pg_restore`, run `psql`, connect to Supabase, or touch production.

### 11.1 Candidate Comparison Summary

| Candidate | Result | Reason |
| --- | --- | --- |
| A. Local isolated PostgreSQL on VPS | Selected | Artifact already lives on the VPS, PostgreSQL 17 tooling is available there, and no artifact transfer is needed. |
| B. Local isolated PostgreSQL on developer Mac | Not selected | Would require moving or accessing the artifact from a developer machine. |
| C. Disposable non-production PostgreSQL database | Fallback | Acceptable later, but needs extra host/credential handling. |
| D. Supabase-separated verification DB | Later-stage option | Closest to Supabase, but carries higher project/secret confusion risk. |

Selected target:

```txt
restore_target_selected=true
selected_restore_target=local_isolated_postgresql_on_vps
selected_restore_target_candidate=A
selected_restore_target_network_scope=localhost_only
selected_restore_target_disposable_required=true
selected_restore_target_database_name_pattern=amami_restore_drill_loop209_disposable
target_db_created=false
```

### 11.2 Loop 209 Boundary

Loop 209 may only proceed after explicit operator approval. It may create a localhost-only disposable PostgreSQL target, verify artifact metadata, verify `/usr/lib/postgresql/17/bin/pg_restore --version`, run restore against that isolated target, perform sanitized verification, and drop or isolate the target.

Loop 209 must not connect to production DB, Supabase production, run production restore, run migrations, change RLS, change application schema outside the isolated target, display DB URL, display raw logs, display dump contents, or change production runtime.

### 11.3 Misconnection Prevention

Before restore, Loop 209 must confirm:

- Target host is localhost or explicitly non-production.
- Target database name includes `restore_drill`, `disposable`, or `nonprod`.
- Target is not a Supabase project host.
- Target is not production hostname.
- Target credentials are not production credentials.
- Restore command does not use production env or `SUPABASE_DB_URL`.
- Raw logs and shell history do not expose secrets.
- Target can be dropped after the drill.

### 11.4 Loop 208 Result

```txt
restore_target_selection_documented=true
restore_target_selected=true
selected_restore_target=local_isolated_postgresql_on_vps
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
target_db_created=false
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

## 12. Loop 209 Restore Drill Execution Result

Loop 209 reached the execution preflight for `local_isolated_postgresql_on_vps`, but stopped before restore because a usable local PostgreSQL target was unavailable.

### 12.1 Sanitized Preflight

```txt
artifact_exists=true
artifact_file_permission=600
artifact_dir_permission=700
artifact_size_match=true
artifact_checksum_verified=true
artifact_permission_checked=true
artifact_dir_permission_checked=true
pg_restore_17_path_present=true
pg_restore_version=17.10
pg_restore_17_version_check_passed=true
postgres_user_present=false
pg_isready_available=true
local_postgresql_ready=false
createdb_available=true
dropdb_available=true
vps_preflight_status=blocked
```

### 12.2 Restore Result

```txt
restore_drill_status=blocked
failure_category=isolated_local_postgresql_target_unavailable
selected_restore_target=local_isolated_postgresql_on_vps
target_db_created=false
restore_target_verified_isolated=false
restore_target_db_name_contains_restore_drill=false
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
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
row_content_displayed=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
```

### 12.3 Next Gate

```txt
next_loop=Loop 209.1: isolated local PostgreSQL target provisioning approval
```

Do not retry restore until local PostgreSQL target provisioning is explicitly approved and separated from restore execution.

## 13. Loop 209.1 Target Provisioning Result

Loop 209.1 provisioned the isolated local PostgreSQL target on the VPS. It did not run restore or `pg_restore` restore.

### 13.1 Package / Server Result

```txt
target_provisioning_status=success
package_operation_executed=true
package_install_requested=postgresql-17
apt_upgrade_executed=false
apt_full_upgrade_executed=false
postgresql_17_server_installed=true
installed_package_postgresql_17=17.10-1.pgdg24.04+1
installed_package_postgresql_common=291.pgdg24.04+1
installed_package_postgresql_client_17=17.10-1.pgdg24.04+1
installed_package_postgresql_client_18=18.4-1.pgdg24.04+1
```

`postgresql-client-18` and PostgreSQL common/client meta packages were installed or updated as dependencies of the PostgreSQL server provisioning.

### 13.2 Local Target

```txt
local_cluster_created=true
local_cluster_name=restore_drill_loop2091
local_cluster_port=55432
local_cluster_status=online
local_cluster_started=true
listen_scope=localhost
local_cluster_local_only=true
restore_target_db_created=true
restore_target_db_name=amami_line_crm_restore_drill_loop2091_20260629
restore_target_db_name_contains_restore_drill=true
restore_target_verified_isolated=true
target_disposable=true
target_drop_command_known=true
```

Loopback-only listen addresses were observed:

```txt
listen_address=127.0.1.1:55432
listen_address=127.0.0.1:55432
```

### 13.3 Rollback / Cleanup Plan

```txt
drop_target_db_command=runuser -u postgres -- dropdb -p 55432 amami_line_crm_restore_drill_loop2091_20260629
stop_cluster_command=pg_ctlcluster 17 restore_drill_loop2091 stop
drop_cluster_command=pg_dropcluster --stop 17 restore_drill_loop2091
```

Keep `postgresql-17` installed until the restore drill is completed unless a separate rollback Loop is approved.

### 13.4 Safety Boundary

```txt
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

## 14. Loop 209.2 Restore Drill Retry Result

Loop 209.2 retried restore against the isolated local PostgreSQL target created in Loop 209.1. The preflight passed, but the single allowed `pg_restore` attempt failed with a nonzero exit code. Raw restore logs were suppressed and not recorded.

### 14.1 Preflight

```txt
artifact_exists=true
artifact_file_permission=600
artifact_dir_permission=700
artifact_size_match=true
artifact_checksum_verified=true
artifact_permission_checked=true
artifact_dir_permission_checked=true
pg_restore_17_path_present=true
pg_restore_version=17.10
psql_path_present=true
cluster_identity_match=true
cluster_identity=17:restore_drill_loop2091:55432:online
listen_loopback_count=2
listen_scope_loopback_only=true
target_db_exists_before_restore=true
restore_target_verified_isolated=true
restore_target_db_name_contains_restore_drill=true
restore_precheck_ok=true
```

### 14.2 Restore Attempt

```txt
restore_attempt_count=1
restore_executed=true
pg_restore_executed=true
pg_restore_explicit_path_used=true
pg_restore_exit_code=1
restore_drill_status=failed
failure_category=pg_restore_exit_code_nonzero_without_raw_log
sanitized_validation_executed=false
```

Post-restore schema/table/count validation did not run because restore failed.

### 14.3 Cleanup

```txt
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
```

The restore target DB was dropped after the failed attempt. The local-only cluster remains available for a future explicitly approved diagnostic or retry Loop.

### 14.4 Safety Boundary

```txt
row_content_displayed=false
dump_content_displayed=false
raw_log_displayed=false
db_url_displayed=false
secrets_recorded=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
migration_executed=false
rls_changed=false
schema_changed=false
backup_artifact_copied_into_repo=false
```

### 14.5 Next Gate

```txt
dr_readiness_status=not_ready_restore_failed
restore_capability_verified=false
next_loop=Loop 210: pg_restore failure diagnostics without raw log exposure
```

Do not retry restore until the failure is diagnosed with a safe, sanitized method and a new explicit approval is provided.

## 15. Loop 210 pg_restore Failure Diagnostics Result

Loop 210 classified the Loop 209.2 restore failure without rerunning restore, running `psql`, displaying raw logs, or exposing dump/row/secret content.

### 15.1 Safe Metadata Recheck

```txt
artifact_exists=true
artifact_readable=true
artifact_file_permission=600
artifact_dir_permission=700
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

### 15.2 Failure Classification

```txt
previous_pg_restore_exit_code=1
previous_failure_category=pg_restore_exit_code_nonzero_without_raw_log
pg_restore_failure_category=unknown_without_raw_log
pg_restore_failure_category_assigned=true
```

Artifact metadata, PostgreSQL 17 tooling, and local target identity were confirmed. Role/owner/ACL, missing extension, object conflict, permission/auth, SQL statement, option mismatch, and partial restore progress remain unconfirmed without a controlled diagnostic log.

### 15.3 Loop 211 Diagnostic Boundary

```txt
loop_211_diagnostic_restore_plan_created=true
raw_diagnostic_log_allowed_only_repo_external_root_only=true
raw_diagnostic_log_must_not_be_committed=true
sanitized_category_only=true
restore_retry_requires_new_approval=true
dr_readiness_status=not_ready_restore_failed
```

Loop 211 may perform a controlled diagnostic restore only with explicit approval, a fresh isolated target DB, root-only repo-external raw diagnostic log handling, sanitized category extraction, and target cleanup.

## 16. Loop 211 Controlled Diagnostic Restore Result

Loop 211 ran one diagnostic restore against a fresh isolated local target DB. Raw stdout/stderr was saved only to a repo-external root-only diagnostic log and was not displayed or committed.

### 16.1 Diagnostic Boundary

```txt
diagnostic_target_db=amami_line_crm_restore_drill_loop211_diag_20260629194109
diagnostic_target_db_created=true
diagnostic_target_verified_isolated=true
diagnostic_log_path=/root/deploy-backups/amami-line-crm/loop211-diagnostics-20260629-194109/pg_restore-diagnostic.log
diagnostic_log_created=true
diagnostic_log_repo_path=false
diagnostic_log_dir_permission=700
diagnostic_log_permission=600
diagnostic_log_permission_checked=true
diagnostic_log_displayed=false
diagnostic_log_committed=false
```

### 16.2 Restore Result

```txt
diagnostic_restore_executed=true
restore_attempt_count=1
pg_restore_exit_code=1
restore_drill_status=failed
sanitized_validation_executed=false
```

### 16.3 Sanitized Classifier Result

```txt
role_owner_acl_error_count=14
extension_missing_count=6
object_conflict_count=0
permission_or_auth_error_count=0
schema_or_sql_statement_error_count=17
restore_option_error_count=0
target_cluster_error_count=1
custom_dump_format_error_count=0
role_owner_acl_error_detected=true
extension_missing_detected=true
object_conflict_detected=false
permission_or_auth_error_detected=false
schema_or_sql_statement_error_detected=true
restore_option_error_detected=false
target_cluster_error_detected=true
custom_dump_format_error_detected=false
pg_restore_failure_category=role_owner_acl_error_detected
sanitized_classifier_executed=true
```

`role_owner_acl_error_detected` is the primary category by priority. Positive secondary counts may overlap with the same raw diagnostic lines and must not be treated as independent root causes without a future approved review.

### 16.4 Cleanup / Safety

```txt
restore_target_dropped=true
target_db_exists_after_drop=false
cleanup_required=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
```

### 16.5 Next Gate

```txt
dr_readiness_status=not_ready_restore_failed
restore_capability_verified=false
diagnostic_failure_category_available=true
next_loop=Loop 212: role owner ACL restore remediation plan
```

Do not retry restore until Loop 212 decides how to handle role/owner/ACL restore behavior.

## 17. Loop 212 Role Owner ACL Restore Remediation Plan

Loop 212 planned the next restore remediation step using only the Loop 211 sanitized classifier result. It did not rerun restore, run `pg_restore`, run `psql`, create a target DB, display diagnostic logs, or connect to Supabase/production.

### 17.1 Failure Signal Summary

```txt
primary_failure_category=role_owner_acl_error_detected
role_owner_acl_error_count=14
secondary_extension_missing_detected=true
extension_missing_count=6
secondary_schema_or_sql_statement_error_detected=true
schema_or_sql_statement_error_count=17
target_cluster_error_count=1
object_conflict_count=0
permission_or_auth_error_count=0
restore_option_error_count=0
custom_dump_format_error_count=0
```

These are sanitized classifier signals, not raw-log proof. `target_cluster_error_count=1` is not treated as the primary root cause because the diagnostic target was created and dropped successfully.

### 17.2 Remediation Candidate Decision

```txt
candidate_a_no_owner_no_privileges=required_baseline
candidate_b_role_placeholders=defer_until_needed
candidate_c_extension_preflight=defer_if_secondary_signal_persists
candidate_d_staged_restore=defer_for_deeper_diagnostics
candidate_e_operator_only_raw_log_review=optional_before_more_risky_changes
```

The next retry should explicitly keep `--no-owner --no-privileges`, use a fresh local isolated target, run only once, and record sanitized output only. If role/owner/ACL errors persist, move to role placeholder or staged restore planning rather than repeating retries.

### 17.3 Loop 213 Boundary

```txt
next_loop=Loop 213: controlled restore retry with no-owner no-privileges
artifact_metadata_recheck_required=true
fresh_local_isolated_target_required=true
pg_restore_17_explicit_path_required=true
no_owner_no_privileges_required=true
restore_attempt_limit=1
raw_log_repo_external_root_only=true
sanitized_classifier_only=true
target_cleanup_required=true
```

### 17.4 Go / No-Go

Go:

- Loop 211 commit is pushed.
- Primary category is recorded as `role_owner_acl_error_detected`.
- Secondary extension/schema signals are recorded.
- `--no-owner --no-privileges` retry boundary is documented.
- Raw diagnostic logs remain root-only and undisplayed.
- Target is local isolated PostgreSQL only.
- Restore attempt count is one.
- Target cleanup plan is explicit.
- Obsidian logging is ready.

No-Go:

- Raw diagnostic log display is required.
- Extension preinstall is required but not planned.
- Supabase/production connection is required.
- Target identity is unclear.
- Artifact checksum mismatches.
- Raw log/dump/row content display is needed.
- Cleanup plan is unclear.
- Obsidian logging is not updated.

### 17.5 Safety Boundary

```txt
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
production_db_connection_executed=false
production_restore_executed=false
primary_failure_category_recorded=true
secondary_failure_signals_recorded=true
remediation_plan_created=true
loop_213_retry_ready=true
dr_readiness_status=not_ready_restore_failed
```
