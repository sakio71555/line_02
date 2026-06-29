# Supabase Manual Backup Operator Checklist

## 1. Purpose

Provide a safe operator checklist for confirming, performing, and recording a Supabase manual or managed backup without exposing secrets or backup contents.

This runbook is for the operator. Codex does not operate the Supabase dashboard, call Supabase CLI/API, export the database, download artifacts, or restore data in this Loop.

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

Current read-only safety check:

```txt
api_direct_8788_health_status=200
https_api_health_status=200
https_admin_root_status=200
https_admin_customers_status=200
https_admin_api_no_header_customers_status=401
https_line_invalid_signature_status=401
```

## 3. Non-Goals for This Loop

- No Supabase dashboard operation by Codex.
- No Supabase CLI/API call.
- No database export.
- No database restore.
- No backup archive creation/download/upload.
- No backup artifact committed to repo.
- No migration, RLS, schema, or runtime change.
- No LINE send.
- No OpenAI API call.
- No Nginx/DNS/certbot change.

## 4. Operator Prerequisites

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

## 5. Pre-Backup Checklist

Before checking or performing a backup, confirm:

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

## 6. Manual / Managed Backup Availability Check

Operator checks the current Supabase project and plan:

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

Availability record:

```txt
backup_availability_checked=true/false
manual_backup_available=true/false/operator_unknown
managed_backup_available=true/false/operator_unknown
retention_visibility=true/false/operator_unknown
restore_option_visible=true/false/operator_unknown
project_confirmed_by_operator=true/false
secrets_recorded=false
```

## 7. Backup Execution Checklist for Operator

Only the operator performs these steps, and only if No-Go conditions are false:

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

## 8. Post-Backup Verification Checklist

```txt
post_backup_verification:
- Confirm backup status is succeeded, if visible
- Confirm artifact/storage location is secure, if downloaded
- Confirm no secrets were copied into repo/docs/chat
- Confirm no production restore was performed
- Confirm application health remains green
- Confirm next step is non-production restore drill planning
```

## 9. Backup Record Template

Use this template only after the operator has performed the backup externally.

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

Do not attach backup files, dump contents, screenshots containing values, or raw provider logs.

## 10. Failure Record Template

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

## 11. Secret Handling Policy

Allowed to record:

```txt
Supabase configured; values not recorded
manual_backup_operator_checklist=created
Supabase CLI/API called=false
DB export performed=false
restore performed=false
backup artifact downloaded=false
secrets_recorded=false
```

Never record:

- Provider endpoint values, project references, keys, DB connection values, or access tokens.
- `.env` contents or runtime secret file contents.
- Raw database dumps or backup archive contents.
- LINE webhook suffixes, user identifiers, reply tokens, or message bodies.
- OpenAI key, model value, prompts, responses, or provider output.
- Authorization bearer tokens or private keys.

## 12. Restore Drill Policy

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

## 13. No-Go Conditions

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

Stop immediately if any No-Go condition is true.

## 14. Future Loop Split

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

## 15. Loop 193 Result

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

## 16. Loop 194 Result Recording Follow-up

Loop 194 attempted to record a Supabase manual backup result, but no operator-provided sanitized result was included. It therefore remains pending and does not mark a backup as succeeded.

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

Next action: operator performs or confirms Supabase manual/managed backup using this checklist, then provides a sanitized result for recording.

## 17. Loop 194.1 Free Plan Limitation Availability Result

The operator checked availability and found that dashboard/manual/managed project backups are not available on the current Free Plan.

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
backup_artifact_uploaded_to_chat=false
restore_performed=false
Supabase CLI/API called by Codex=false
DB export performed by Codex=false
secrets_recorded=false
runtime_changes_performed=false
backup_success_recorded=false
production readiness: Go
```

Next action: decide the backup path after Free Plan limitation.
