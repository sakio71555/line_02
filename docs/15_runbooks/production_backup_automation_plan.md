# Production Backup Automation Plan

## 1. Purpose

Define a safe production backup strategy before creating any backup automation.

This runbook does not authorize backup creation, Supabase export, `pg_dump`, Supabase CLI/API backup, secret file copy, cron creation, systemd timer creation, `rsync`, remote storage setup, runtime changes, Nginx reload/restart, DNS changes, certbot execution, LINE send, OpenAI API calls, or Supabase schema/RLS/write changes.

## 2. Current Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
backup_job_created=false
DB export performed=false
cron/systemd timer created=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Supabase export performed=false
secrets not recorded
```

Read-only evidence from Loop 188:

```txt
api_direct_health_loop188_backup_plan=200
https_api_health_loop188_backup_plan=200
https_admin_root_loop188_backup_plan=200
https_admin_customers_loop188_backup_plan=200
https_admin_api_no_header_customers_loop188_backup_plan=401
https_line_invalid_signature_loop188_backup_plan=401
backup_dir_exists=/root/deploy-backups/amami-line-crm
backup_artifact_file_count=0
backup_artifact_dir_count=25
backup_dir_absent=/var/backups/amami-line-crm
backup_dir_absent=/var/lib/amami-line-crm/backups
```

## 3. Backup Scope

| Area | What to protect | Current strategy | Automation status |
| --- | --- | --- | --- |
| Git / source / docs | Code, migrations, runbooks, tests, scripts. | GitHub `origin/main` is source of truth. | Existing Git workflow. |
| VPS deploy artifacts | Active release and deploy rollback artifacts. | Existing deploy backup directory is present. | Not automated by this Loop. |
| Runtime configuration | systemd unit paths, drop-ins, EnvironmentFile paths. | Path inventory only; values excluded. | Not automated. |
| Supabase | Application data, schema, migrations, RLS alignment. | Strategy planned; export not performed. | Not automated. |
| LINE / OpenAI provider settings | Dashboard settings and credentials. | Provider dashboards plus operator secret store. | Not automated. |
| Logs / monitoring summaries | Sanitized status summaries. | Docs/dev logs only. | Not automated. |

## 4. Excluded Data

Never store or print these in docs, Git, backup logs, final reports, or command output:

- LINE channel secret or access token values.
- LINE webhook secret path values or webhook URL suffixes.
- LINE user identifiers, reply tokens, inbound bodies, or outbound bodies.
- OpenAI API key, model value, prompts, responses, request payloads, or provider output.
- Supabase endpoint values, anon key, service role key, DB URL, or connection strings.
- Authorization bearer tokens.
- Private keys.
- `.env` values or secret file contents.
- Raw DB dumps in the repository.

## 5. Secret Handling Policy

```txt
secret source exists; value not recorded
backup target path documented; contents not copied
ALLOW_SECRET_FILE_COPY=NO
ALLOW_ENV_DISPLAY=NO
secrets not recorded
```

Secrets are operator-controlled. A restore process may inventory where secrets must be re-injected, but values must come from an approved secret store or root-only helper flow outside docs and Git.

## 6. Supabase Backup Strategy

Supabase backup method is planned only.

Allowed future options after explicit approval:

1. Supabase dashboard/manual backup.
2. Supabase CLI or database dump with secret-safe command handling.
3. Scheduled export to secure storage after encryption, retention, and ownership are decided.

Required before any Supabase backup execution:

- Explicit operator approval.
- Non-production restore rehearsal.
- Tenant isolation validation.
- RLS validation.
- No DB URL, service role key, anon key, endpoint value, or raw dump output in logs.
- Storage encryption and access ownership defined.
- Retention and deletion policy defined.

No-Go:

- DB URL would need to be displayed.
- Backup logs would include secrets.
- Restore has not been rehearsed.
- Storage encryption, retention, or owner is undecided.
- Production restore/overwrite would happen without explicit approval.

## 7. VPS Deploy Backup Strategy

Existing deploy backups are present under `/root/deploy-backups/amami-line-crm`.

Treat VPS deploy backups as application artifact rollback support only. They are not a replacement for Supabase data backups or operator-controlled secret storage.

Initial retention proposal:

```txt
vps_deploy_backups_keep_last=5
pre_activation_backups_keep_until_next_stable_release=true
vps_backup_review_cadence=monthly
values_adjustable_by_operator=true
```

Future retention actions must start with a no-delete dry-run that lists proposed removals without deleting anything.

## 8. Repo / Docs Backup Strategy

- GitHub `origin/main` is the source of truth.
- README, docs, runbooks, migrations, tests, and scripts are versioned in Git.
- Use tags/releases after stable production milestones.
- Restore should start from a clean clone and standard validation commands.

## 9. Retention Policy

Initial proposal:

```txt
retention_policy_status=proposed
vps_deploy_backups=keep_last_5_successful_deployment_backups
pre_activation_backups=keep_until_next_stable_release
vps_review_cadence=monthly
supabase_backup_frequency=operator_defined
supabase_retention_period=operator_defined
supabase_restore_drill_cadence=operator_defined
repo_source_of_truth=GitHub origin/main
release_tags=recommended_after_stable_production_milestone
```

The operator can adjust these values before automation is implemented.

## 10. Restore Drill Plan

### Git Restore Drill

1. Clone the repository.
2. Install dependencies.
3. Run `git diff --check`.
4. Run lint, typecheck, test, integration test, and build.
5. Confirm runbooks and task docs are present.

### VPS Deploy Rollback Drill

1. Identify the candidate backup path without opening archive contents.
2. Restore the active deployment or redeploy a known release archive in an approved Loop.
3. Restart only approved services.
4. Confirm API direct health, HTTPS API health, Admin root/customers, Admin API no-header rejection, and LINE invalid-signature rejection.
5. Do not change Nginx, DNS, or certbot unless separately approved.

### Supabase Restore Drill

1. Use non-production first.
2. Restore the latest approved backup.
3. Validate tenant-scoped data.
4. Validate RLS behavior.
5. Validate repository mappings.
6. Do not overwrite production without explicit approval.

### Runtime Secret Re-Injection Drill

1. Inventory EnvironmentFile paths only.
2. Retrieve values from operator-controlled secret store.
3. Re-inject via approved root-only helpers or approved process.
4. Do not record values in docs, Git, command output, or final reports.

### LINE / OpenAI Recovery Drill

1. Confirm dashboard access.
2. Confirm token rotation process.
3. Re-inject runtime values without displaying them.
4. Run health and invalid-signature checks.
5. Any LINE send or OpenAI call requires a separate explicit approval Loop.

## 11. Verification Policy

Every future backup/restore Loop should verify:

- Backup job output is sanitized.
- No secret values are printed.
- No webhook suffixes, LINE identifiers, reply tokens, or message bodies are printed.
- No OpenAI keys, model values, prompts, responses, or provider output are printed.
- No Supabase endpoint values, keys, DB URLs, or connection strings are printed.
- Health checks remain green.
- Tenant isolation checks pass after restore.
- RLS checks pass after Supabase restore.

## 12. Future Automation Plan

```txt
Loop 189: backup inventory dry-run script
Loop 190: VPS deploy backup retention dry-run
Loop 191: Supabase backup method selection
Loop 192: Supabase manual backup operator checklist
Loop 193: Supabase non-production restore drill checklist
Loop 194: Supabase backup export dry-run with explicit approval
Loop 195: Supabase scheduled backup automation plan
```

## 13. No-Go Conditions

- A command would display `.env` content.
- A command would copy secret files.
- A backup job would be created in a planning Loop.

## Loop 191 Method Selection Follow-up

```txt
Supabase backup method selection=done
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
OpenAI API performed=false
supabase_write_migration_rls_performed=false
nginx_dns_certbot_changes=none
production readiness: Go
```

Actual Supabase backup execution remains blocked until the operator completes the manual backup checklist and a non-production restore drill plan.
- A DB export would run without explicit approval.
- cron or systemd timer would be created without a separate implementation Loop.
- Runtime would change.
- LINE would send.
- OpenAI API would be called.
- Supabase schema/RLS/write would change.
- Nginx reload/restart, DNS change, or certbot execution would be required.

## 14. Next Loop Proposal

```txt
Loop 191: Supabase backup method selection
```

Loop 189 inventory and Loop 190 retention dry-run are complete. The next safe backup step is choosing a Supabase backup method. It must not export production data or display secret values without a separate explicit approval Loop.

## 15. Loop 189 Follow-up

Loop 189 added and executed the read-only backup inventory dry-run script.

```txt
backup inventory dry-run=done
script_path=scripts/backup/backup-inventory-dry-run.ts
vps_dry_run_performed=true
backup_inventory_dry_run=completed
backup_job_created=false
db_export_performed=false
secret_file_copied=false
env_values_displayed=false
supabase_export_performed=false
timer_created=false
secrets_recorded=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
production_readiness=production_go
```

The next safe backup step remains a no-delete retention dry-run proposal. Actual backup creation, database export, timer installation, retention deletion, and remote storage setup still require separate explicit Loops.

## 16. Loop 190 Follow-up

Loop 190 added and executed the read-only backup retention dry-run proposal.

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
supabase_export_performed=false
timer_created=false
secrets_recorded=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
production_readiness=production_go
```

