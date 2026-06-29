# Loop 196: Supabase Backup Path Operator Decision Free Plan CLI Planning Only

## 1. Purpose

Record the operator decision after Loop 195: stay on the current Free Plan and move only to CLI/pg_dump-style backup dry-run design.

This Loop records operator decision and boundaries only. It does not authorize Supabase Pro upgrade, Supabase dashboard operation, Supabase CLI/API execution, pg_dump execution, database export, restore, backup artifact handling, runtime change, LINE send, OpenAI API call, Nginx/DNS/certbot change, cron setup, or systemd timer setup.

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

## 3. Operator Decision

```txt
operator_decision_status=recorded
selected_path=B_planning_only
decision=Free PlanのままCLI/pg_dump系backup dry-runの設計だけ進める
Supabase Pro upgrade=false
Supabase CLI/API approval=false
DB export approval=false
restore approval=false
backup_success_status=not_achieved
secret_handling_design_only=true
secrets_recorded=false
```

This means the next step is design-only planning. It is not approval to execute commands or export data.

## 4. What Is Approved

Approved for the next design Loop:

- CLI/pg_dump-style backup design.
- Secret handling design.
- Dry-run boundary design.
- Command pack planning without execution.
- Non-production restore drill planning.

## 5. What Is Not Approved

Not approved:

- Supabase Pro upgrade.
- Supabase plan change.
- Supabase dashboard operation by Codex.
- Supabase CLI execution.
- Supabase API execution.
- pg_dump execution.
- Database export.
- Database restore.
- Production restore.
- Secret display.
- Backup artifact download or upload.
- Backup archive creation or deletion.
- Cron or systemd timer.
- Runtime/API/UI/DB/RLS changes.
- Additional LINE send.
- OpenAI API call.
- Nginx/DNS/certbot changes.

## 6. Risk Rationale

```txt
risk_rationale:
- Pro/managed backup has cost impact, so not selected now
- CLI/pg_dump path may support Free Plan but has secret handling risk
- Therefore next step is design-only boundary before any command execution
- Any future execution requires explicit approval and secret-safe operator injection
```

Option B is selected only as a planning path. It is not selected as an execution path yet.

## 7. Next Design Boundary

```txt
Loop 197: Supabase CLI backup dry-run design
scope:
- docs/design only
- command pack draft only
- no execution
- no DB URL display
- no secrets
- no export
- no restore
```

The next Loop may draft a command pack, but must not run it.

## 8. No-Go Conditions

- Any command would print secret values, database connection details, provider identifiers, or raw data.
- Operator has not approved command execution.
- Operator has not approved DB export.
- Operator has not approved restore.
- Secure backup storage is not selected.
- Non-production restore target is not defined.
- Production incident is active.
- Any artifact would be committed to Git or uploaded to chat.

## 9. Future Loop Split

```txt
Loop 197: Supabase CLI backup dry-run design
Loop 198: Supabase CLI backup dry-run explicit approval gate
Loop 199: Supabase CLI backup dry-run execution if approved
Loop 200: Supabase non-production restore drill planning after backup success
```

Loop numbers may change if a smaller safety patch is needed, but execution must stay separated from design.

## 10. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 195 Backup Path Decision](195_supabase_backup_path_decision_after_free_plan_limitation.md)
- [Loop 196 Runbook](../15_runbooks/supabase_backup_path_operator_decision_free_plan_cli_planning_only.md)

## Safety Evidence

Read-only production checks after recording:

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

## Safety Flags

```txt
Supabase CLI/API called=false
DB export performed=false
restore performed=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Nginx/DNS/certbot changes=false
secrets_recorded=false
```

## Test Coverage

- Loop 196 task doc exists.
- Operator decision runbook exists.
- `selected_path=B_planning_only` is recorded.
- Supabase Pro upgrade remains false.
- Supabase CLI/API approval remains false.
- Database export and restore approvals remain false.
- Secret handling is design-only.
- Backup success remains not achieved.
- Loop 197 design-only next boundary is recorded.
- Obsidian links include Loop 196.
- Secret-like values are not recorded.

## Next Loop

```txt
Loop 197: Supabase CLI backup dry-run design
```
