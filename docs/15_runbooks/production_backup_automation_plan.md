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
Loop 192: Supabase backup dry-run
Loop 193: restore drill in non-production
```

## 13. No-Go Conditions

- A command would display `.env` content.
- A command would copy secret files.
- A backup job would be created in a planning Loop.
- A DB export would run without explicit approval.
- cron or systemd timer would be created without a separate implementation Loop.
- Runtime would change.
- LINE would send.
- OpenAI API would be called.
- Supabase schema/RLS/write would change.
- Nginx reload/restart, DNS change, or certbot execution would be required.

## 14. Next Loop Proposal

```txt
Loop 189: backup inventory dry-run script
```

That Loop should inventory paths, counts, and sizes only. It must not create backups, delete backups, copy secrets, export the database, install timers, or change runtime.

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
