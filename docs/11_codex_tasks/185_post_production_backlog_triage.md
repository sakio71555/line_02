# Loop 185: Post-Production Backlog Triage

## Purpose

Loop 185 triages the post-production backlog after the line and OpenAI runtime closeout.

This is a docs, roadmap, runbook, and static-test Loop only. It does not implement monitoring jobs, authentication changes, backup automation, audit logging, UI changes, runtime changes, database changes, or external API calls.

## Current Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
monitoring_status=healthy
rollback_recommended=false
handoff_complete=true
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

## Read-Only Verification

```txt
api_direct_health_loop185_backlog_triage=200
https_api_health_loop185_backlog_triage=200
https_admin_root_loop185_backlog_triage=200
https_admin_customers_loop185_backlog_triage=200
https_admin_api_no_header_customers_loop185_backlog_triage=401
https_line_invalid_signature_loop185_backlog_triage=401
```

Runtime classification was confirmed with secret-safe checks. Secret values, webhook suffixes, LINE identifiers, message bodies, OpenAI key/model values, OpenAI responses, Supabase endpoints, and DB URLs were not recorded.

## Scope

- Review the current production closeout state.
- Confirm production health with read-only VPS checks.
- Triage the eight post-production backlog areas.
- Assign P0/P1/P2 priority.
- Define implementation boundaries, validation commands, and No-Go conditions.
- Update runbooks and dev log.
- Add static integration tests.

## Out of Scope

- Runtime changes.
- API implementation changes.
- UI implementation changes.
- DB migration or Supabase schema changes.
- RLS changes.
- Backup job, cron, or systemd timer creation.
- Nginx config changes, reload, or restart.
- DNS or certbot changes.
- Additional LINE send.
- OpenAI real API smoke.
- `.env` or secret file display/change.
- Production readiness change.

## Backlog Items

### 1. 運用監視の自動化

- Priority: P0
- Purpose: Move daily manual checks toward safe automated monitoring.
- Current state: Daily/weekly monitoring runbooks exist and first-hour monitoring was healthy.
- Risk: Manual checks can be missed, and failures may be detected late.
- Candidate implementation: systemd timer or cron dry-run that checks API/Admin health, invalid-signature rejection, sanitized journal counts, Nginx error count, disk, memory, and load.
- Validation: local static tests, dry-run script output, API health, Admin no-header rejection, invalid-signature rejection.
- No-Go: script prints secrets, records webhook suffixes, sends LINE messages, calls OpenAI, changes runtime, or creates noisy alerts.
- Suggested next Loop: Loop 186: production monitoring automation dry-run.

### 2. OpenAI usage / cost monitoring

- Priority: P0
- Purpose: Track usage, cost, provider errors, latency, and output quality after OpenAI runtime activation.
- Current state: `AI_PROVIDER=openai` and first-hour monitoring are healthy; usage/cost automation is not implemented.
- Risk: Cost growth, provider errors, or latency drift may go unnoticed.
- Candidate implementation: manual dashboard checklist first, then secret-safe usage/cost collection if approved.
- Validation: no real API call unless explicitly approved, sanitized error summary, no prompt/response logging.
- No-Go: OpenAI key/model values are recorded, response bodies are captured, or paid calls run without approval.
- Suggested next Loop: Loop 187: OpenAI usage and cost monitoring plan.

### 3. authenticated staff route改善

- Priority: P1
- Purpose: Make staff reply and staff operations safe through authenticated staff context instead of internal CLI dependence.
- Current state: Earlier authenticated staff route checks were unavailable; auth must not be relaxed.
- Risk: Weakening auth could create tenant leakage or accidental sends.
- Candidate implementation: Bearer session transport, selected tenant validation, staff membership lookup, `send_staff_reply` permission enforcement, production dev-header rejection.
- Validation: authenticated route tests, tenant-crossing denial, permission denial, no-header rejection, no LINE send in tests.
- No-Go: dev header is accepted in production, route permits tenant crossing, auth is relaxed, or tokens are logged.
- Suggested next Loop: Loop 188: authenticated staff reply route production auth remediation plan.

### 4. 管理画面の認証UX強化

- Priority: P1
- Purpose: Help operators understand login, tenant selection, session status, and permission boundaries.
- Current state: login/select tenant/permission denied/session expired UI exists; production staff action UX still needs hardening.
- Risk: Operators may misread session state, tenant scope, or permission errors.
- Candidate implementation: session status display, selected tenant display, role/permission hints, safe permission-denied reasons, re-login path.
- Validation: UI static tests, auth helper tests, no token display, mobile readability checks.
- No-Go: UI displays token values, encourages tenant guessing, hides permission failures, or enables unsafe sends.
- Suggested next Loop: Loop 189: admin auth UX hardening plan.