Actual deletion, retention enforcement, backup creation, database export, timer installation, and remote storage setup still require separate explicit Loops. Any future deletion must be preceded by a restore viability check.

## 17. Loop 193 Manual Backup Operator Checklist

Loop 193 creates the operator checklist for confirming and recording a manual or managed Supabase backup path. It does not perform a backup.

```txt
manual_backup_operator_checklist=created
backup_availability_template=created
backup_execution_checklist=created
backup_result_record_template=created
failure_record_template=created
restore_drill_policy=non_production_first
no_go_conditions=created
Supabase CLI/API called=false
DB export performed=false
restore performed=false
backup artifact downloaded=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Nginx/DNS/certbot changes=false
production readiness: Go
```

Operator action remains outside Codex: confirm dashboard/manual/managed backup availability, perform backup only if No-Go conditions are false, record summarized status only, and plan non-production restore drill next.

## 18. Loop 194 Manual Backup Result Recording

Loop 194 did not receive an operator-provided sanitized result. Backup automation remains blocked until a manual or managed backup is confirmed and recorded safely.

```txt
manual_backup_result_recording_status=pending
operator_result_received=false
operator_result_required=true
backup_status=not_recorded
backup_performed_by_operator=operator_unknown
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
restore_performed=false
Supabase CLI/API called by Codex=false
DB export performed by Codex=false
secrets_recorded=false
runtime_changes_performed=false
production readiness: Go
```

