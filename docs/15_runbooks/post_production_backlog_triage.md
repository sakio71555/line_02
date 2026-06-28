# Post-Production Backlog Triage

## Purpose

This runbook turns the post-production backlog into safe, small follow-up Loops after the line and OpenAI runtime closeout.

It is a planning and operations document only. It does not authorize runtime changes, LINE sends, OpenAI calls, Supabase schema/RLS changes, backup jobs, Nginx changes, DNS changes, or certbot execution.

## Current Production Baseline

```txt
production readiness: Go
activation_mode=line_and_openai_runtime
monitoring_status=healthy
rollback_recommended=false
handoff_complete=true
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

## Loop 185 Read-Only Evidence

```txt
api_direct_health_loop185_backlog_triage=200
https_api_health_loop185_backlog_triage=200
https_admin_root_loop185_backlog_triage=200
https_admin_customers_loop185_backlog_triage=200
https_admin_api_no_header_customers_loop185_backlog_triage=401
https_line_invalid_signature_loop185_backlog_triage=401
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI real API smoke=not performed
supabase_schema_rls_changes=none
nginx_dns_certbot_changes=none
secrets_recorded=false
```

## Priority Matrix

| Priority | Backlog item | Why now | Risk if delayed | Suggested next Loop |
| --- | --- | --- | --- | --- |
| P0 | 1. 運用監視の自動化 | The system is live and manual checks can be missed. | Incident detection may be late. | Loop 186: production monitoring automation dry-run |
| P0 | 2. OpenAI usage / cost monitoring | OpenAI runtime is enabled. | Cost, latency, or provider errors may drift unnoticed. | Loop 187: OpenAI usage and cost monitoring plan |
| P0 | 5. backup automation | Production data and deploy artifacts need recoverability. | Restore may be slow or unproven. | Loop 188: production backup automation plan |
| P1 | 3. authenticated staff route改善 | Staff actions should move toward authenticated production paths. | Internal CLI dependence and auth gaps remain. | Loop 188: authenticated staff reply route production auth remediation plan |
| P1 | 4. 管理画面の認証UX強化 | Operators need clear login, tenant, and permission feedback. | Misoperation and support burden can grow. | Loop 189: admin auth UX hardening plan |
| P1 | 6. audit log | Production actions need accountability. | Investigation and compliance become harder. | Loop 191: audit log design plan |
| P1 | 7. operator manual | Non-developer operators need a simple daily guide. | Operators may rely on developer runbooks. | Loop 192: operator manual first draft |
| P2 | 8. multi-tenant onboarding | Needed before adding companies beyond the initial tenant. | Expansion may create tenant/channel/knowledge confusion. | Loop 193: multi-tenant onboarding plan |

## Backlog Item Details

### 1. 運用監視の自動化

- Goal: Automate the existing daily health and safety checks.
- Current state: Daily/weekly schedule exists; automation is not implemented.
- Implementation boundary: dry-run first; no runtime changes, no outbound LINE, no OpenAI call.
- Validation: health status, Admin no-header `401`, invalid-signature rejection, sanitized journal/Nginx/resource summary.
- No-Go conditions: secret output, webhook suffix output, noisy false positives, or external calls beyond approved health checks.

### 2. OpenAI usage / cost monitoring

- Goal: Observe OpenAI usage, cost, error class, latency, and AI draft quality.
- Current status: planned.
- Implementation status: not implemented.
- API integration: separate future Loop.
- Current state: OpenAI runtime is enabled; usage/cost automation is not implemented.
- Implementation boundary: start with manual checklist and secret-safe dashboard review.
- Next safe implementation: manual threshold checklist or API dry-run planning.
- Validation: sanitized provider error summary and no prompt/response capture.
- No-Go conditions: key/model values, prompts, responses, or paid calls are recorded without approval.

### 3. authenticated staff route改善

- Goal: Use production authenticated staff context for staff actions.
- Current state: route requirements are known; auth must not be relaxed.
- Implementation boundary: plan before code; preserve production dev-header rejection.
- Validation: tenant boundary tests, permission tests, no-header rejection, no LINE send in tests.
- No-Go conditions: dev header accepted in production, tenant crossing, weak auth, or token logging.

### 4. 管理画面の認証UX強化

- Goal: Make login, selected tenant, role, permission state, and session expiry obvious to operators.
- Current state: placeholder pages exist; production UX hardening remains.
- Implementation boundary: UI plan first; do not change API/auth runtime in the same Loop.
- Validation: UI static tests, mobile checks, no token display.
- No-Go conditions: token exposure, unclear permission state, or unsafe send affordance.

### 5. backup automation

- Goal: Make Supabase data, deploy artifacts, and operational docs recoverable.
- Current state: GitHub and deploy backup history exist; automated DB backup/restore drill is not finalized.
- Implementation boundary: plan retention and restore before creating jobs.
- Validation: non-production restore rehearsal and secret-safe backup logs.
- No-Go conditions: DB URL/key output, unbounded retention, or untested restore.

### 6. audit log

- Goal: Track staff actions, AI actions, permission denials, tenant changes, sends, and rollback actions.
- Current state: explicit audit log table/flow is not implemented.
- Implementation boundary: schema plan before migration; do not store message bodies or identifiers by default.
- Validation: tenant-scoped audit query tests and sensitive field exclusion tests.
- No-Go conditions: body capture, identifier capture, secret capture, or cross-tenant reads.

### 7. operator manual

- Goal: Provide a beginner-friendly manual for daily operations.
- Current state: technical runbooks exist; a concise operator manual is still needed.
- Implementation boundary: docs-only first draft.
- Validation: operator walkthrough and no secret/customer data review.
- No-Go conditions: unsafe command instructions, unclear rollback request path, or AI auto-send implication.

### 8. multi-tenant onboarding

- Goal: Prepare safe onboarding for future tenants.
- Current state: tenant isolation exists; production begins with one tenant.
- Implementation boundary: checklist and fake-tenant dry-run before real onboarding.
- Validation: tenant isolation tests, separate LINE channel policy, knowledge separation checks.
- No-Go conditions: shared LINE channel confusion, staff membership mistakes, knowledge mixing, or manual DB edits without review.

## Recommended Sequence

1. Loop 186: production monitoring automation dry-run.
2. Loop 187: OpenAI usage and cost monitoring plan.
3. Loop 188: production backup automation plan.
4. Loop 189: backup inventory dry-run script.
5. Loop 190: VPS deploy backup retention dry-run.
6. Loop 191: audit log design plan.
7. Loop 192: operator manual first draft.
8. Loop 193: multi-tenant onboarding plan.

## Shared Safety Rules

- Keep every item in a separate small Loop.
- Keep production readiness Go unless a future incident or approved rollback changes it.
- Do not display env values or secret files.
- Do not record webhook suffixes, LINE identifiers, reply tokens, message bodies, OpenAI model values, prompts, responses, Supabase endpoints, or DB URLs.
- Do not send additional LINE messages during planning Loops.
- Do not call OpenAI during planning Loops.
- Do not change Nginx, DNS, certbot, Supabase schema/RLS, or runtime flags during planning Loops.

## Next Loop

```txt
Loop 187: OpenAI usage and cost monitoring plan
```

## Loop 186 Result

The P0 monitoring automation dry-run was completed.

```txt
production_monitoring_dry_run=healthy
exit_status=0
script_path=scripts/monitoring/production-monitoring-dry-run.ts
timer_installed=false
notifications_sent=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI real API smoke=not performed
production readiness: Go
secrets_recorded=false
```

Monitoring scheduling and notification delivery remain unimplemented and require a separate approved Loop.

## Loop 187 Result

The P0 OpenAI usage / cost monitoring plan was completed.

```txt
planning_status=complete
OpenAI usage API not called
OpenAI cost API not called
OpenAI real API not called
cost_threshold_values=operator_defined
currency=operator_defined
runtime_changes_performed=false
additional_line_send_performed=false
production readiness: Go
```

API-based usage/cost collection remains unimplemented and requires a separate explicit approval Loop.

## Loop 188 Result

The P0 production backup automation plan was completed without creating backup jobs or exporting data.

```txt
planning_status=complete
backup_job_created=false
DB export performed=false
cron/systemd timer created=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Supabase export performed=false
production readiness: Go
```

Backup implementation remains unperformed. The next safe step is an inventory-only dry-run script with counts, sizes, and paths only.

## Loop 189 Result

Loop 189 adds the backup inventory dry-run script. The script is read-only and records backup target presence, counts, and path existence without creating backups or exporting data.

```txt
backup inventory dry-run=done
script_path=scripts/backup/backup-inventory-dry-run.ts
vps_dry_run_performed=true
backup_inventory_dry_run=completed
backup_job_created=false
db_export_performed=false
secret_file_copied=false
env_values_displayed=false
timer_created=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Supabase export performed=false
production readiness: Go
```

Remaining P0 implementation is limited to optional timer/notification install, optional backup creation dry-run, and optional Supabase backup method selection.

Next explicit candidate:

```txt
Loop 190: backup retention dry-run proposal
```

## Loop 190 Result

Loop 190 adds and executes the backup retention dry-run proposal. The script is read-only and classifies deploy backup artifacts into keep/review buckets without deleting anything.

```txt
backup retention dry-run=done
script_path=scripts/backup/backup-retention-dry-run.ts
vps_retention_dry_run_performed=true
backup_retention_dry_run=completed
backup_dir_exists=true
backup_artifact_count=24
keep_latest_policy=5
keep_count=5
review_count=19
delete_candidate_count=0
delete_performed=false
retention_enforced=false
backup_job_created=false
db_export_performed=false
secret_file_copied=false
env_values_displayed=false
timer_created=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Supabase export performed=false
production readiness: Go
```

Remaining P0 implementation moves to Supabase backup method selection, optional backup creation dry-run, optional restore drill in non-production, and optional timer/notification install.

Next explicit candidate:

```txt
Loop 191: Supabase backup method selection
```
