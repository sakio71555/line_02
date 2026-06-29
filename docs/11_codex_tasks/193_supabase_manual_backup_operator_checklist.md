# Loop 193: Supabase Manual Backup Operator Checklist

## Purpose

Create the operator-facing checklist for confirming and performing a Supabase manual or managed backup safely.

This Loop follows Loop 191 backup method selection and Loop 192 HTTPS `504` read-only triage. It is docs, checklist, static tests, dev log, commit, and push only.

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

Loop 192 showed the HTTPS Admin `504` was not reproduced:

```txt
anomaly_status=resolved_or_transient
API health=200
HTTPS API health=200
Admin root=200
Admin customers=200
Admin API no-header=401
LINE invalid-signature=401
monitoring dry-run=healthy
restart_required=false
```

## Non-Goals for This Loop

- Supabase dashboard operation by Codex.
- Supabase CLI/API call.
- Database export.
- Database restore.
- Backup archive creation, download, upload, or commit.
- Migration, RLS, schema, or runtime changes.
- `.env` display or secret file display.
- LINE send.
- OpenAI API call.
- Nginx reload/restart, DNS change, or certbot execution.

## Read-Only Safety Evidence

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

No restart, runtime change, additional LINE send, OpenAI API call, Supabase export/write, Nginx/DNS/certbot change, backup creation, or restore was performed.

## Operator Prerequisites

```txt
operator_prerequisites:
- Operator must have authorized Supabase dashboard access
- Operator must know which production project is in scope
- Operator must not paste secrets into chat/docs
- Operator must verify project/tenant before any backup operation
- Operator must record only summarized result
- Operator must not perform production restore during backup checklist
```

Supabase dashboard/manual/managed backup availability must be confirmed by operator in the current Supabase project and plan.

## Pre-Backup Checklist

```txt
pre_backup_checklist:
- Confirm production_readiness=production_go
- Confirm activation_mode=line_and_openai_runtime
- Confirm REPOSITORY_RUNTIME=supabase
- Confirm recent app health is green
- Confirm no active incident
- Confirm backup target project is correct
- Confirm operator has backup permission
- Confirm storage/download handling policy
- Confirm no secret values will be pasted into docs
- Confirm restore is not being performed
```

## Manual / Managed Backup Availability Check

```txt
availability_check:
- Check whether Supabase dashboard/managed backup is available for the project
- Check backup frequency and retention information if shown
- Check whether manual export/download is available
- Check whether restore option exists and whether it is production-impacting
- Do not execute restore
- Do not paste project ref, endpoint values, keys, DB connection values, or tokens
- Record only availability summary
```

Record only this summary:

```txt
backup_availability_checked=true/false
manual_backup_available=true/false/operator_unknown
managed_backup_available=true/false/operator_unknown
retention_visibility=true/false/operator_unknown
restore_option_visible=true/false/operator_unknown
project_confirmed_by_operator=true/false
secrets_recorded=false
```

## Backup Execution Checklist for Operator

Codex does not execute these steps. The operator performs them in Supabase only if the No-Go conditions are false.

```txt
operator_backup_execution_checklist:
- Confirm No-Go conditions are false
- Confirm project one more time
- Start manual/managed backup using Supabase UI or approved method
- Wait for completion
- Record completion timestamp only
- Record backup method only
- Record backup status only
- Do not record raw artifact content
- Do not upload artifact to repo/chat
- Store artifact only in approved secure location if downloaded
```

## Post-Backup Verification Checklist

```txt
post_backup_verification:
- Confirm backup status is succeeded, if visible
- Confirm artifact/storage location is secure, if downloaded
- Confirm no secrets were copied into repo/docs/chat
- Confirm no production restore was performed
- Confirm application health remains green
- Confirm next step is non-production restore drill planning
```

## Backup Record Template

```txt
backup_performed_by_operator=true/false
backup_method=manual_dashboard/managed_backup/operator_unknown
backup_started_at=<operator_recorded>
backup_completed_at=<operator_recorded>
backup_status=succeeded/failed/operator_unknown
backup_artifact_downloaded=true/false/operator_unknown
backup_artifact_committed_to_repo=false
secrets_recorded=false
```

## Failure Record Template

```txt
backup_failure_record:
- backup_attempted=true/false
- backup_method=<summary only>
- failure_stage=availability_check/start/wait/complete/download/operator_unknown
- error_summary=<sanitized summary only>
- secrets_recorded=false
- production_runtime_changed=false
- restore_performed=false
- next_action=operator_review_required
```

## Secret Handling Policy

- Record only summarized status.
- Do not paste provider endpoint values, project references, keys, DB connection values, tokens, `.env` contents, dump content, or backup archive content.
- Do not paste LINE webhook suffixes, user identifiers, reply tokens, or message bodies.
- Do not paste OpenAI keys, model values, prompts, responses, or provider output.
- Do not paste bearer tokens or private keys.
- Use only the allowed status phrase: `Supabase configured; values not recorded`.

## Restore Drill Policy

```txt
restore_drill_policy:
- Restore drill must be non-production first
- Production restore is prohibited without explicit approval
- Validate tenant scoped data
- Validate RLS
- Validate migrations/schema consistency
- Validate app boot against restored DB
- Validate admin API auth guard
- Validate LINE invalid-signature rejection
```

## No-Go Conditions

```txt
no_go_conditions:
- Operator cannot confirm correct Supabase project
- Supabase dashboard/managed backup availability is unclear and no approved method exists
- Any secret would need to be pasted into docs/chat
- Backup artifact storage location is not approved
- There is an active production incident
- Restore would affect production
- Operator lacks permission or confidence
```

If any No-Go condition is true, stop and record only a sanitized failure summary.

## Future Loop Split

```txt
Loop 194: Supabase manual backup result recording
- only after operator performs backup externally
- no raw artifact
- no secrets

Loop 195: Supabase non-production restore drill plan
- docs/checklist only
- no production restore

Loop 196: Supabase backup dry-run command pack
- explicit approval required
- no secret display

Loop 197: Supabase backup automation proposal
- only after successful manual backup + restore drill
```

## Loop 193 Result

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
secrets_recorded=false
production_readiness=production_go
```

## Test Coverage

- Loop 193 task doc exists.
- Supabase manual backup operator checklist runbook exists.
- Operator prerequisites, pre-backup, availability, execution, post-backup, record, failure, restore, and No-Go sections are documented.
- Supabase CLI/API, DB export, restore, backup artifact download, runtime changes, LINE send, OpenAI API, and Nginx/DNS/certbot changes are recorded as not performed.
- Production readiness remains Go.
- Docs do not include obvious secret values.

## Next Loop

If the operator performs the backup externally:

```txt
Loop 194: Supabase manual backup result recording
```

If the operator does not perform the backup yet:

```txt
Loop 194: Supabase non-production restore drill plan
```