Automation still requires a successful operator backup result and a non-production restore drill before any scheduled export proposal.

## 19. Loop 194.1 Free Plan Limitation Availability Result

Backup automation remains blocked because the operator confirmed dashboard/manual/managed backup is unavailable on the current Free Plan.

```txt
manual_backup_availability_recording_status=complete
operator_result_received=true
backup_availability_checked=true
manual_backup_available=false
managed_backup_available=false
backup_performed_by_operator=false
backup_status=not_performed
backup_artifact_downloaded=false
backup_artifact_committed_to_repo=false
restore_performed=false
Supabase CLI/API called by Codex=false
DB export performed by Codex=false
runtime_changes_performed=false
backup_success_recorded=false
production readiness: Go
```

Next safe step is choosing a backup path after the Free Plan limitation. Scheduled automation remains future work.

## 20. Loop 195 Backup Path Decision After Free Plan Limitation

Loop 195 records the decision options after dashboard/manual/managed backup was unavailable on the Free Plan. Backup remains not achieved.

```txt
decision_status=recorded
backup path decision recorded
recommended_path=operator_decision_required_between_pro_upgrade_or_cli_dry_run
backup_success_status=not_achieved
option_a_status=operator_plan_decision_required
option_b_status=explicit_approval_required
option_c_status=not_recommended_without_explicit_risk_acceptance
Supabase CLI/API called=false
DB export performed=false
restore performed=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Nginx/DNS/certbot changes=false
production readiness: Go
```

Automation remains blocked until the operator chooses a path and a backup result plus non-production restore drill are recorded in later explicit Loops.

## 21. Loop 196 Operator Decision

Loop 196 records the operator-selected path as planning only.

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
Supabase CLI/API called=false
DB export performed=false
restore performed=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Nginx/DNS/certbot changes=false
production readiness: Go
```

Automation remains blocked. Loop 197 may only design the CLI/pg_dump-style backup dry-run boundary.

## 22. Loop 197 Production Operations Final Closeout

Loop 197 closes out initial production operations while accepting Supabase backup as a deferred risk.

```txt
project_closeout_status=complete
no_further_required_loop=true
production_readiness=production_go
supabase_backup_success_status=not_achieved
supabase_backup_risk_accepted=true
supabase_backup_review_required_later=true
supabase_pro_upgrade=false
supabase_cli_api_called=false
db_export_performed=false
restore_performed=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
secrets_recorded=false
```

Backup automation remains future optional work, not a required open Loop.

## 23. Loop 197 Supabase CLI Backup Dry-Run Design

Loop 197 adds the design boundary for the Free Plan CLI/pg_dump-style path selected as planning-only in Loop 196.

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
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
nginx_dns_certbot_changes=false
secrets_recorded=false
production readiness: Go
```

