# Supabase Manual Backup Result Recording

## 1. Purpose

Record a Supabase manual or managed backup result after the operator provides a sanitized summary.

This runbook is a result recording template. It does not operate Supabase, export data, restore data, download artifacts, or display secrets.

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

## 3. Operator Result Status

Loop 194 did not receive a sanitized operator backup result.

```txt
manual_backup_result_recording_status=pending
operator_result_received=false
operator_result_required=true
operator_result_sanitized=operator_unknown
backup_status=not_recorded
backup_performed_by_operator=operator_unknown
next_action=operator_to_perform_or_confirm_manual_backup
```

Do not mark the backup as succeeded until the operator provides a sanitized result.

## 4. Backup Availability Result

No availability result was provided.

```txt
backup_availability_checked=operator_unknown
manual_backup_available=operator_unknown
managed_backup_available=operator_unknown
retention_visibility=operator_unknown
restore_option_visible=operator_unknown
project_confirmed_by_operator=operator_unknown
```

Allowed future values are summary-only values such as `true`, `false`, or `operator_unknown`. Do not record project references, URLs, keys, screenshots containing values, or provider logs.

## 5. Backup Execution Result

No backup execution result was provided.

```txt
backup_performed_by_operator=operator_unknown
backup_method=operator_unknown
backup_status=not_recorded
```

Codex did not perform a backup.

## 6. Backup Artifact Handling Result

```txt
backup_artifact_downloaded=operator_unknown
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
backup_artifact_contents_recorded=false
```

Do not attach backup files, dump contents, download URLs, raw filenames that contain sensitive values, screenshots containing values, or provider logs.

## 7. Restore Result

```txt
restore_performed=false
restore performed by Codex=false
production_restore_performed=false
```

Restore remains out of scope. Any restore drill must be non-production first and must be handled in a separate Loop.

## 8. Secret Safety Result

```txt
secrets_recorded=false
Supabase CLI/API called by Codex=false
DB export performed by Codex=false
runtime_changes_performed=false
additional_line_send_performed=false
OpenAI API performed=false
Nginx/DNS/certbot changes=false
```

Never record:

- Supabase endpoint value, project reference, anon key, service role key, DB URL, connection string, or access token.
- Backup artifact content, provider download URL, raw database dump, or archive contents.
- LINE token, channel secret, webhook suffix, user identifier, reply token, or message body.
- OpenAI key, model value, prompt, response, or provider output.
- `.env` contents, bearer token, private key, or runtime secret file contents.

## 9. Production Health After Recording

Read-only health checks after recording:

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

No restart, reload, runtime change, additional LINE send, OpenAI API call, Supabase export/write, backup creation, backup download, restore, Nginx/DNS/certbot change, or secret display was performed.

## 10. Decision

```txt
decision=operator_result_required
manual_backup_result_recording_status=pending
backup_status=not_recorded
next_loop=Operator performs Supabase manual backup using checklist
```

Because no operator result was provided, do not proceed to non-production restore drill yet.

## 11. Next Loop

Immediate next action:

```txt
Loop 194.1: Operator performs Supabase manual backup using checklist
```

After the operator records a sanitized successful backup result:

```txt
Loop 195: Supabase non-production restore drill plan
```

## 12. Loop 194.1 Free Plan Limitation Availability Result

Loop 194.1 records that the operator checked the Supabase dashboard and found the current Free Plan does not include the needed project backups.

```txt
manual_backup_availability_recording_status=complete
operator_result_received=true
operator_result_sanitized=true
backup_availability_checked=true
manual_backup_available=false
managed_backup_available=false
retention_visibility=true
restore_option_visible=true
project_confirmed_by_operator=true
backup_performed_by_operator=false
backup_method=not_performed
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

Next safe step:

```txt
Loop 195: Supabase backup path decision after Free Plan limitation
```

## Result Recording Template for Future Operator Result

Use this only after the operator provides sanitized values.

```txt
operator_result_received=true
operator_result_sanitized=true
backup_availability_checked=true/false
manual_backup_available=true/false/operator_unknown
managed_backup_available=true/false/operator_unknown
retention_visibility=true/false/operator_unknown
restore_option_visible=true/false/operator_unknown
project_confirmed_by_operator=true/false
backup_performed_by_operator=true/false
backup_method=manual_dashboard/managed_backup/operator_unknown
backup_status=succeeded/failed/not_performed/operator_unknown
backup_artifact_downloaded=true/false/operator_unknown
backup_artifact_committed_to_repo=false
backup_artifact_uploaded_to_chat=false
secrets_recorded=false
restore_performed=false
production_runtime_changed=false
```
