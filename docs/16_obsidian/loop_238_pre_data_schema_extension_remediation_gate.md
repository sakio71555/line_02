# Loop 238: Pre-Data Schema Extension Remediation Gate

## Decisions

- Loop 238 is a schema/extension remediation gate only.
- Restore, `pg_restore`, `psql`, DB changes, and extension creation are not executed.
- Loop 237 recorded permission/auth and role/ACL counts as `0`.
- The remaining failure area is treated as schema/extension.
- The next Loop is `Loop 239: operator-only sanitized schema extension classifier`.
- Raw log, SQL statements, object names, extension names, role names, dump content, and row content are not recorded.
- Handoff latest files are updated.

## DevelopmentLog

- Summarized Loop 237 sanitized result.
- Re-evaluated permission/auth and role/ACL as currently resolved to count `0`.
- Split the remaining issue into `extension_missing_count=2` and `schema_or_sql_statement_error_count=1`.
- Compared remediation candidates A-E.
- Selected operator-only sanitized schema/extension classifier as the next low-risk step.
- Defined Loop 239 allowed and forbidden fields.
- Updated runbook, dev log, Obsidian map, handoff latest files, DR readiness matrix, verification matrix, README, and docs index.
- Verification commands: `git status --short`, `git diff --check`, docs link check, secret pattern boolean check, `npx pnpm@10.12.1 lint`.

## Risks

- The concrete extension/schema cause is still unconfirmed.
- Avoiding raw log review by Codex leaves some misclassification risk.
- Hiding exact extension names keeps docs safer but makes remediation more abstract.
- Extension creation would require DB changes and must be split into a later Loop.
- DR readiness remains incomplete until restore succeeds.

## Checklist

```txt
working_directory_confirmed=true
tmp_used=false
obsidian_updated=true
handoff_latest_codex_result_updated=true
handoff_latest_gpt_review_prompt_updated=true
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
diagnostic_log_displayed=false
raw_log_displayed=false
object_names_displayed=false
sql_displayed=false
extension_names_displayed=false
role_names_displayed=false
dump_content_displayed=false
row_content_displayed=false
loop237_permission_auth_resolved=true
loop237_role_acl_resolved=true
schema_extension_remediation_gate_created=true
target_db_currently_absent=true
cleanup_required=false
next_loop_selected=true
dr_readiness_status=not_ready_restore_failed
```