Backup automation still requires explicit future approval, artifact storage approval, and a non-production restore drill.

## 24. Loop 198 Supabase CLI Backup Command Pack Planning

Loop 198 adds a placeholder-only command pack plan. It does not execute any preflight, export, verification, restore, or artifact command.

```txt
command_pack_status=planned
placeholder_only=true
preflight_command_group=planned
export_command_group=planned
verification_command_group=planned
artifact_handling_group=planned
restore_roadmap_group=planned
preflight_execution_status=not_executed
export_execution_status=not_executed
restore_execution_status=not_executed
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
backup artifact created=false
restore performed=false
runtime unchanged
```

Automation remains blocked until an explicit future Loop approves the exact preflight or export scope.

## 25. Loop 199 Supabase Backup Preflight Closeout

Loop 199 executed the approved preflight only. Backup automation is still not enabled.

```txt
preflight_status=complete
backup_readiness_status=blocked_tooling_missing
backup_dir_ready=true
backup_dir_outside_repo=true
supabase_cli_available=false
pg_dump_available=false
Supabase CLI/API called=false
pg_dump executed=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
runtime unchanged
production_readiness=production_go
```

Automation remains blocked until tooling is available and a later Loop explicitly approves export, artifact handling, and restore boundaries.

## 26. Loop 200 Supabase Backup Tooling Installation Preflight

Loop 200 recovered PostgreSQL client tooling. Backup automation is still not enabled.

```txt
tooling_preflight_status=complete
postgresql_client_installed=true
pg_dump_available_before=false
pg_dump_available_after=true
psql_available_after=true
supabase_cli_available_before=false
supabase_cli_installed=false
backup_dir_ready=true
backup_dir_outside_repo=true
backup_readiness_status=pg_dump_available
export_readiness=ready_pending_operator_approval
Supabase CLI/API called=false
pg_dump connection attempted=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
runtime unchanged
production_readiness=production_go
```

Automation remains blocked until a future Loop explicitly approves export and artifact handling.

## 27. Loop 201 Supabase Backup Export Controlled Execution

Loop 201 attempted the controlled export gate. Tooling and backup directory checks passed, but backup automation is still not enabled because the operator supplied database URL was not present in the non-interactive VPS execution environment.

```txt
pg_dump_available=true
pg_dump_version_check=ok
backup_dir_ready=true
backup_dir_outside_repo=true
operator_supplied_db_url_present=false
operator_supplied_db_url_used=false
DB URL value not recorded
backup_export_status=blocked_operator_secret_not_injected
backup_export_execution_status=blocked_operator_secret_not_injected
pg_dump executed=false
DB export performed=false
backup artifact created=false
backup_artifact_size_bytes=not_recorded
backup_artifact_sha256_recorded=false
restore performed=false
production_restore_performed=false
runtime unchanged
production_readiness=production_go
secrets_recorded=false
```

Automation remains blocked until `Loop 201.1: Supabase backup export operator secret injection retry`.

## 28. Loop 202 pg_dump 17 Client Boundary And Backup Mismatch

Loop 202 records the post-Loop 201 backup mismatch safely. Supabase PostgreSQL server version `17.6` is not export-compatible with the VPS-side `pg_dump` client `16.14`.

```txt
pg_dump_failure_categories=pg_dump_server_version_mismatch
detected_server_major_or_version=17.6
detected_pg_dump_major_or_version=16.14
raw_log_not_displayed=true
secrets_recorded=false
pg_dump_17_client_required=true
pg_dump_16_retry_allowed=false
backup_export_retry_before_pg_dump_17=false
postgresql_client_17_installation_performed=false
pg_dump reexecuted=false
DB export performed=false
backup artifact created=false
restore performed=false
production_restore_performed=false
runtime unchanged
production_readiness=production_go
```

Automation remains blocked until PostgreSQL client 17 is installed or otherwise made available in a separately approved Loop.
