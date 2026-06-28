# Loop 190: Backup Retention Dry-Run Proposal

## Purpose

Add a read-only backup retention dry-run proposal for VPS deploy backup artifacts.

This Loop classifies existing deploy backup artifacts into keep/review buckets without creating backups, deleting backups, exporting databases, copying secrets, installing timers, or changing runtime.

## Current Production State

```txt
production_readiness=production_go
activation_mode=line_and_openai_runtime
REPOSITORY_RUNTIME=supabase
LINE_REAL_PUSH_ENABLED=true
AI_PROVIDER=openai
OpenAI systemd drop-in=present
```

## Scope

- Add `scripts/backup/backup-retention-dry-run.ts`.
- Inspect deploy backup artifact names, size summaries, and modified time only.
- Default to `/root/deploy-backups/amami-line-crm`.
- Default retention proposal to keep latest 5 artifacts.
- Keep milestone-like artifacts when identifiable.
- Put older non-milestone artifacts into review.
- Produce summary counts only.
- Add tests for dry-run/read-only boundaries, secret-safe output, CLI behavior, and docs coverage.
- Update README, dev loop docs, P0 backlog, backup runbooks, production readiness, and dev log.
- Run the script once on the VPS active source after safe copy-based deploy.

## Out of Scope

- Backup archive creation.
- Backup artifact deletion.
- Retention enforcement.
- Database export.
- Supabase CLI/API backup.
- Secret file copy.
- `.env` display or copy.
- cron creation.
- systemd timer creation.
- remote storage setup.
- runtime changes.
- additional LINE send.
- OpenAI API call.
- Supabase write, migration, RLS, or schema changes.
- Nginx reload/restart.
- DNS or certbot changes.

## Script

```txt
script_path=scripts/backup/backup-retention-dry-run.ts
default_mode=dry_run_read_only
default_backup_dir=/root/deploy-backups/amami-line-crm
keep_latest_policy=5
delete_candidate_count=0
delete_performed=false
retention_enforced=false
```

The script uses directory listing and file metadata only. It does not read archive contents and does not open secret files.

Required safety flags:

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

## Retention Proposal

| Bucket | Rule | Action |
| --- | --- | --- |
| keep | Newest `keep_latest_policy=5` artifacts. | Keep. |
| keep | Milestone-like artifacts, such as pre-activation, final, closeout, stable, or production Go markers. | Keep until a future explicit review Loop. |
| review | Older non-milestone artifacts. | Review only; no deletion in this Loop. |
| delete_candidate | Not used in Loop 190. | `delete_candidate_count=0`. |

Deletion must stay disabled until a separate future Loop explicitly approves it.

```txt
restore_viability_check_required_before_deletion=true
future_explicit_delete_approval_required=true
```

## VPS Dry-Run Result

Recorded after copy-based deploy of Loop 190 implementation to the VPS active source.

```txt
vps_retention_dry_run_performed=true
backup_retention_dry_run=completed
backup_retention_dry_run_exit=0
api_direct_health_loop190_backup_retention=200
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

## P0 Operations Closeout

```txt
production monitoring automation dry-run=done
OpenAI usage/cost monitoring plan=done
backup automation plan=done
backup inventory dry-run=done
backup retention dry-run=done
```

Remaining P0 implementation candidates:

- Supabase backup method selection.
- Optional backup creation dry-run.
- Optional restore drill in non-production.
- Optional timer/notification install after backup method is approved.

## Test Coverage

- The script exists.
- The script is dry-run/read-only by default.
- The script does not contain destructive, backup creation, export, secret-copy, restart, reload, Nginx, or certificate command strings.
- Newest artifacts are kept.
- Older non-milestone artifacts are review-only.
- Milestone-like artifacts are kept.
- `delete_candidate_count=0`, `delete_performed=false`, and `retention_enforced=false` are formatted.
- Secret-shaped artifact names and output strings are redacted.
- CLI entrypoint exits `0` when the proposal is generated.
- Docs record no deletion, no backup creation, no DB export, no secret copy, no env display, no timer, no runtime change, no additional LINE send, and no OpenAI API call.

## Safety Notes

- Secret values are never displayed or recorded.
- LINE identifiers, webhook suffixes, message bodies, and reply tokens are never recorded.
- OpenAI key, model value, prompt, request, response, and provider output are never recorded.
- Supabase endpoint, anon key, service role key, DB URL, and dump contents are never recorded.
- Runtime is unchanged.
- production readiness remains Go.

## Next Loop Proposal

```txt
Loop 191: Supabase backup method selection
```
