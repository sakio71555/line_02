# Loop 191: Supabase Backup Method Selection

## Purpose

Select the safe first Supabase backup method before any production export, restore drill, scheduler, or backup automation is implemented.

This Loop is docs/test/read-only verification only. It does not call Supabase CLI/API, does not run database export, does not create backup archives, does not change runtime, and does not display or record secret values.

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

Loop 191 safety result:

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

Read-only VPS evidence collected during Loop 191:

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

The 504 results and timeout checks were recorded as read-only evidence only. This Loop does not remediate runtime, Nginx, DB, LINE, or OpenAI behavior.

## Scope

- Review existing backup, retention, production readiness, migration, and RLS docs.
- Compare Supabase backup method candidates without calling Supabase.
- Select the safest first method boundary.
- Define selection criteria.
- Define secret handling policy.
- Define restore drill policy.
- Define operator approval requirements.
- Define No-Go conditions.
- Update README, dev loop docs, P0 backlog, production readiness, backup runbooks, and dev log.
- Add static tests for docs coverage and secret-safe boundaries.

## Out of Scope

- Supabase CLI/API call.
- Database export.
- `pg_dump` execution.
- Backup archive creation.
- Restore execution.
- Supabase write, migration, RLS, or schema changes.
- `.env` display, copy, or edit.
- Secret value display or recording.
- cron or systemd timer creation.
- Runtime changes.
- Additional LINE send.
- OpenAI API call.
- Nginx reload/restart.
- DNS or certbot changes.

## Supabase Backup Method Candidates

| Candidate | Summary | Strengths | Risks / Requirements | Loop 191 decision |
| --- | --- | --- | --- | --- |
| A. Dashboard/manual backup | Operator uses Supabase dashboard or approved manual backup feature. | Lowest implementation risk; avoids CLI scripting first; operator can confirm plan/features. | Requires operator access, plan/feature confirmation, and a separate restore checklist. | Preferred first path if available. |
| B. CLI / database dump style export | Future command-driven export from an approved environment. | Automatable later; easier to schedule after rehearsal. | Higher credential exposure risk; must never print connection strings; requires explicit approval and non-production rehearsal first. | Future only. |
| C. Scheduled secure export | Automated job to encrypted storage with retention. | Best long-term operations posture. | Requires method A/B to be proven, encrypted storage, owner, retention, alerting, and restore drill. | Later automation. |
| D. Managed/provider backup feature | Provider-managed backup/restore feature. | Low operational burden if available. | Plan/features dependent; restore behavior must be verified in non-production first. | Candidate for operator review. |

## Selection Criteria

| Criterion | A. Dashboard/manual | B. CLI / dump style | C. Scheduled secure export | D. Managed/provider |
| --- | --- | --- | --- | --- |
| Secret exposure risk | Low when operator uses dashboard directly. | Medium/high unless command output is tightly controlled. | Medium until storage and logs are proven safe. | Low/medium depending on provider UI and restore process. |
| Restore confidence | Medium until restore drill is completed. | High after non-production restore drill. | High after repeated scheduled restore drill. | Medium/high after provider restore drill. |
| Automation readiness | Low. | Medium. | High. | Provider dependent. |
| Operational complexity | Low. | Medium. | High. | Low/medium. |
| Cost/plan dependency | Provider-plan dependent. | Lower direct plan dependency, but infrastructure dependent. | Storage and operations cost required. | Provider-plan dependent. |
| RLS/schema compatibility | Must validate after restore. | Must validate after restore. | Must validate after restore. | Must validate after restore. |
| Non-production rehearsal feasibility | Good if provider allows restore target. | Good with a test database target. | Requires storage and restore pipeline first. | Provider dependent. |
| Operator burden | Moderate manual step. | Higher during first setup. | Lower after setup, higher during design. | Lower if available. |
| Time to first safe backup | Fastest if dashboard/manual feature is available. | Medium. | Slowest. | Fast if plan supports it. |

## Recommended Path

```txt
backup method selected=operator_review_required
recommended_path=operator_confirmed_manual_or_managed_backup_first
future_automation_path=CLI_or_scheduled_export_after_explicit_approval
restore drill target=non_production_first
```

The first safe step is an operator-reviewed manual or managed backup path, followed by a non-production restore drill. Command-driven export and scheduled automation should wait until the operator confirms the backup feature, restore target, storage owner, and secret handling.

## Secret Handling Policy

- Database URL, service role key, anon key, endpoint value, project reference, and connection strings must not be printed or recorded.
- `.env` and runtime secret files must not be copied into the repository.
- Backup artifacts and raw dumps must not be committed.
- Raw dump contents must not be copied into docs, tests, logs, or final reports.
- Command logs must be sanitized before being recorded.
- Operator-injected values stay outside Git and outside docs.
- Allowed status phrase: `Supabase configured; values not recorded`.

## Schema / RLS / Migration Alignment

- Supabase backup and restore must preserve current migrations and tenant-scoped tables.
- Restored data must be validated against tenant isolation expectations.
- RLS behavior must be validated after restore, not assumed.
- Migration files in Git remain the source of schema intent.
- A restore target must be checked against current repository mappings before any production overwrite is considered.

## Restore Drill Policy

```txt
restore drill target=non_production_first
```

Minimum restore drill checks:

- Use non-production first.
- Do not overwrite production without explicit approval.
- Validate tenant-scoped data remains separated.
- Validate RLS policies after restore.
- Validate migration/schema consistency.
- Validate application boot against the restored database.
- Validate Admin API auth guard behavior.
- Validate LINE invalid-signature rejection.
- Record only sanitized status, not row contents or secret values.

## Operator Approval Requirements

Before any actual backup/export/restore automation:

- Operator confirms the selected backup method.
- Operator confirms whether dashboard/manual or managed backup is available.
- Operator confirms the non-production restore target.
- Operator confirms storage owner and retention owner.
- Operator confirms that command output will not expose secrets.
- Operator explicitly approves any future CLI/export/scheduled automation.
- Operator explicitly approves any production restore or overwrite.

## No-Go Conditions

- A command would display database credentials, service keys, endpoint values, connection strings, or `.env` contents.
- A backup artifact or raw dump would be committed.
- The restore target is production before a non-production drill succeeds.
- RLS validation is skipped.
- Tenant isolation validation is skipped.
- Storage owner, retention owner, or restore owner is unclear.
- Any Loop tries to mix backup execution with runtime, LINE, OpenAI, Nginx, DNS, certbot, migration, or RLS changes.

## Test Coverage

- Task doc and runbook exist.
- Candidate methods are documented.
- Selection criteria table is documented.
- Recommended path is documented.
- Production export is marked not performed.
- Supabase CLI/API is marked not called.
- DB export is marked not performed.
- Restore drill target is non-production first.
- Secret handling policy is documented.
- Future automation requires explicit approval.
- Production readiness remains Go.
- Runtime changes, LINE send, OpenAI API, Supabase write/migration/RLS, Nginx/DNS/certbot changes are marked not performed.
- Docs do not include obvious secret values or connection strings.

## Future Loop Split

```txt
Loop 192: Supabase manual backup operator checklist
Loop 193: Supabase non-production restore drill checklist
Loop 194: Supabase backup export dry-run with explicit approval
Loop 195: Supabase scheduled backup automation plan
```

Loop 192 remains docs/checklist only. It must not call Supabase CLI/API or export the database.
