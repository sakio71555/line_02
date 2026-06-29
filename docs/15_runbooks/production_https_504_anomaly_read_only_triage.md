# Production HTTPS 504 Anomaly Read-Only Triage

## 1. Purpose

Read-only triage for the production HTTPS Admin `504` observed during Loop 191.

This runbook records evidence only. It does not restart services, reload Nginx, change runtime flags, call external APIs, export data, or display secrets.

## 2. Trigger

Loop 191 recorded:

```txt
https_admin_root_loop191_supabase_backup_method=504
https_admin_customers_loop191_supabase_backup_method=504
vps_redacted_env_check_loop191=timeout_without_output
https_line_invalid_signature_loop191_supabase_backup_method=timeout_without_output
runtime_changes_performed=false
```

## 3. Read-Only Boundary

Allowed:

- Health checks with short timeout.
- `systemctl show` / `is-active`.
- Sanitized Nginx summary.
- Sanitized API/Admin journal summary.
- Resource summary.
- Existing monitoring dry-run.
- LINE invalid-signature rejection check.

Not allowed:

- Restart/reload.
- Config changes.
- Runtime changes.
- Additional LINE send.
- OpenAI API.
- Supabase CLI/API.
- DB export/write/migration/RLS.
- Backup creation/deletion.
- Secret display.

## 4. Health Matrix

```txt
vps_host=vm-227d8253-eb
api_service_active=true
admin_service_active=true
api_direct_8788_health_status=200
admin_direct_3000_status=000_connection_refused
admin_direct_3000_note=not_public_route_target
https_api_health_status=200
https_admin_root_status=200
https_admin_customers_status=200
https_admin_api_no_header_customers_status=401
https_line_invalid_signature_status=401
```

## 5. Systemd State Summary

```txt
api_active_state=active
api_sub_state=running
api_exec_main_status=0
admin_active_state=active
admin_sub_state=running
admin_exec_main_status=0
```

Runtime state:

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
openai_dropin=present
configured; value not recorded
```

## 6. Nginx Sanitized Summary

```txt
nginx_access_status_counts=200:348,301:44,302:10,304:8,400:11,404:246,405:1
nginx_error_recent_count=0
nginx_error_class_counts=none
```

No raw Nginx logs were copied into this runbook.

## 7. Journal Sanitized Summary

```txt
api_journal_interesting_count=0
api_journal_class_counts=none
admin_journal_interesting_count=0
admin_journal_class_counts=none
```

No raw journal lines were copied into this runbook.

## 8. Resource Summary

```txt
load_ok=true
memory_ok=true
disk_ok=true
api_process_present=true
admin_process_present=true
memory_used_percent=35
root_disk_used_percent=22
```

## 9. Monitoring Dry-Run Result

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

## 10. Decision

```txt
anomaly_status=resolved_or_transient
restart_required=false
next_loop_decision=Loop 193: Supabase manual backup operator checklist
```

Rationale:

- Public HTTPS Admin root returned `200`.
- Public HTTPS Admin customers returned `200`.
- HTTPS API health returned `200`.
- Admin API no-header guard returned `401`.
- Monitoring dry-run was healthy.
- Nginx error summary had no recent errors.
- API/Admin journal summaries had no interesting entries.
- Resources were healthy.

## 11. Safety Result

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

## 12. Next Loop

```txt
Loop 193: Supabase manual backup operator checklist
```
