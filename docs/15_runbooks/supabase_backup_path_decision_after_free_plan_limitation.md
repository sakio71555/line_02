# Supabase Backup Path Decision After Free Plan Limitation

Loop 195 decision runbook.

## 1. Purpose

Choose the next safe backup path after the operator observed that the current Supabase Free Plan does not provide the needed dashboard/manual/managed backup path.

This runbook records the decision only. It does not authorize a plan change, Supabase dashboard operation by Codex, Supabase CLI/API call, database export, restore, artifact handling, runtime change, LINE send, OpenAI call, Nginx/DNS/certbot operation, cron job, or systemd timer.

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

## 3. Free Plan Limitation

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

Backup success is not recorded. A visible restore option is not a backup result.

## 4. Decision

```txt
decision_status=recorded
backup path decision recorded
recommended_path=operator_decision_required_between_pro_upgrade_or_cli_dry_run
recommended_immediate_next=operator chooses backup path
backup_success_status=not_achieved
operator_decision_required=true
next_operator_choice=choose_pro_managed_backup_or_cli_dry_run_or_accept_defer_risk
```

The operator must choose one path before backup execution, restore drill planning, or automation continues.

## 5. Option A: Supabase Pro / Managed Backup

```txt
option_a_status=operator_plan_decision_required
```

Use this if the operator approves plan/billing changes and wants the first safe backup to stay provider-managed.

Advantages:

- Lower custom script risk.
- Reduced command-line credential handling.
- Easier operator process.
- Better first step toward restore drill confidence.

Risks:

- Billing/plan decision is outside Codex.
- Feature availability must be confirmed after the operator chooses the plan path.
- Restore drill is still mandatory before operational reliance.

## 6. Option B: CLI / Backup Dry-Run

```txt
option_b_status=explicit_approval_required
```

Use this only if the operator explicitly approves credential handling, storage policy, and a separate dry-run Loop.

Advantages:

- Does not depend on dashboard backup availability.
- Can become automatable later.
- Gives more control over storage and retention.

Risks:

- Higher credential exposure risk.
- Requires approved secure storage.
- Requires non-production restore drill.
- Must not be bundled into this Loop.

## 7. Option C: Defer DB Backup / Risk Acceptance

```txt
option_c_status=not_recommended_without_explicit_risk_acceptance
```

Use this only if the operator explicitly accepts the production backup gap.

Advantages:

- No immediate plan or credential operation.

Risks:

- Production database backup gap remains.
- Restore confidence remains low.
- Risk increases over time as production data changes.

## 8. Decision Matrix

| Criterion | Option A: Pro / managed | Option B: CLI / dry-run | Option C: defer |
| --- | --- | --- | --- |
| Secret exposure risk | Low. | Medium/high. | Low immediately. |
| Restore confidence | Requires restore drill. | Requires restore drill. | Low. |
| Implementation complexity | Low for Codex. | Medium/high. | Low. |
| Operator burden | Medium. | High. | Low now, higher later. |
| Cost/billing impact | Requires operator decision. | May avoid plan upgrade. | None now. |
| Time to first safe backup | Fast after approval. | Slower. | No backup achieved. |
| Automation readiness | Good after restore drill. | Good after dry-run and restore drill. | Not ready. |
| Production risk | Lower after confirmed backup. | Lower after confirmed backup and restore drill. | Highest. |
| Auditability | Strong with sanitized status. | Strong only with sanitized command output. | Weak unless explicit. |

## 9. Risk Matrix

| Risk | No-Go Trigger | Mitigation |
| --- | --- | --- |
| Backup success is assumed. | No verified backup exists. | Keep `backup_success_status=not_achieved`. |
| Secret values leak. | Values would appear in docs/chat/Git/output. | Stop and redesign the flow. |
| Plan upgrade is implicit. | Operator has not approved billing/plan change. | Keep Option A blocked. |
| CLI export is implicit. | Operator has not approved credential handling. | Keep Option B blocked. |
| Backup is deferred silently. | Operator has not accepted risk. | Keep Option C blocked. |
| Restore drill starts too early. | Backup success not recorded. | Keep restore drill as a later Loop. |

## 10. No-Go Conditions

- Operator cannot confirm the project safely.
- Operator does not approve billing or plan change.
- Operator does not approve CLI/database credential handling.
- No approved secure backup storage exists.
- No non-production restore drill path exists.
- Any secret value would need to be pasted into docs, chat, command output, or final report.
- A production incident is active.

## 11. Read-Only Safety Evidence

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

## 13. Next Operator Choice

The next operator response must choose one:

```txt
choose=Supabase Pro/managed backup confirmation
choose=CLI backup dry-run planning with explicit approval
choose=defer backup and accept risk explicitly
```

## 14. Next Loops

```txt
Loop 196: Operator selects Supabase backup path
Loop 196A: Supabase Pro/managed backup availability confirmation
Loop 196B: Supabase CLI backup dry-run planning with explicit approval
Loop 196C: Supabase backup deferred risk acceptance record
```

## 15. Loop 196 Operator Decision

The operator selected Option B as planning-only. This is not approval to execute commands or export data.

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

Next safe step:

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

## Loop 197 Supabase CLI Backup Dry-Run Design

The selected Option B planning-only path now has a secret-safe dry-run design. No execution happened.

```txt
design_status=complete
secret_handling_model_created=true
artifact_handling_model_created=true
approval_tokens_created=true
command_pack_principles_created=true
restore_verification_roadmap_created=true
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
restore performed=false
backup artifact created=false
runtime unchanged
production readiness: Go
```

Next optional backup step is Loop 198 command pack planning with placeholders only.
