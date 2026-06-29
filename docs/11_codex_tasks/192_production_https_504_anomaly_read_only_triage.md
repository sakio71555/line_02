# Loop 192: Production HTTPS 504 Anomaly Read-Only Triage

## Purpose

Triage the production HTTPS Admin `504` anomaly recorded in Loop 191 without changing runtime, restarting services, reloading Nginx, or touching external providers.

This Loop is read-only diagnosis, docs, tests, dev log, commit, and push only.

## Observed Risk From Loop 191

Loop 191 selected the Supabase backup method boundary, but recorded a follow-up risk:

```txt
https_admin_root_loop191_supabase_backup_method=504
https_admin_customers_loop191_supabase_backup_method=504
vps_redacted_env_check_loop191=timeout_without_output
https_line_invalid_signature_loop191_supabase_backup_method=timeout_without_output
runtime_changes_performed=false
```

## Scope

- Re-check API direct health.
- Re-check HTTPS API health.
- Re-check HTTPS Admin root and customers.
- Re-check Admin API no-header guard.
- Inspect API/Admin systemd state read-only.
- Inspect Nginx access/error logs as sanitized summary only.
- Inspect API/Admin journals as sanitized summary only.
- Inspect resource state.
- Run the existing monitoring dry-run script.
- Re-check LINE invalid-signature rejection with timeout.
- Record the decision for the next Loop.

## Out of Scope

- API service restart.
- Admin service restart.
- Nginx reload/restart.
- Nginx config changes.
- DNS or certbot changes.
- Runtime flag changes.
- OpenAI drop-in changes.
- Additional LINE send.
- OpenAI API call.
- Supabase CLI/API call.
- Database export.
- Database write, migration, RLS, or schema changes.
- Backup creation or deletion.
- cron/systemd timer creation.
- `.env` display or modification.
- Secret file display.

## Read-Only Result

```txt
anomaly_status=resolved_or_transient
restart_required=false
next_loop_decision=Loop 193: Supabase manual backup operator checklist
restart_performed=false
runtime_changes_performed=false
Nginx/DNS/certbot changes=false
LINE send=false
OpenAI API=false
Supabase write/export=false
secrets_recorded=false
```

## Health Matrix

```txt
vps_host=vm-227d8253-eb
api_service_active=true
admin_service_active=true
api_direct_8788_health_status=200
api_direct_8788_time_seconds=0.005241
admin_direct_3000_status=000_connection_refused
admin_direct_3000_note=not_public_route_target
https_api_health_status=200
https_api_health_time_seconds=0.044910
https_admin_root_status=200
https_admin_root_time_seconds=0.060383
https_admin_customers_status=200
https_admin_customers_time_seconds=1.214054
https_admin_api_no_header_customers_status=401
https_admin_api_no_header_customers_time_seconds=0.050726
https_line_invalid_signature_status=401
https_line_invalid_signature_time_seconds=0.027863
```

Interpretation:

- The Loop 191 public Admin `504` was not reproduced.
- HTTPS Admin root and customers are healthy through the public route.
- Admin API no-header rejection remains `401`.
- LINE invalid-signature rejection remains `401`.
- Direct port `3000` is not serving the current public Admin route and returned connection refused; this does not affect the public HTTPS Admin route.

## Systemd State Summary

```txt
api_service_active=true
api_active_state=active
api_sub_state=running
api_exec_main_status=0
admin_service_active=true
admin_active_state=active
admin_sub_state=running
admin_exec_main_status=0
```

Runtime state summary:

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
openai_dropin=present
configured; value not recorded
```

## Nginx Sanitized Summary

```txt
nginx_access_status_counts=200:348,301:44,302:10,304:8,400:11,404:246,405:1
nginx_access_path_status_counts=/:200:45,/:301:12,/:302:4,/:400:8,/:404:3,/:405:1,other:200:303,other:301:32,other:302:6,other:304:8,other:400:3,other:404:243
nginx_error_recent_count=0
nginx_error_class_counts=none
```

No raw Nginx log lines, webhook suffixes, LINE identifiers, OpenAI values, Supabase values, bearer tokens, private keys, or `.env` values were recorded.

## Journal Sanitized Summary

```txt
api_journal_interesting_count=0
api_journal_class_counts=none
admin_journal_interesting_count=0
admin_journal_class_counts=none
```

Only aggregate counts were recorded. Raw journal lines were not copied into docs.

## Resource Summary

```txt
load_ok=true
load_average_1m=0.00
load_average_5m=1.80
load_average_15m=2.68
memory_ok=true
memory_used_percent=35
disk_ok=true
root_disk_used_percent=22
api_process_present=true
admin_process_present=true
```

## Monitoring Dry-Run Result

```txt
production_monitoring_dry_run=healthy
exit_status=0
api_health=200
https_api_health=200
admin_root=200
admin_customers=200
admin_api_no_header_customers=401
line_invalid_signature=401
runtime_repository=supabase
runtime_line_real_push_enabled=true
runtime_ai_provider=openai
openai_dropin=present
critical_errors_detected=false
secrets_recorded=false
```

## Decision Logic

Case A applies:

```txt
Admin root/customers now 200 and logs/resources healthy
anomaly_status=resolved_or_transient
restart_required=false
next_loop_decision=Loop 193: Supabase manual backup operator checklist
```

## Safety Boundary

```txt
restart_performed=false
runtime_changes_performed=false
Nginx/DNS/certbot changes=false
LINE send=false
OpenAI API=false
Supabase write/export=false
backup_created=false
backup_deleted=false
timer_created=false
secrets_recorded=false
```

## Test Coverage

- Loop 192 task doc exists.
- Loop 192 runbook exists.
- Read-only only is recorded.
- Health matrix is recorded.
- Nginx sanitized summary is recorded.
- Journal sanitized summary is recorded.
- Restart/runtime/external-change false flags are recorded.
- `anomaly_status` and `next_loop_decision` are recorded.
- Docs do not include obvious secret values.

## Next Loop

```txt
Loop 193: Supabase manual backup operator checklist
```
