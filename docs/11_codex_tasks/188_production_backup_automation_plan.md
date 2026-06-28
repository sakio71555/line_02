# Loop 188: Production Backup Automation Plan

## Purpose

Plan production backup automation before any backup job, database export, cron, systemd timer, or remote storage setup is created.

This Loop is docs, runbook, read-only verification, and static tests only. It does not create backups, export Supabase data, copy secret files, install timers, change runtime, call OpenAI, send LINE messages, or change Nginx/DNS/certbot.

## Current Production State

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

## Read-Only Evidence

VPS read-only checks were performed without runtime changes.

```txt
vps_host=vm-227d8253-eb
api_service_active=true
admin_service_active=true
api_direct_health_loop188_backup_plan=200
https_api_health_loop188_backup_plan=200
https_admin_root_loop188_backup_plan=200
https_admin_customers_loop188_backup_plan=200
https_admin_api_no_header_customers_loop188_backup_plan=401
https_line_invalid_signature_loop188_backup_plan=401
OpenAI systemd drop-in=present
```

Existing deploy backup inventory was checked read-only.

```txt
backup_dir_exists=/root/deploy-backups/amami-line-crm
backup_artifact_file_count=0
backup_artifact_dir_count=25
backup_dir_absent=/var/backups/amami-line-crm
backup_dir_absent=/var/lib/amami-line-crm/backups
backup target path documented; contents not copied
```

Only directory names and counts were inspected. Archive contents, secret file contents, environment values, DB dumps, LINE identifiers, webhook suffixes, OpenAI values, Supabase endpoints, and DB URLs were not displayed or recorded.

## Scope

- Inventory backup targets.
- Classify existing VPS deploy backups.
- Plan Supabase backup strategy.
- Plan GitHub/repo/docs recovery.
- Define secret/env handling without recording values.
- Define restore drill steps.
- Define retention, rotation, and ownership.
- Define the next backup dry-run safety boundary.
- Update docs and static tests.

## Out of Scope

- `pg_dump`.
- Supabase DB export.
- Supabase CLI or API backup.
- VPS backup archive creation.
- Secret file copy.
- `.env` display or copy.
- cron creation.
- systemd timer creation.
- `rsync`.
- remote storage setup.
- OpenAI API call.
- LINE additional send.
- runtime changes.
- Nginx reload or restart.
- DNS changes.
- certbot execution.
- Supabase schema/RLS/write changes.

## Backup Scope

### A. Git / Source / Docs

- Source of truth: GitHub `origin/main`.
- Includes README, docs, runbooks, tests, package definitions, source code, and migration files.
- Restore path: clone repository, install dependencies, run validation commands, redeploy through an approved release Loop.
- Tags or releases are recommended after stable production milestones.

### B. VPS Deploy Artifacts

- Active deployment directory is managed on the VPS.
- Existing deploy backup path: `/root/deploy-backups/amami-line-crm`.
- Restore path: identify backup, restore active deployment or redeploy a known release archive, restart approved services, and run health checks.
- This Loop did not create, modify, delete, or copy deploy backups.

### C. Runtime Configuration

- Record only systemd unit paths, drop-in presence, and EnvironmentFile paths.
- Do not record env values.
- Secret values are restored from an operator-controlled secret store, not from docs or Git.
- Runtime secret re-injection must use approved root-only helpers or a future approved process.

### D. Supabase

- Scope includes application data, schema, migrations, tenant-scoped rows, and RLS policy alignment.
- Supabase backup method is planned only.
- Supabase backup method=planned; export not performed.
- RLS and schema restore validation must align with repository migrations and tenant isolation tests.

### E. LINE / OpenAI External Services

- Credentials are not backed up in repo or docs.
- Provider dashboards remain the source of truth for channel/project settings.
- Recovery requires operator access, token rotation ability, and secret re-injection.
- OpenAI prompt/response bodies and LINE message bodies are excluded from backup documentation.

### F. Logs and Monitoring Artifacts

- Store sanitized summaries only.
- Raw logs may contain sensitive values or identifiers and are not copied into the repository.
- Incident timelines must exclude secrets, webhook suffixes, LINE identifiers, message bodies, OpenAI prompts/responses, Supabase endpoints, and DB URLs.

## Excluded Data

- LINE channel secret and access token values.
- LINE webhook secret path values and URL suffixes.
- LINE user identifiers, reply tokens, inbound bodies, and outbound bodies.
- OpenAI API key, model value, prompts, responses, and provider payloads.
- Supabase endpoint values, anon key, service role key, DB URL, and connection strings.
- Authorization bearer tokens.
- Private keys.
- `.env` contents and secret file contents.
- Raw DB dumps in docs or Git.

## Secret Handling Policy

