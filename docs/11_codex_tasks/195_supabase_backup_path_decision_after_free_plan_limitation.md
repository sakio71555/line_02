# Loop 195: Supabase Backup Path Decision After Free Plan Limitation

## Purpose

Decide the next safe Supabase backup path after the operator observed that the current Free Plan does not provide the needed dashboard/manual/managed backup path.

This Loop is a decision record only. It does not perform a Supabase plan change, dashboard operation, Supabase CLI/API call, database export, restore, backup artifact handling, runtime change, LINE send, OpenAI call, Nginx change, DNS change, certbot operation, cron setup, or systemd timer setup.

## Scope

- Record the Free Plan limitation context.
- Compare backup path options.
- Record a decision matrix and risk matrix.
- Record the recommended next operator decision.
- Keep the next Loop small and explicit.
- Update Obsidian-readable Markdown logs and tests.
- Keep production state and runtime unchanged.

## Out Of Scope

- Supabase plan change.
- Supabase dashboard operation by Codex.
- Supabase CLI/API call.
- Database export or restore.
- Backup artifact download, upload, archive creation, deletion, or inspection.
- Runtime/API/UI/DB migration/RLS changes.
- Additional LINE send.
- OpenAI API call.
- Nginx reload/restart/config change.
- DNS or certbot operation.
- Cron or systemd timer creation.
- `.env` display or modification.
- Secret file display, copy, or recording.

## Current Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
Supabase configured; values not recorded
```

## Free Plan Limitation Context

```txt
Free Plan limitation observed
backup_availability_checked=true
manual_backup_available=false
managed_backup_available=false
backup_status=not_performed
backup_success_status=not_achieved
backup_artifact_downloaded=false
backup_artifact_committed_to_repo=false
restore_performed=false
secrets_recorded=false
```

The visibility of retention or restore UI does not mean a backup exists or that restore was performed.

## Decision Summary

```txt
decision_status=recorded
backup path decision recorded
recommended_path=operator_decision_required_between_pro_upgrade_or_cli_dry_run
recommended_immediate_next=operator chooses backup path
backup_success_status=not_achieved
operator_decision_required=true
next_operator_choice=choose_pro_managed_backup_or_cli_dry_run_or_accept_defer_risk
```

The recommendation is not an automatic plan upgrade and not an automatic command-line export. The operator must choose one of the paths below before backup execution, restore drill, or automation continues.

## Option A: Supabase Pro / Managed Backup

```txt
option_a_status=operator_plan_decision_required
```

Pros:

- Lower custom script risk.
- Provider-managed dashboard path is easier for operators to repeat.
- Less chance of printing command-line credentials.
- Better first path before restore drill planning.

Cons:

- Billing and plan decision is outside Codex.
- Operator must explicitly approve any plan change.
- Restore drill is still required before relying on it operationally.
- Plan feature availability still needs confirmation after upgrade.

## Option B: CLI / Backup Dry-Run Path

```txt
option_b_status=explicit_approval_required
```

Pros:

- Can work without a dashboard backup feature.
- Can become automatable after a successful dry-run and restore drill.
- Gives more control over retention and storage later.

Cons:

- Higher secret exposure risk.
- Requires careful handling of database credentials.
- Requires approved secure storage before any artifact is created.
- Requires non-production restore drill before it can be trusted.
- Must be a separate explicitly approved Loop.

## Option C: Defer DB Backup / Risk Acceptance

```txt
option_c_status=not_recommended_without_explicit_risk_acceptance
```

Pros:

- No immediate billing or operational change.
- No command-line credential handling.

Cons:

- Production backup gap remains.
- Restore confidence remains low.
- Operational risk increases as production data changes.
- Must be explicitly accepted by the operator if chosen.

## Decision Matrix

| Criterion | Option A: Pro / managed | Option B: CLI / dry-run | Option C: defer |
| --- | --- | --- | --- |
| Secret exposure risk | Low if dashboard flow stays sanitized. | Medium/high unless strictly controlled. | Low immediately. |
| Restore confidence | Medium after backup exists; high only after restore drill. | Medium after export dry-run; high only after restore drill. | Low. |
| Implementation complexity | Low for Codex, operator plan decision required. | Medium/high and requires separate approval. | Low. |
| Operator burden | Medium: plan confirmation and dashboard flow. | High: credential, storage, and restore workflow. | Low now, higher later. |
| Cost/billing impact | Requires operator billing decision. | May avoid plan upgrade but increases operational work. | No immediate cost. |
| Time to first safe backup | Potentially fastest after operator approval. | Slower because dry-run and storage policy are needed. | No backup achieved. |
| Automation readiness | Good after managed backup and restore drill. | Good after safe export and restore drill. | Not ready. |
| Production risk | Lower once backup is confirmed. | Lower only after successful dry-run and restore drill. | Highest. |
| Auditability | Strong if operator records sanitized status. | Strong if command output is sanitized and artifacts stay out of repo. | Weak unless risk acceptance is explicit. |

## Risk Matrix

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Backup success is assumed without an actual backup. | High. | Keep `backup_success_status=not_achieved` until verified. |
| Secret values enter docs, logs, chat, or Git. | High. | Record only allowed status phrases and run secret scan before commit. |
| CLI export is attempted without approval. | High. | Keep Option B as `explicit_approval_required`. |
| Plan upgrade is treated as automatic. | Medium. | Keep Option A as `operator_plan_decision_required`. |
| Backup is deferred without awareness. | High. | Require explicit risk acceptance for Option C. |
| Restore drill starts before backup success. | High. | Keep restore planning blocked until a successful backup path/result exists. |

## No-Go Conditions

- Operator cannot confirm the Supabase project safely.
- Operator does not approve billing or plan change.
- Operator does not approve CLI/database credential handling.
- No approved secure backup storage exists.
- No non-production restore drill path exists.
- Any secret value would need to be pasted into docs, chat, command output, or final report.
- A production incident is active.

## Safety Evidence

Read-only production checks after the decision:

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

- Loop 195 task doc exists.
- Backup path decision runbook exists.
- Free Plan limitation is recorded.
- Option A/B/C statuses are recorded.
- Decision matrix and risk matrix are recorded.
- Recommended path is operator decision required between Pro/managed backup or CLI dry-run.
- Backup success remains not achieved.
- Supabase CLI/API, DB export, restore, runtime changes, LINE send, OpenAI API, and Nginx/DNS/certbot changes are recorded as not performed.
- Obsidian links include Loop 195.
- Secret-like values are not recorded.

## Next Loop

```txt
Loop 196: Operator selects Supabase backup path
Loop 196A: Supabase Pro/managed backup availability confirmation
Loop 196B: Supabase CLI backup dry-run planning with explicit approval
Loop 196C: Supabase backup deferred risk acceptance record
```
