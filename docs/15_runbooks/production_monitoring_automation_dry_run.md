# Production Monitoring Automation Dry-Run

## Purpose

Provide a repeatable read-only command for the current production monitoring checks.

This runbook does not authorize cron, systemd timer installation, notifications, runtime changes, LINE sends, OpenAI calls, Supabase writes, Nginx changes, DNS changes, or certbot execution.

## Command

Run on the active VPS source:

```bash
cd /var/www/amami-line-crm
npx pnpm@10.12.1 exec tsx scripts/monitoring/production-monitoring-dry-run.ts --dry-run
```

Optional:

```bash
npx pnpm@10.12.1 exec tsx scripts/monitoring/production-monitoring-dry-run.ts --dry-run --json
npx pnpm@10.12.1 exec tsx scripts/monitoring/production-monitoring-dry-run.ts --dry-run --since "60 minutes ago"
```

## Exit Status

| exit status | meaning |
| --- | --- |
| `0` | healthy |
| `1` | degraded |
| `2` | failed |

## Checks Included

- Local API health.
- HTTPS API health.
- Admin root.
- Admin customers route.
- Admin customers API without auth should return `401`.
- LINE webhook invalid-signature request should return `401`, `400`, or `403`.
- Runtime classifications:
  - `REPOSITORY_RUNTIME=supabase`
  - `LINE_REAL_PUSH_ENABLED=true`
  - `AI_PROVIDER=openai`
  - `OpenAI systemd drop-in=present`
- Sanitized API journal summary.
- Sanitized Admin journal summary.
- Sanitized Nginx summary.
- Load, memory, and disk summary.

## Loop 186 Result

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

## Safety Boundary

- Dry-run only.
- Read-only checks only.
- No cron installed.
- No systemd timer installed.
- No monitoring notification sent.
- No runtime changes performed.
- No additional LINE send performed.
- No OpenAI real API performed.
- No Supabase write, migration, or RLS change performed.
- No Nginx reload or restart performed.
- Secret values, webhook suffixes, LINE identifiers, message bodies, OpenAI model values, prompts, responses, Supabase endpoints, and DB URLs are not recorded.

## Deployment Notes

```txt
script_path=scripts/monitoring/production-monitoring-dry-run.ts
final_script_commit=cf9846b
archive_sha256=33084e123448e6c84f6fa138d467ae1c8a0a3cc700de0e6f2c002e3c43c323b0
vps_staging_validation=passed
active_deploy=completed
api_restart_performed=false
admin_restart_performed=false
nginx_reload_performed=false
runtime_changes_performed=false
timer_installed=false
notifications_sent=false
production_readiness=production_go
```

## Future Timer Loop

The dry-run command is ready for repeatable manual execution. Installing a cron job, systemd timer, or notification channel must be a separate approved Loop.

## Next Loop

```txt
Loop 187: OpenAI usage and cost monitoring plan
```
