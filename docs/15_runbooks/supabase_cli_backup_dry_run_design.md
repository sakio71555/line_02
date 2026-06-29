# Supabase CLI Backup Dry-Run Design

Loop 197 runbook.

## 1. Purpose

Define the safe design boundary for a future Supabase CLI / pg_dump-style backup dry-run.

This is not an execution runbook. It does not authorize Supabase CLI/API execution, pg_dump execution, DB export, restore, access token issue, backup artifact creation, runtime changes, LINE send, OpenAI API call, Nginx/DNS/certbot changes, or timer setup.

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

Current backup state:

```txt
backup_success_status=not_achieved
restore_verification_status=not_achieved
selected_path=B_planning_only
design_status=complete
```

## 3. Non-Goals For This Loop

```txt
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

## 4. Backup Design Boundary

Design only:

- No command execution.
- No provider API access.
- No database export.
- No restore.
- No artifact creation.
- No raw secrets, connection strings, provider identifiers, or data in docs/chat/Git.

## 5. Secret Handling Model

```txt
secret_handling_model_created=true
secret_handling_design_only=true
```

Rules:

- Codex must not receive database URL, server-side key, browser key, access token, or database password.
- Operator supplies secrets only in an approved shell session for an approved future execution Loop.
- Commands must not echo secrets.
- Shell xtrace is prohibited.
- Env files must not be displayed.
- Secret files must not be copied.
- Logs must be sanitized summaries only.
- Raw output containing connection strings, keys, tokens, identifiers, or row contents must not be pasted into chat/docs.

## 6. Artifact Handling Model

```txt
artifact_handling_model_created=true
backup artifact created=false
```

Rules:

- Backup artifact must not be committed to repo.
- Backup artifact must not be uploaded to chat.
- Backup artifact must not be placed under project git tree.
- Artifact path must be outside repo and operator-approved.
- Artifact checksum may be recorded.
- Artifact size may be recorded.
- Artifact contents must not be recorded.
- Secure storage must be decided before export.

Allowed placeholders:

```txt
<OPERATOR_SUPPLIED_DB_URL>
<OPERATOR_APPROVED_BACKUP_DIR>
<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>
```

## 7. Approval Tokens

```txt
approval_tokens_created=true
ALLOW_SUPABASE_CLI_CHECK=false by default
ALLOW_SUPABASE_DB_EXPORT=false by default
ALLOW_PG_DUMP_EXECUTION=false by default
ALLOW_BACKUP_ARTIFACT_CREATION=false by default
ALLOW_RESTORE=false always false until non-production restore Loop
ALLOW_SECRET_OPERATOR_INJECTION=false by default
```

Approval token scope:

- CLI check approval does not allow export.
- Export approval does not allow restore.
- Artifact creation approval does not allow committing or uploading artifacts.
- Restore stays blocked until a non-production restore Loop.

## 8. Draft Command-Pack Principles

```txt
command_pack_principles_created=true
```

- Placeholders only.
- No raw database URL in docs.
- No execution in design Loop.
- No shell xtrace.
- Summary output only.
- Artifact path outside repo.
- Checksum allowed.
- File content display prohibited.
- Failure stops before retry.

## 9. No-Go Conditions

```txt
no_go_conditions_created=true
```

No-Go:

- CLI/API execution is not explicitly approved.
- DB export is not explicitly approved.
- Backup artifact location is not approved.
- Operator cannot inject secrets without exposing them.
- Secure storage is undecided.
- Non-production restore path is undecided.
- Production incident is active.
- Any command would print database URL, token, key, password, provider identifier, or row data.

## 10. Future Loop Split

```txt
future_loop_split_created=true
Loop 198: Supabase CLI backup command pack planning
Loop 199: Supabase CLI backup dry-run preflight
Loop 200: Supabase backup export controlled execution
Loop 201: Supabase non-production restore drill plan
Loop 202: Supabase non-production restore controlled execution
```

## 11. Restore Verification Roadmap

```txt
restore_verification_roadmap_created=true
restore_verification_status=not_achieved
```

Steps:

1. Confirm backup artifact exists outside repo.
2. Record checksum and size only.
3. Confirm secure storage owner and location.
4. Plan non-production restore.
5. Execute non-production restore in a future approved Loop.
6. Validate tenant isolation, RLS, repository mappings, Admin API smoke, and LINE webhook safety.
7. Keep production restore blocked until separate approval.

## 12. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 197 Task Doc](../11_codex_tasks/197_supabase_cli_backup_dry_run_design.md)

## 13. Read-Only Safety Evidence

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

## 14. Next Loop

```txt
Loop 198: Supabase CLI backup command pack planning
```

## 15. Loop 198 Command Pack Planning Follow-Up

Loop 198 expands this design into a placeholder-only command pack plan.

```txt
command_pack_status=planned
placeholder_only=true
preflight_command_group=planned
export_command_group=planned
verification_command_group=planned
artifact_handling_group=planned
restore_roadmap_group=planned
preflight_execution_status=not_executed
export_execution_status=not_executed
restore_execution_status=not_executed
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
backup artifact created=false
restore performed=false
secrets_recorded=false
```

See [Supabase CLI Backup Command Pack Planning](supabase_cli_backup_command_pack_planning.md).
