# Supabase Backup Method Selection

## 1. Purpose

Choose the safest first Supabase backup path before production export, restore, or automation is implemented.

This runbook is a selection record and operator checklist. It does not authorize Supabase CLI/API calls, database export, backup artifact creation, restore execution, scheduler setup, runtime changes, or external service changes.

## 2. Current State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
Supabase configured; values not recorded
```

Loop 191 result:

```txt
selection_status=completed
backup method selected=operator_review_required
recommended_path=operator_confirmed_manual_or_managed_backup_first
future_automation_path=CLI_or_scheduled_export_after_explicit_approval
production_export_status=not_performed
DB export performed=false
Supabase CLI/API called=false
restore drill target=non_production_first
future_automation_requires_explicit_approval=true
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
supabase_write_migration_rls_performed=false
nginx_dns_certbot_changes=none
secrets_recorded=false
```

## 3. Read-Only Evidence

```txt
vps_host=vm-227d8253-eb
api_service_active=true
admin_service_active=true
api_direct_health_loop191_supabase_backup_method=200
https_api_health_loop191_supabase_backup_method=200
https_admin_root_loop191_supabase_backup_method=504
https_admin_customers_loop191_supabase_backup_method=504
https_admin_api_no_header_customers_loop191_supabase_backup_method=401
vps_redacted_env_check_loop191=timeout_without_output
https_line_invalid_signature_loop191_supabase_backup_method=timeout_without_output
```

The 504 and timeout results are not remediated by this runbook. They are recorded so the next operations review does not confuse backup method selection with Admin route availability.

## 4. Candidate Methods

| Candidate | Operator action | Automation level | First-use risk | Selection status |
| --- | --- | --- | --- | --- |
| Dashboard/manual backup | Operator confirms and performs through Supabase dashboard or approved provider UI. | Low. | Lowest implementation risk. | Preferred first review path. |
| Managed/provider backup | Operator confirms plan feature and restore target. | Low/medium. | Provider-plan dependent. | Candidate for operator review. |
| CLI / database dump style export | Operator approves command-driven export in a controlled environment. | Medium. | Credential/log exposure risk. | Future only. |
| Scheduled secure export | Operator approves encrypted storage, retention, and alerting. | High. | Highest setup complexity. | Later automation. |

## 5. Selection Criteria

| Criterion | Required decision |
| --- | --- |
| Secret exposure risk | Values must stay outside docs, Git, logs, and final reports. |
| Restore confidence | Non-production restore drill must pass before any production restore. |
| Automation readiness | Automation waits until manual/managed method and restore drill are proven. |
| Operational complexity | Start with the lowest operational complexity path. |
| Cost/plan dependency | Operator confirms provider plan availability before use. |
| RLS/schema compatibility | Validate tenant-scoped data, RLS, and migrations after restore. |
| Non-production rehearsal feasibility | Required before production restore or scheduled automation. |
| Operator burden | Prefer a path the operator can repeat safely and document clearly. |
| Time to first safe backup | Prefer operator-confirmed manual or managed backup first. |

## 6. Recommended Path

```txt
backup method selected=operator_review_required
recommended_path=operator_confirmed_manual_or_managed_backup_first
future_automation_path=CLI_or_scheduled_export_after_explicit_approval
restore drill target=non_production_first
```

Recommended sequence:

1. Operator confirms whether dashboard/manual or managed backup is available.
2. Operator performs or confirms the first backup through the selected safe path.
3. Record only sanitized status, never values or dump contents.
4. Run a non-production restore drill.
5. Validate tenant isolation, RLS, migrations, app boot, Admin auth guard, and LINE invalid-signature rejection.
6. Only after a successful restore drill, plan CLI/scheduled automation in a separate Loop.

## 7. Secret Handling Policy

Do not print, record, copy, or commit:

- Supabase endpoint value, project reference, DB URL, connection string, anon key, or service role key.
- `.env` contents or runtime secret file contents.
- Raw database dumps or backup archive contents.
- LINE webhook suffix, user identifiers, reply tokens, or message bodies.
- OpenAI key, model value, prompts, responses, or provider output.
- Authorization bearer tokens or private keys.

Allowed status phrases:

```txt
Supabase configured; values not recorded
secrets_recorded=false
```

## 8. Restore Drill Policy

```txt
restore drill target=non_production_first
```

Restore drill must verify:

- Tenant A data cannot leak into tenant B views.
- RLS policies behave as expected.
- Migration/schema state matches repository intent.
- Application boots against the restored database.
- Admin API auth guard still rejects unauthenticated access.
- LINE invalid-signature request is rejected.
- No production overwrite occurs.
- No secret or row content is recorded.

## 9. Operator Approval Checklist

Before any backup/export/restore action, confirm:

- Backup method selected by operator.
- Non-production restore target exists.
- Storage owner is known.
- Retention owner is known.
- Restore owner is known.
- Logs can be sanitized.
- CLI/export automation is separately approved if needed.
- Production restore/overwrite is separately approved if ever needed.

## 10. No-Go Conditions

- Any command would print credentials, endpoint values, connection strings, `.env` values, or raw dump contents.
- Backup artifact or dump would be committed to Git.
- Production restore is attempted before non-production drill.
- Tenant isolation or RLS validation is skipped.
- Backup, restore, runtime, LINE, OpenAI, Nginx, DNS, certbot, migration, or RLS work is mixed into one Loop.

## 11. Future Loops

```txt
Loop 192: Supabase manual backup operator checklist
Loop 193: Supabase non-production restore drill checklist
Loop 194: Supabase backup export dry-run with explicit approval
Loop 195: Supabase scheduled backup automation plan
```

Loop 192 is checklist-only and must not call Supabase CLI/API or export the database.
