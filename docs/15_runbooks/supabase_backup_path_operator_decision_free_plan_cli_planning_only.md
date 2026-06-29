# Supabase Backup Path Operator Decision: Free Plan CLI Planning Only

Loop 196 decision runbook.

## 1. Purpose

Record that the operator selected the Free Plan CLI/pg_dump-style backup path for planning only.

This runbook is not an execution runbook. It does not authorize Supabase Pro upgrade, Supabase CLI/API execution, pg_dump execution, database export, restore, artifact handling, runtime change, LINE send, OpenAI call, Nginx/DNS/certbot change, cron setup, or systemd timer setup.

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

The selected path is planning-only. Command execution, export, restore, and backup artifact creation remain blocked.

## 4. What Is Approved

Approved:

- CLI/pg_dump-style backup design.
- Secret handling design.
- Dry-run boundary design.
- Command pack planning without execution.
- Non-production restore drill planning.

## 5. What Is Not Approved

Not approved:

- Supabase CLI execution.
- Supabase API execution.
- pg_dump execution.
- DB export.
- DB restore.
- Production restore.
- Secret display.
- Backup artifact download or upload.
- Cron or systemd timer.
- Supabase plan upgrade.

## 6. Risk Rationale

```txt
risk_rationale:
- Pro/managed backup has cost impact, so not selected now
- CLI/pg_dump path may support Free Plan but has secret handling risk
- Therefore next step is design-only boundary before any command execution
- Any future execution requires explicit approval and secret-safe operator injection
```

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

## 8. No-Go Conditions

- Command execution is requested without explicit approval.
- Database export or restore is requested without explicit approval.
- Secret values would be displayed, pasted, committed, logged, or uploaded.
- Secure backup storage is not defined.
- Non-production restore target is not defined.
- Backup artifact would enter Git or chat.
- Production incident is active.

## 9. Future Loop Split

```txt
Loop 197: Supabase CLI backup dry-run design
Loop 198: Supabase CLI backup dry-run explicit approval gate
Loop 199: Supabase CLI backup dry-run execution if approved
Loop 200: Supabase non-production restore drill planning after backup success
```

## 10. Obsidian Links

- [OBSIDIAN.md](../../OBSIDIAN.md)
- [Obsidian Link Map](../16_obsidian/obsidian_link_map.md)
- [Development Log](../14_dev_logs/2026-06-28.md)
- [Loop 196 Task Doc](../11_codex_tasks/196_supabase_backup_path_operator_decision_free_plan_cli_planning_only.md)
- [Loop 195 Backup Path Decision Runbook](supabase_backup_path_decision_after_free_plan_limitation.md)

## 11. Safety Evidence

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

## 12. Safety Boundary

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

## 13. Next Loop

```txt
Loop 197: Supabase CLI backup dry-run design
```