### 5. backup automation

- Priority: P0
- Purpose: Improve recovery for Supabase data, deployment artifacts, and operational docs.
- Current state: GitHub push and VPS deploy backups exist; Supabase backup automation and restore drills are not fully planned.
- Risk: Data can be harder to restore after operator mistakes, infrastructure issues, or bad deploys.
- Candidate implementation: backup policy, retention, restore drill, verification checklist, offsite storage decision.
- Validation: backup dry-run, restore rehearsal in non-production, retention evidence, secret-safe logs.
- No-Go: backup script records DB URLs or keys, restore is untested, retention is unbounded, or production DB is modified during planning.
- Suggested next Loop: Loop 190: production backup automation plan.

### 6. audit log

- Priority: P1
- Purpose: Track who did what, when, and against which tenant/customer without over-recording sensitive content.
- Current state: customers/messages exist; dedicated audit log is not implemented.
- Risk: Staff actions, sends, AI draft generation, permission denials, and rollbacks may be hard to investigate.
- Candidate implementation: audit event schema plan, safe payload policy, retention, tenant-scoped query rules.
- Validation: schema static tests in a later Loop, tenant isolation tests, no body/user identifier capture.
- No-Go: audit log stores message bodies, LINE identifiers, reply tokens, secrets, or cross-tenant data.
- Suggested next Loop: Loop 191: audit log design plan.

### 7. operator manual

- Priority: P1
- Purpose: Give non-developer operators a simple daily-use manual.
- Current state: technical runbooks exist; a beginner-friendly one-page operator manual is not complete.
- Risk: Operators may miss checks, misunderstand AI drafts, or send replies without the right review.
- Candidate implementation: first-draft manual covering daily checks, LINE handling, AI draft review, send-before-check, incident contact, rollback request, and prohibited actions.
- Validation: docs review, operator walkthrough, no secrets or customer data.
- No-Go: manual includes technical secrets, asks operators to run unsafe commands, or implies AI auto-send.
- Suggested next Loop: Loop 192: operator manual first draft.

### 8. multi-tenant onboarding

- Priority: P2
- Purpose: Prepare for adding tenants beyond the first company without breaking tenant isolation.
- Current state: tenant guards and selected-tenant concepts exist; production starts with one tenant.
- Risk: tenant leakage, LINE channel mix-ups, staff membership mistakes, or knowledge base contamination.
- Candidate implementation: tenant creation checklist, LINE channel-per-tenant policy, staff membership setup, knowledge seed process, billing/support checklist.
- Validation: tenant isolation tests, onboarding dry-run with fake tenant, no real customer data.
- No-Go: onboarding requires manual DB edits without review, shares LINE channel unexpectedly, or mixes tenant knowledge.
- Suggested next Loop: Loop 193: multi-tenant onboarding plan.

## Priority Matrix

| Priority | Items | Why now | Risk if delayed |
| --- | --- | --- | --- |
| P0 | 1. 運用監視の自動化; 2. OpenAI usage / cost monitoring; 5. backup automation | Protect the live line and OpenAI runtime from missed incidents, cost drift, and unrecoverable data loss. | Failures, cost spikes, or recovery gaps may be noticed too late. |
| P1 | 3. authenticated staff route改善; 4. 管理画面の認証UX強化; 6. audit log; 7. operator manual | Improve safe daily operations and accountability after production Go. | Staff actions remain harder to operate, explain, and audit. |
| P2 | 8. multi-tenant onboarding | Needed before broader rollout, but less urgent than production operations safety. | Expansion could be delayed or risky without a checklist. |

## Shared Implementation Boundary

- Keep every item as a separate small Loop.
- Keep production runtime unchanged unless a future Loop explicitly approves a runtime change.
- Do not combine monitoring automation, auth remediation, backup implementation, audit schema, UI hardening, and multi-tenant onboarding in one Loop.
- Do not record secret values, webhook suffixes, LINE identifiers, message bodies, OpenAI model values, provider responses, Supabase endpoints, or DB URLs.

## Shared Validation Commands

```bash
git diff --check
npx pnpm@10.12.1 lint
npx pnpm@10.12.1 typecheck
npx pnpm@10.12.1 test
npx pnpm@10.12.1 test:integration
npx pnpm@10.12.1 build
```

## Loop 185 Safety Result

```txt
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI real API smoke=not performed
supabase_schema_rls_changes=none
nginx_dns_certbot_changes=none
secrets_recorded=false
```

## Next Loop

```txt
Loop 186: production monitoring automation dry-run
```
