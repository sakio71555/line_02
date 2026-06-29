# Backup Retention Dry-Run Proposal

## 1. Purpose

Use `scripts/backup/backup-retention-dry-run.ts` to propose retention buckets for VPS deploy backup artifacts without deleting anything.

This runbook is a no-delete review guide. It is not a retention enforcement runbook.

## 2. Command

Run from the active project directory on the VPS:

```bash
npx pnpm@10.12.1 exec tsx scripts/backup/backup-retention-dry-run.ts --dry-run --backup-dir /root/deploy-backups/amami-line-crm --keep-latest 5
```

Expected safety flags:

```txt
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

## 3. Retention Policy

Initial proposal:

```txt
default_mode=dry_run_read_only
keep_latest_policy=5
delete_candidate_count=0
delete_performed=false
retention_enforced=false
restore_viability_check_required_before_deletion=true
future_explicit_delete_approval_required=true
```

| Bucket | Criteria | Result |
| --- | --- | --- |
| keep | Newest 5 deploy backup artifacts. | Keep. |
| keep | Milestone-like names such as pre-activation, final, closeout, stable, or production Go. | Keep until explicit review. |
| review | Older non-milestone deploy backup artifacts. | Review only. |
| delete_candidate | Not used in Loop 190. | Count must remain `0`. |

## 4. What It Checks

| Area | What is checked | What is not checked |
| --- | --- | --- |
| Deploy backup directory | Directory exists and artifact count. | No directory creation. |
| Artifact metadata | Safe basename, size summary, modified time, rank, and keep/review decision. | No archive contents and no secret contents. |
| Retention policy | Newest count and review-only classification. | No enforcement. |
| Safety flags | Delete, backup, export, secret, timer, runtime, LINE, OpenAI flags. | No runtime or external side effect. |

## 5. Excluded Actions

The dry-run must not:

- delete backup artifacts.
- enforce retention.
- create backup archives.
- export the database.
- run Supabase backup commands.
- copy secret files.
- display `.env` values.
- create cron jobs.
- create systemd timers.
- configure remote storage.
- change runtime flags.
- send LINE messages.
- call OpenAI.
- change Supabase schema, RLS, or rows.
- reload or restart Nginx.
- change DNS or certificates.

## 6. Output Rules

Allowed output examples:

```txt
backup_retention_dry_run=completed
backup_dir_exists=true
backup_artifact_count=<number>
keep_count=<number>
review_count=<number>
delete_candidate_count=0
delete_performed=false
retention_enforced=false
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

## 7. VPS Result

Loop 190 active dry-run result:

```txt
vps_retention_dry_run_performed=true
backup_retention_dry_run=completed
backup_retention_dry_run_exit=0
api_direct_health_loop190_backup_retention=000
api_direct_health_loop190_backup_retention_status=not_listening_read_only
https_api_health_loop190_backup_retention=200
https_admin_root_loop190_backup_retention=200
https_admin_customers_loop190_backup_retention=200
https_admin_api_no_header_customers_loop190_backup_retention=401
https_line_invalid_signature_loop190_backup_retention=401
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

## 8. P0 Operations State

```txt
production monitoring automation dry-run=done
OpenAI usage/cost monitoring plan=done
backup automation plan=done
backup inventory dry-run=done
backup retention dry-run=done
production_readiness=production_go
```

## 9. Troubleshooting

- If the script exits `degraded`, verify that the backup directory exists.
- If `delete_candidate_count` is greater than `0`, stop and review the script before continuing.
- If `delete_performed` or `retention_enforced` is not `false`, stop and do not proceed.
- If artifact names look secret-shaped, confirm they are redacted before recording output.
- If actual retention cleanup is desired, create a separate explicit Loop with restore viability verification first.

## 10. Next Safe Step

```txt
Loop 191: Supabase backup method selection
```

Do not proceed to deletion or retention enforcement without a separate explicit approval Loop.
