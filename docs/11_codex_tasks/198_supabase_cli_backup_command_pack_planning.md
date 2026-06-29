# Loop 198: Supabase CLI Backup Command Pack Planning

## 1. Purpose

Plan a future Supabase CLI / database export command pack without executing it.

Loop 197 completed the backup dry-run design boundary. Loop 198 turns that boundary into a placeholder-only command pack plan that can be reviewed before any later preflight or export Loop.

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

This Loop does not execute any Supabase, database, backup, restore, runtime, LINE, OpenAI, Nginx, DNS, or certbot operation.

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

## 4. Command Pack Status

```txt
command_pack_status=planned
placeholder_only=true
execution_approved=false
```

The command pack is a design artifact only. It must not be copied and executed as-is. A future execution Loop must replace placeholders in an operator-controlled shell and must not expose secret values to docs, chat, Git, logs, or screenshots.

## 5. Placeholder Policy

```txt
placeholder_policy_created=true
```

Rules:

- Command pack examples may include placeholders only.
- Never include a real database URL.
- Never include a real provider project identifier.
- Never include real tokens, keys, passwords, or session values.
- Never include a real backup artifact filename if it could reveal secret-like or tenant-sensitive details.
- All example paths must be generic.
- All example outputs must be sanitized.
- Shell xtrace is prohibited.
- Command output must be summarized without printing secrets or row contents.

Allowed placeholders:

```txt
<OPERATOR_SUPPLIED_DB_URL>
<OPERATOR_APPROVED_BACKUP_DIR>
<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>
<BACKUP_ARTIFACT_SHA256>
<BACKUP_ARTIFACT_SIZE_BYTES>
<NON_PRODUCTION_RESTORE_TARGET>
```

## 6. Preflight Command Group

```txt
preflight_command_group=planned
preflight_execution_status=not_executed
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
```

Purpose:

- Check tool availability.
- Check backup directory existence.
- Check that artifact paths are outside the repository.
- Check that no command echoes secrets.
- Check that the operator has approved the exact scope.

Placeholder-only examples:

```bash
# placeholder only; do not execute in Loop 198
command -v supabase || true
command -v pg_dump || true
test -d "<OPERATOR_APPROVED_BACKUP_DIR>"
case "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>" in
  /Users/*/Desktop/PROJECT/amami-line-crm/*) exit 1 ;;
  *) printf "artifact path outside repo: ok\n" ;;
esac
```

## 7. Export Command Group

```txt
export_command_group=planned
export_execution_status=not_executed
backup_artifact_created=false
DB export performed=false
```

Purpose:

- Define a future export command placeholder.
- Define a future artifact creation path placeholder.
- Define checksum and size recording placeholders.

Placeholder-only examples:

```bash
# placeholder only; do not execute in Loop 198
# future command uses operator-supplied secret outside docs/chat/Git
pg_dump "<OPERATOR_SUPPLIED_DB_URL>" > "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
shasum -a 256 "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
wc -c "<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>"
```

Only checksum and size may be recorded in a future approved execution Loop. Artifact contents must never be displayed.

## 8. Verification Command Group

```txt
verification_command_group=planned
verification_execution_status=not_executed
artifact_contents_displayed=false
```

Purpose:

- Check future artifact existence.
- Check future file size.
- Check future checksum.
- Confirm no content display.

Placeholder-only examples:

```bash
# placeholder only; do not execute in Loop 198
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

- Backup artifacts must be outside the repository.
- Backup artifacts must not be committed.
- Backup artifacts must not be uploaded to chat.
- Backup artifacts must not be copied into docs.
- Backup artifacts must not be inspected by content display commands.
- Secure storage must be operator-approved before any real export.
- Retention and deletion rules require a separate explicit Loop.

## 10. Restore Roadmap Group

```txt
restore_roadmap_group=planned
restore_execution_status=not_executed
production_restore_allowed=false
```

Roadmap:

1. Export only in a future approved Loop.
2. Record checksum and size only.
3. Store artifact in an operator-approved secure location.
4. Plan non-production restore separately.
5. Execute non-production restore only after explicit approval.
6. Validate schema, tenant isolation, RLS, repository mapping, Admin API smoke, and LINE webhook safety in non-production.
7. Keep production restore prohibited unless a separate incident-recovery approval exists.

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

Future Loop 199 may only request this limited approval scope:

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
- A production incident is active.
- Restore target is production.
- Any command would display artifact contents or database row contents.

## 13. Future Loop Split

```txt
future_loop_split_created=true
```

```txt
Loop 199: Supabase CLI backup dry-run preflight
- explicit approval required
- tool/path checks only
- no database URL
- no DB export
- no backup artifact

Loop 200: Supabase backup export controlled execution
- explicit approval required
- operator injects secrets outside docs/chat/Git
- creates artifact outside repo
- records checksum/size only
- no restore

Loop 201: Supabase non-production restore drill plan
- docs/checklist only
- no production restore

Loop 202: Supabase non-production restore controlled execution
- explicit approval required
- non-production only
```

## 14. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 197 Backup Dry-Run Design](197_supabase_cli_backup_dry_run_design.md)
- [Runbook](../15_runbooks/supabase_cli_backup_command_pack_planning.md)

## Safety Evidence

Read-only checks only:

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

## Test Coverage

- Loop 198 task doc exists.
- Command pack planning runbook exists.
- Placeholder policy exists.
- Preflight/export/verification/artifact/restore command groups exist.
- Approval tokens exist.
- Not-executed status is recorded.
- Blocked execution status is recorded.
- Obsidian link map includes Loop 198.
- Production readiness remains Go.
- Secret-shaped values are not recorded.

## Next Loop

```txt
Loop 199: Supabase CLI backup dry-run preflight
```
