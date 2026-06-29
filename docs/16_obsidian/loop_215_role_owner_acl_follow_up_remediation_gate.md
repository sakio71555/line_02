# Loop 215: role owner ACL follow-up remediation gate

## Decisions

- Loop 215 is a docs-only gate Loop.
- Do not repeat the same `--no-owner --no-privileges` restore retry.
- Do not accept `pg_restore_exit_code=1` as acceptable, because sanitized validation did not run.
- Defer extension remediation because Loop 213 `extension_missing_count=0`.
- Defer role placeholder provisioning until the remaining role/ACL subcategory is known.
- Recommend Loop 216: operator-only role ACL subcategory review gate without raw log exposure.

## DevelopmentLog

- Reviewed existing Loop 212 / Loop 213 sanitized docs.
- Compared Loop 211 role/ACL count `14` with Loop 213 count `1`.
- Recorded that `--no-owner --no-privileges` remains the required baseline but did not fully resolve restore.
- Added Loop 215 task doc.
- Updated restore drill runbook, dev log, Obsidian navigation, and handoff latest files.
- Verification commands: `git diff --check`, docs link check, secret pattern boolean check, `npx pnpm@10.12.1 lint`.

## Risks

- Remaining raw diagnostic log may contain sensitive details and must stay root-only.
- Without a sanitized subcategory, role placeholder provisioning may create unnecessary local state.
- Accepting nonzero restore exit would give false DR confidence.
- DR readiness remains incomplete until an isolated restore succeeds and is validated.

## Checklist

working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
restore_executed=false
pg_restore_executed=false
psql_executed=false
target_db_created=false
target_db_changed=false
vps_package_changed=false
cluster_changed=false
db_changed=false
diagnostic_log_displayed=false
diagnostic_log_copied_into_repo=false
raw_log_displayed=false
dump_content_displayed=false
row_content_displayed=false
db_url_displayed=false
secrets_recorded=false
backup_artifact_touched=false
backup_artifact_copied_into_repo=false
supabase_connection_executed=false
production_db_connection_executed=false
production_restore_executed=false
production_runtime_changed=false
remediation_gate_created=true
recommended_next_loop_selected=true
