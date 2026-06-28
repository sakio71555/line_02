# Production Monitoring Schedule

## Purpose

Define lightweight monitoring after line-only production activation.

This schedule is operational guidance. It does not authorize runtime changes, LINE sends, OpenAI runtime activation, Supabase writes, Nginx changes, DNS changes, or certbot execution.

## Daily

1. Confirm API direct health returns `200`.
2. Confirm HTTPS API health returns `200`.
3. Confirm Admin root or customers route returns `200`.
4. Confirm Admin API no-header customers returns `401`.
5. Confirm LINE invalid-signature request returns `401`, `400`, or `403`.
6. Review sanitized API journal classification.
7. Review sanitized OpenAI error summary.
8. Review sanitized LINE send/webhook error summary.
9. Review sanitized Nginx error summary.
10. Check disk, memory, and load.
11. Confirm AI output is not automatically sent to LINE.
12. Record only sanitized results.

## Weekly

1. Review OpenAI usage and cost dashboard without recording values.
2. Review Supabase usage and quota dashboards without recording endpoints or keys.
3. Review LINE delivery/error dashboard without recording user identifiers or message bodies.
4. Review dependency update candidates.
5. Review backup status and restore path.
6. Confirm operation runbooks still match the deployed runtime.
7. Confirm rollback owner availability.
8. Review future backlog and split work into small Loops.

## After Any Incident

1. Preserve a sanitized timeline.
2. Record timestamps, status classes, and affected areas.
3. Do not record secret values, webhook suffixes, identifiers, tokens, or message bodies.
4. Choose one rollback target: LINE only, OpenAI only, or safe mode.
5. If rollback is needed, use a separate explicit approval Loop.
6. After stabilization, update the dev log and related runbook.
7. Do not combine diagnosis, rollback, OpenAI activation, Supabase changes, and Nginx changes in one Loop.

## Current Runtime Assumption

```txt
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
activation_mode=line_and_openai_runtime
monitoring_status=healthy
```

## OpenAI Runtime Monitoring

After Loop 182, daily checks should also include:

1. Review sanitized OpenAI error classification.
2. Review OpenAI usage and cost without recording values.
3. Watch provider latency and timeout trend.
4. Review AI draft quality with staff.
5. Confirm AI output is not automatically sent to LINE.
6. Confirm logs do not contain prompts, responses, API keys, model values, LINE identifiers, or message bodies.

## Loop 183 Follow-up

Loop 183 completed read-only first-hour monitoring for the OpenAI runtime state.

```txt
monitoring_status=healthy
rollback_recommended=false
critical_errors_detected=false
openai_runtime_errors_detected=false
line_send_errors_detected=false
webhook_errors_detected=false
supabase_errors_detected=false
runtime_changes_performed=false
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

Continue normal monitoring. Any rollback, additional LINE send, OpenAI smoke, Nginx/DNS/certbot change, or Supabase schema/RLS change must be a separate approved Loop.

## Loop 184 Closeout Follow-up

Loop 184 completed the production stabilization closeout with OpenAI runtime enabled.

```txt
closeout_status=complete
production_readiness_status=go
activation_mode=line_and_openai_runtime
monitoring_status=healthy
rollback_recommended=false
handoff_complete=true
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI real API smoke=not performed
```

## Loop 185 Monitoring Automation Backlog

Loop 185 classified production monitoring automation as P0.

Next monitoring Loop:

```txt
Loop 186: production monitoring automation dry-run
```

The dry-run must keep these boundaries:

- No runtime change.
- No additional LINE send.
- No OpenAI API call.
- No Nginx/DNS/certbot change.
- No Supabase schema/RLS change.
- No secret, webhook suffix, LINE identifier, message body, OpenAI response, Supabase endpoint, or DB URL output.

## Loop 186 Automation Dry-Run

Loop 186 added a repeatable monitoring dry-run command:

```bash
npx pnpm@10.12.1 exec tsx scripts/monitoring/production-monitoring-dry-run.ts --dry-run
```

Final VPS dry-run result:

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

No cron job, systemd timer, monitoring notification, runtime change, additional LINE send, OpenAI real API call, Nginx reload/restart, or Supabase schema/RLS change was performed. Timer or notification installation must be a separate approved Loop.

## Loop 187 OpenAI Usage and Cost Monitoring Plan

Loop 187 adds the OpenAI usage and cost monitoring plan without calling OpenAI APIs.

Daily/weekly operator checks should include:

1. Review OpenAI dashboard manually.
2. Record only summarized usage/cost status.
3. Compare with `cost_threshold_values=operator_defined` and `currency=operator_defined`.
4. Check sanitized provider error, latency, and malformed output status.
5. If warning or critical, open a separate rollback/mitigation decision Loop.

```txt
OpenAI usage API not called
OpenAI cost API not called
OpenAI real API not called
runtime_changes_performed=false
additional_line_send_performed=false
production readiness: Go
```

Future usage/cost API integration requires a separate explicit approval Loop and must summarize only aggregate status.

## Loop 188 Backup Automation Plan

Loop 188 adds the production backup automation plan without creating backups or jobs.

Weekly operations should now also include:

1. Confirm backup inventory status is reviewed without opening secret files.
2. Confirm VPS deploy backups are not growing without review.
3. Confirm Supabase backup method and retention remain operator-defined until approved.
4. Confirm restore drill remains planned for non-production first.

```txt
backup_job_created=false
DB export performed=false
cron/systemd timer created=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Supabase export performed=false
production readiness: Go
```

The next safe step is an inventory-only dry-run script. It must not create backups, delete backups, copy secret files, export databases, install timers, or change runtime.
