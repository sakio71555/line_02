# Backup Inventory Dry-Run Script

## 1. Purpose

Use `scripts/backup/backup-inventory-dry-run.ts` to inspect backup and restore readiness signals without creating a backup job or touching runtime state.

This runbook is for production operations review. It is not a backup execution runbook.

## 2. Command

Run from the active project directory on the VPS:

```bash
npx pnpm@10.12.1 exec tsx scripts/backup/backup-inventory-dry-run.ts --dry-run
```

Expected safety flags:

```txt
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
```

## 3. What It Checks

| Area | What is checked | What is not checked |
| --- | --- | --- |
| Active app source | Active app directory and core repo docs exist. | No deploy, no restart, no file mutation. |
| VPS deploy backups | Backup directory presence, artifact count, total size summary, recent safe basenames. | No archive creation, no archive contents, no deletion. |
| Runtime config paths | systemd unit/drop-in/env file path existence only. | No env values and no secret file contents. |
| OpenAI runtime | Drop-in presence only. | No API call, key, model value, prompt, or response. |
| LINE helpers | Helper path existence only. | No LINE send, token, webhook suffix, identifier, or body. |
| Supabase backup strategy | Backup strategy docs exist. | No DB export, endpoint, key, DB URL, or dump content. |

## 4. Excluded Actions

The dry-run must not:

- create backup archives.
- export the database.
- run Supabase backup commands.
- copy secret files.
- display `.env` values.
- create cron jobs.
- create systemd timers.
- delete old backups.
- configure remote storage.
- change runtime flags.
- send LINE messages.
- call OpenAI.
- change Supabase schema, RLS, or rows.
- reload or restart Nginx.
- change DNS or certificates.

## 5. Output Rules

Allowed output examples:

```txt
backup_inventory_dry_run=completed
backup directory exists
backup artifact count=<number>
runtime config path exists; contents not displayed
secret path exists; value not recorded
backup_job_created=false
db_export_performed=false
timer_created=false
secrets_recorded=false
```

Forbidden output:

- secret values.
- webhook suffixes.
- LINE identifiers, reply tokens, or message bodies.
- OpenAI key, model value, prompt, request, response, or provider output.
- Supabase endpoint, keys, DB URL, connection string, or dump contents.
- private keys.
- `.env` contents.
- backup archive contents.

## 6. VPS Result

Loop 189 active dry-run result:

```txt
vps_dry_run_performed=true
archive_sha256=2069c2e4bf3c09fe74a9689a8e059755fc8361b75beae07e4146b467870421bb
staging_validation=passed
active_deploy_updated=true
backup_inventory_dry_run=completed
backup_inventory_dry_run_exit=0
api_direct_health_loop189_backup_inventory=200
https_api_health_loop189_backup_inventory=200
https_admin_root_loop189_backup_inventory=200
https_admin_customers_loop189_backup_inventory=200
https_admin_api_no_header_customers_loop189_backup_inventory=401
https_line_invalid_signature_loop189_backup_inventory=401
backup_dir_1_exists=true
backup_dir_1_artifact_count=24
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
```

## 7. P0 Operations State

```txt
production monitoring automation dry-run=done
OpenAI usage/cost monitoring plan=done
backup automation plan=done
backup inventory dry-run=done
production_readiness=production_go
```

## 8. Troubleshooting

- If the script exits `degraded`, review which path existence check is false.
- If a backup directory is absent, do not create one in the same Loop unless explicitly approved.
- If runtime config paths are absent, do not create or edit runtime files in the same Loop.
- If any command would show secret values, stop and redesign the check.
- If backup creation, DB export, timer install, or retention deletion is desired, create a separate explicit Loop.

## 9. Next Safe Step

```txt
Loop 191: Supabase backup method selection
```

Loop 190 backup retention dry-run is complete. It remained no-delete and no-backup-creation.

## 10. Loop 190 Follow-up

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
```

Actual retention enforcement and deletion remain blocked until a future explicit approval Loop with a restore viability check.

## 11. Loop 191 Follow-up

Supabase backup method selection is complete, but no database export or Supabase CLI/API call was performed.

```txt
Supabase backup method selection=done
selection_status=completed
backup method selected=operator_review_required
recommended_path=operator_confirmed_manual_or_managed_backup_first
production_export_status=not_performed
DB export performed=false
Supabase CLI/API called=false
restore drill target=non_production_first
future_automation_requires_explicit_approval=true
secrets_recorded=false
runtime_changes_performed=false
additional_line_send_performed=false
openai_api_performed=false
```

Next safe step:

```txt
Loop 192: Supabase manual backup operator checklist
```
