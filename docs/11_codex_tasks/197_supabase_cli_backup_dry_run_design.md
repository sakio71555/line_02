# Loop 197: Supabase CLI Backup Dry-Run Design

## 1. Purpose

Design the future Supabase CLI / pg_dump style backup dry-run path after the Loop 196 operator decision.

Loop 196 selected:

```txt
selected_path=B_planning_only
decision=Free PlanのままCLI/pg_dump系backup dry-runの設計だけ進める
Supabase Pro upgrade=false
Supabase CLI/API approval=false
DB export approval=false
restore approval=false
backup_success_status=not_achieved
secret_handling_design_only=true
```

This Loop creates design, safety boundaries, approval tokens, No-Go conditions, and future Loop split only.

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

Supabase backup state:

```txt
Free Plan limitation observed
Dashboard managed backup unavailable
backup_success_status=not_achieved
restore_verification_status=not_achieved
selected_path=B_planning_only
```

## 3. Non-Goals For This Loop

This Loop does not execute any backup command.

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

Not performed:

- Supabase CLI execution.
- Supabase API execution.
- pg_dump execution.
- DB export.
- DB restore.
- Supabase access token issue.
- Database URL display.
- server-side key display.
- secret file display, copy, or recording.
- backup artifact creation, download, upload, archive creation, deletion, or inspection.
- runtime/API/UI/migration/RLS changes.
- LINE send.
- OpenAI API call.
- Nginx reload/restart/config change.
- DNS change.
- certbot execution.
- cron/systemd timer creation.

## 4. Backup Design Boundary

The backup dry-run path remains design-only until a future Loop receives explicit operator approval.

Allowed now:

- Define secret handling requirements.
- Define artifact handling requirements.
- Define approval tokens.
- Define command-pack principles with placeholders only.
- Define No-Go conditions.
- Define restore verification roadmap.
- Record read-only safety evidence.

Blocked now:

- Any command that connects to Supabase.
- Any command that exports or restores data.
- Any command that creates a backup artifact.
- Any command that prints a connection string, token, key, password, project identifier, or raw data.

## 5. Secret Handling Model

```txt
secret_handling_model_created=true
secret_handling_design_only=true
secrets_recorded=false
```

Rules:

- Codex must not receive database URL, server-side key, browser key, access token, or database password.
- The operator injects secrets only in an approved local or VPS shell session.
- Commands must not echo secrets.
- Shell xtrace is prohibited.
- Env files must not be displayed.
- Secret files must not be copied into the repository.
- Output must be redirected, summarized, or sanitized.
- Backup logs may contain only status summaries.
- Raw command output must not be pasted into chat or docs if it contains connection strings, provider identifiers, tokens, keys, passwords, or row contents.
- If a future command would reveal a secret, that Loop must stop before execution.

Allowed wording:

```txt
Supabase configured; values not recorded
CLI backup dry-run design only
secret handling design created=true
secrets_recorded=false
```

## 6. Artifact Handling Model

```txt
artifact_handling_model_created=true
backup artifact created=false
```

Rules:

- Backup artifacts must not be committed to the repo.
- Backup artifacts must not be uploaded to chat.
- Backup artifacts must not be placed under the project git tree.
- Artifact paths must be outside the repo and operator-approved.
- Artifact checksum may be recorded.
- Artifact size may be recorded.
- Artifact contents must not be recorded.
- Secure storage must be operator-approved before any real export.
- Restore drills must use a non-production target first.

Allowed placeholders:

```txt
<OPERATOR_SUPPLIED_DB_URL>
<OPERATOR_APPROVED_BACKUP_DIR>
<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>
```

## 7. Approval Tokens

Future execution Loops must default every token to false.

```txt
approval_tokens_created=true
ALLOW_SUPABASE_CLI_CHECK=false by default
ALLOW_SUPABASE_DB_EXPORT=false by default
ALLOW_PG_DUMP_EXECUTION=false by default
ALLOW_BACKUP_ARTIFACT_CREATION=false by default
ALLOW_RESTORE=false always false until non-production restore Loop
ALLOW_SECRET_OPERATOR_INJECTION=false by default
```

Rules:

- A future Loop may proceed only if the operator explicitly supplies the required token as true.
- Approval to check tool availability is not approval to export data.
- Approval to export data is not approval to restore data.
- Approval to create an artifact is not approval to commit, upload, or inspect artifact contents.

## 8. Draft Command-Pack Principles

```txt
command_pack_principles_created=true
```

Principles:

- Use placeholders only in docs.
- Do not include raw database URLs in docs.
- Do not execute commands in a design Loop.
- Do not enable shell xtrace.
- Output summary only.
- Write artifacts outside the repository.
- Checksum recording is allowed.
- File content display is prohibited.
- Failure must stop before retry.
- Any retry requires a separate explicit decision.

Allowed placeholder examples:

```txt
<OPERATOR_SUPPLIED_DB_URL>
<OPERATOR_APPROVED_BACKUP_DIR>
<BACKUP_ARTIFACT_PATH_OUTSIDE_REPO>
```

## 9. No-Go Conditions

```txt
no_go_conditions_created=true
```

No-Go:

- Operator has not approved CLI/API execution.
- Operator has not approved DB export.
- Operator has not approved backup artifact location.
- Operator cannot provide secrets without exposing them to Codex, docs, chat, or Git.
- Secure storage is undecided.
- Non-production restore path is undecided.
- Production incident is active.
- Any command would print database URL, token, key, password, provider identifier, or row data.
- Any artifact would be created under the repo.
- Any artifact would be uploaded to chat.

## 10. Future Loop Split

```txt
future_loop_split_created=true
```

Recommended split:

```txt
Loop 198: Supabase CLI backup command pack planning
- docs only
- placeholders only
- no execution

Loop 199: Supabase CLI backup dry-run preflight
- explicit approval required
- checks tool availability only
- no DB export

Loop 200: Supabase backup export controlled execution
- explicit approval required
- creates backup artifact outside repo
- no restore

Loop 201: Supabase non-production restore drill plan
- docs/checklist only

Loop 202: Supabase non-production restore controlled execution
- explicit approval required
- no production restore
```

## 11. Restore Verification Roadmap

```txt
restore_verification_roadmap_created=true
restore_verification_status=not_achieved
```

Roadmap:

1. Confirm a successful backup artifact exists outside the repo.
2. Record checksum and size only.
3. Confirm operator-approved secure storage.
4. Create a non-production restore plan.
5. Execute restore only in a future explicitly approved Loop.
6. Validate schema shape, tenant-scoped reads, RLS behavior, repository mapping, Admin API smoke, and LINE webhook safety in non-production.
7. Keep production restore blocked until a separate production incident or recovery approval exists.

## 12. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Obsidian README](../16_obsidian/README.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 196 Operator Decision](196_supabase_backup_path_operator_decision_free_plan_cli_planning_only.md)
- [Runbook](../15_runbooks/supabase_cli_backup_dry_run_design.md)

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

- Loop 197 task doc exists.
- CLI backup dry-run design runbook exists.
- Secret handling model exists.
- Artifact handling model exists.
- Approval tokens exist.
- Command-pack principles exist.
- No-Go conditions exist.
- Future Loop split exists.
- Restore verification roadmap exists.
- Supabase CLI/API called=false is recorded.
- pg_dump executed=false is recorded.
- DB export performed=false is recorded.
- restore performed=false is recorded.
- backup artifact created=false is recorded.
- Obsidian link map includes Loop 197.
- production readiness remains Go.
- Secret-shaped values are not recorded.

## Next Loop

```txt
Loop 198: Supabase CLI backup command pack planning
```