```txt
secret source exists; value not recorded
backup target path documented; contents not copied
ALLOW_SECRET_FILE_COPY=NO
ALLOW_ENV_DISPLAY=NO
secrets not recorded
```

Secrets must be stored and restored through an operator-controlled secret store or approved root-only helper flow. Docs can record that a secret source exists, but not the value, suffix, or raw file content.

## Supabase Backup Strategy

Supabase export is not performed in this Loop.

Candidate methods:

1. Supabase dashboard/manual backup.
2. Supabase CLI or database dump with explicit approval.
3. Scheduled export to secure storage after encryption, retention, and owner decisions are documented.

Required before any Supabase backup job:

- Explicit operator approval.
- Non-production restore rehearsal first.
- Secret-safe command output.
- No DB URL or service key printed.
- Tenant isolation validation after restore.
- RLS validation after restore.
- Storage encryption and access owner defined.
- Retention period defined.

No-Go:

- DB URL unavailable or would need to be printed.
- Backup logs contain secrets.
- Restore procedure is untested.
- Storage encryption or retention is undecided.
- Production overwrite would occur without explicit approval.

## VPS Deploy Backup Strategy

- Existing deploy backups are present under `/root/deploy-backups/amami-line-crm`.
- Treat deploy backups as rollback support for application artifacts, not as database backups.
- Keep a small, reviewed set of recent successful deployment backups.
- Do not include `.env` values or secret file contents in repo documentation.
- Any deletion must first be a dry-run proposal with no delete.

Initial policy proposal:

```txt
vps_deploy_backups_keep_last=5
pre_activation_backups_keep_until_next_stable_release=true
backup_review_cadence=monthly
values_adjustable_by_operator=true
```

## Repo / Docs Backup Strategy

- GitHub `origin/main` is the source of truth.
- Keep docs, runbooks, tests, migrations, and scripts in Git.
- Use tags or releases after stable production milestones.
- Recovery starts from a clean clone and standard validation commands.

## Retention Policy

Initial proposal, adjustable by the operator:

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

## Restore Drill Plan

### 1. Git Restore Drill

1. Clone repository.
2. Install dependencies with the standard command.
3. Run `git diff --check`.
4. Run lint, typecheck, test, integration test, and build.
5. Confirm docs and runbooks are present.

### 2. VPS Deploy Rollback Drill

1. Identify the intended backup path without opening archive contents.
2. Restore active deployment or redeploy a known release archive in an approved Loop.
3. Restart only approved services.
4. Verify API direct health, HTTPS API health, Admin root/customers, Admin API no-header rejection, and LINE invalid-signature rejection.
5. Do not change Nginx, DNS, or certbot during deploy rollback drill unless separately approved.

### 3. Supabase Restore Drill

1. Rehearse in non-production first.
2. Restore the latest approved backup.
3. Validate tenant-scoped data.
4. Validate RLS behavior.
5. Validate repository mapping.
6. Do not overwrite production without explicit approval.

### 4. Runtime Secret Re-Injection Drill

1. Inventory EnvironmentFile paths only.
2. Retrieve values from operator-controlled secret store.
3. Inject values through approved root-only helpers or future approved process.
4. Do not record values in docs, Git, stdout, or final reports.

### 5. LINE / OpenAI Recovery Drill

1. Confirm provider dashboard access.
2. Confirm token rotation process.
3. Re-inject runtime secrets without displaying values.
4. Verify health and invalid-signature safety.
5. For LINE send or OpenAI calls, use separate explicit approval Loops.

## Verification Policy

Every backup or restore Loop must verify:

- No secret values in command output.
- No webhook suffixes or LINE identifiers in logs.
- No OpenAI prompts, responses, API keys, or model values in logs.
- No Supabase endpoints, keys, or DB URLs in logs.
- Health checks remain green.
- Tenant isolation checks pass after any data restore.
- Backup job output is sanitized.

## Future Automation Plan

Split backup automation into separate Loops:

- Loop 189: backup inventory dry-run script.
- Loop 190: VPS deploy backup retention dry-run.
- Loop 191: Supabase backup method selection.
- Loop 192: Supabase backup dry-run.
- Loop 193: restore drill in non-production.

## No-Go Conditions

- A command would print `.env` contents.
- A command would copy secret files.
- A backup contains unredacted secrets in logs.
- A DB export is attempted without explicit approval.
- A cron or systemd timer would be created in a planning Loop.
- Runtime changes would be required.
- LINE send, OpenAI API call, Nginx reload/restart, DNS change, certbot execution, or Supabase schema/RLS/write would be required.
- Restore procedure is not documented before automation.

## Loop 188 Result

```txt
planning_status=complete
backup_job_created=false
DB export performed=false
cron/systemd timer created=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Supabase export performed=false
production_readiness=production_go
```

## Next Loop Proposal

```txt
Loop 189: backup inventory dry-run script
```
