# Supabase CLI Backup Command Pack Planning

Loop 198 runbook.

## 1. Purpose

Create a placeholder-only command pack plan for a future Supabase CLI / database export backup path.

This runbook is not executable authorization. It is a review artifact that defines command groups, placeholders, approval tokens, No-Go conditions, artifact handling, and a restore roadmap.

## 2. Current Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
Supabase configured; values not recorded
```

## 3. Non-Goals For This Loop

```txt
command_pack_status=planned
placeholder_only=true
preflight_execution_status=not_executed
export_execution_status=not_executed
verification_execution_status=not_executed
restore_execution_status=not_executed
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
restore performed=false
backup artifact created=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
secrets_recorded=false
```

Do not run Supabase CLI, provider API calls, database export commands, restore commands, backup artifact creation, runtime changes, LINE sends, OpenAI requests, Nginx reloads/restarts, DNS changes, certbot, cron, or timers in this Loop.

## 4. Command Pack Status

```txt
command_pack_status=planned
placeholder_only=true
execution_approved=false
```

The command pack is split into:

- Preflight command group.
- Export command group.
- Verification command group.
- Artifact handling group.
- Restore roadmap group.

## 5. Placeholder Policy

```txt
placeholder_policy_created=true
```

Allowed placeholders:

```txt
<OPERATOR_SUPPLIED_DB_URL>
<OPERATOR_APPROVED_BACKUP_DIR>
<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>
<BACKUP_ARTIFACT_SHA256>
<BACKUP_ARTIFACT_SIZE_BYTES>
<NON_PRODUCTION_RESTORE_TARGET>
```

Rules:

- Placeholder examples only.
- Never include a real database URL.
- Never include a real provider project identifier.
- Never include real tokens or passwords.
- Never include a real backup artifact filename if it could reveal sensitive details.
- All example paths must be generic.
- All example outputs must be sanitized.
- Shell xtrace is prohibited.
- Raw database rows and artifact contents must never be displayed.

## 6. Preflight Command Group

```txt
preflight_command_group=planned
preflight_execution_status=not_executed
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
```

Purpose:

- Tool availability check.
- Backup directory existence check.
- Artifact path outside repo check.
- No secret echo policy check.

Placeholder-only examples:

```bash
# placeholder only; not executable approval
command -v supabase || true
command -v pg_dump || true
test -d "<OPERATOR_APPROVED_BACKUP_DIR>"
test "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>" != ""
```

## 7. Export Command Group

```txt
export_command_group=planned
export_execution_status=not_executed
backup_artifact_created=false
DB export performed=false
```

Purpose:

- Future export command placeholder.
- Artifact creation path placeholder.
- Checksum recording placeholder.

Placeholder-only examples:

```bash
# placeholder only; not executable approval
pg_dump "<OPERATOR_SUPPLIED_DB_URL>" > "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
shasum -a 256 "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
wc -c "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
```

## 8. Verification Command Group

```txt
verification_command_group=planned
verification_execution_status=not_executed
artifact_contents_displayed=false
```

Purpose:

- Future artifact existence check.
- Future file size check.
- Future checksum check.
- No content display.

Placeholder-only examples:

```bash
# placeholder only; not executable approval
test -f "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
printf "backup_artifact_size_bytes=<BACKUP_ARTIFACT_SIZE_BYTES>\n"
printf "backup_artifact_sha256=<BACKUP_ARTIFACT_SHA256>\n"
```

## 9. Artifact Handling Group

```txt
artifact_handling_group=planned
backup_artifact_created=false
artifact_storage_approved=false
```

Rules:

- Artifact path must be outside the repository.
- Artifact storage must be operator-approved.
- Artifact contents must not be displayed.
- Artifact must not be uploaded to chat.
- Artifact must not be committed.
- Artifact checksum and size may be recorded in a future approved execution Loop.
- Retention and deletion require a separate future approval Loop.

## 10. Restore Roadmap Group

```txt
restore_roadmap_group=planned
restore_execution_status=not_executed
production_restore_allowed=false
```

Rules:

- Non-production restore only.
- Production restore prohibited.
- Separate explicit approval required.
- Restore validation must cover schema, tenant isolation, RLS, repository mapping, Admin API smoke, and LINE webhook safety.

## 11. Approval Tokens

```txt
approval_tokens_created=true
ALLOW_SUPABASE_CLI_PREFLIGHT=false
ALLOW_SUPABASE_CLI_OR_API_CALL=false
ALLOW_PG_DUMP_EXECUTION=false
ALLOW_DB_EXPORT=false
ALLOW_BACKUP_ARTIFACT_CREATION=false
ALLOW_BACKUP_ARTIFACT_CHECKSUM=false
ALLOW_RESTORE=false
ALLOW_PRODUCTION_RESTORE=false
ALLOW_SECRET_OPERATOR_INJECTION=false
```

Loop 199 preflight may request only:

```txt
ALLOW_SUPABASE_CLI_PREFLIGHT=true
ALLOW_SUPABASE_CLI_OR_API_CALL=false
ALLOW_PG_DUMP_EXECUTION=false
ALLOW_DB_EXPORT=false
ALLOW_RESTORE=false
```

## 12. No-Go Conditions

```txt
no_go_conditions_created=true
```

No-Go:

- Any real database URL would be printed.
- Any token, key, or password would be printed.
- Backup path is inside the repository.
- Artifact storage location is not approved.
- Command output cannot be sanitized.
- Operator has not approved the exact execution scope.
- Production incident is active.
- Restore target is production.

## 13. Future Loop Split

```txt
future_loop_split_created=true
Loop 199: Supabase CLI backup dry-run preflight
Loop 200: Supabase backup export controlled execution
Loop 201: Supabase non-production restore drill plan
Loop 202: Supabase non-production restore controlled execution
```

## 14. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 198 Task Doc](../11_codex_tasks/198_supabase_cli_backup_command_pack_planning.md)

## 15. Read-Only Safety Evidence

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
```

## 16. Next Loop

```txt
Loop 199: Supabase CLI backup dry-run preflight
```

## 17. Loop 199 Preflight Closeout

Loop 199 executed the approved preflight only.

```txt
preflight_status=complete
backup_readiness_status=blocked_tooling_missing
backup_dir_ready=true
backup_dir_outside_repo=true
supabase_cli_available=false
pg_dump_available=false
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
```

See [Supabase Backup Export And Restore Readiness Closeout](supabase_backup_export_and_restore_readiness_accelerated_closeout.md).

## 18. Loop 200 Tooling Installation Preflight

Loop 200 installs PostgreSQL client tooling only. Supabase CLI remains uninstalled.

```txt
tooling_preflight_status=complete
postgresql_client_installed=true
pg_dump_available_after=true
psql_available_after=true
supabase_cli_installed=false
Supabase CLI/API called=false
pg_dump connection attempted=false
DB export performed=false
backup artifact created=false
restore performed=false
```

See [Supabase Backup Tooling Installation Preflight](supabase_backup_tooling_installation_preflight.md).
