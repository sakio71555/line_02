# Production Operations Hardening Package

## Purpose

Give the operator a practical production operations package after DR restore route freeze.

This runbook is for read-only operations, safe Friday demo preparation, and incident handoff. It does not authorize DR restore, helper preflight, helper execute, `pg_restore` restore, `psql`, Supabase DB connection, production DB connection, DB changes, LINE real send, OpenAI API execution, service restart, Nginx reload, package operations, or runtime configuration changes.

## Current Decision

```txt
loop_301_status=complete
production_operations_hardening_decision=approved
production_operations_hardening_package_created=true
production_readonly_smoke_checklist_created=true
production_readonly_smoke_script_created=true
operator_daily_check_template_created=true
incident_response_handoff_created=true
friday_demo_readiness_package_created=true
friday_demo_runbook_created=true
safe_demo_scope_defined=true
friday_demo_scope=safe_read_only_and_no_external_send_demo
dr_restore_route_status=frozen_known_risk
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
```

## Daily Operator Check Template

Record only category or boolean fields:

```txt
daily_check_api_service_active=true_or_false
daily_check_nginx_active=true_or_false
daily_check_public_api_health_200=true_or_false
daily_check_public_admin_root_200=true_or_false
daily_check_public_customers_no_auth_401=true_or_false
daily_check_disk_capacity_ok=true_or_false
daily_check_memory_capacity_ok=true_or_false
daily_check_line_real_send_not_required=true
daily_check_openai_api_not_required=true
daily_check_dr_known_risk_acknowledged=true
```

## Reusable Read-Only Smoke

Script:

```txt
readonly_smoke_script=scripts/ops/production_readonly_smoke.sh
readonly_smoke_script_embeds_urls=false
readonly_smoke_script_reads_secrets=false
readonly_smoke_script_prints_response_body=false
readonly_smoke_script_authenticated_checks=false
```

Usage policy:

- Provide public endpoint values through the shell environment only.
- Do not write endpoint values to docs or commit history.
- Do not source `.env`.
- Do not print response bodies.
- Treat `readonly_smoke_status=not_configured` as operator setup required.

## Incident Response Checklist

| Signal | Operator action | Hard No-Go |
| --- | --- | --- |
| API inactive | Record sanitized status and escalate. | No blind restart. |
| Admin unavailable | Record status category and time window. | No authenticated checks without approval. |
| Nginx inactive | Escalate before any runtime action. | No reload/restart without approval. |
| Disk/memory warning | Pause nonessential work and escalate. | No package or cleanup changes without approval. |
| Unexpected 5xx | Record sanitized status only. | Do not paste raw logs into docs. |
| LINE/OpenAI dependency issue | Hold sends/calls until approved. | No retry, bulk, paid call, or real send. |
| DR concern | Keep frozen known risk boundary. | No restore loop restart without new strategy. |

## Friday Demo Runbook

Show:

- production baseline is active
- public health/admin/auth-guard status categories
- Admin/UI flow only if safe and separately approved
- LINE CRM and FAQ/AI concept through a non-sending flow
- known DR risk and future alternative strategy direction

Do not show or execute:

- real LINE send
- OpenAI API call
- DB restore
- production DB operation
- secret values
- raw logs
- destructive operations
- authenticated customer data unless separately approved

Demo explanation:

```txt
production_runtime_baseline_confirmed=true
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
production_operations_priority=true
future_dr_resume_requires_new_strategy=true
```

## Next Loop Boundary

```txt
next_loop_candidate=Loop 302: Friday demo rehearsal and final production smoke verification
loop_302_should_rerun_read_only_smoke=true
loop_302_should_validate_demo_runbook=true
loop_302_should_confirm_no_send_no_charge_demo_path=true
loop_302_should_finalize_friday_handoff=true
loop_302_should_restart_dr_restore=false
```
