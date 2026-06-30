# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 237 の owner-aligned target DB reprovision and pre-data retry execution をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- target DB作成とpre-data retryが1回だけに収まっているか確認してください。
- raw log / dump content / row content / object名 / SQL文 / role名 / secret / DB URLが記録されていないか確認してください。
- `pg_restore_exit_code=1` かつ `failure_category=pre_data_schema_or_extension_error_detected` を受けて、次Loopを schema/extension remediation gate にする判断が妥当か確認してください。
- DR readinessがまだ `not_ready_restore_failed` のままでよいか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 237 owner-aligned target DB reprovision and pre-data retry execution
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: execution loop
- Push: not performed; push is split to a later push-only Loop

## Listen Safety

- cluster_online=true
- cluster_port=55432
- listen_entry_count=2
- local_cluster_loopback_only=true
- external_interface_listen_detected=false
- wildcard_ipv4_count=0
- wildcard_ipv6_count=0
- non_loopback_count=0

## Artifact Check

- artifact_exists=true
- file_permission=600
- parent_dir_permission=700
- artifact_size=259222
- artifact_checksum_match=true
- backup_artifact_copied_into_repo=false
- dump_content_displayed=false

## Target DB

- target_db_name=amami_line_crm_restore_drill_loop237_20260630
- target_db_exists_before=false
- target_db_created=true
- target_db_exists_after_create=true
- target_db_owner_aligned=true
- target_db_local_only=true
- target_db_is_not_supabase=true
- target_db_is_not_production=true

## Restore Retry

- pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
- pg_restore_version=pg_restore (PostgreSQL) 17.10
- restore_stage=pre_data
- restore_options=--section=pre-data --no-owner --no-privileges
- restore_attempt_count=1
- pg_restore_exit_code=1
- pre_data_retry_status=failed
- failure_category=pre_data_schema_or_extension_error_detected

## Sanitized Classifier

- permission_or_auth_error_detected=false
- permission_or_auth_error_count=0
- schema_or_sql_statement_error_detected=true
- schema_or_sql_statement_error_count=1
- extension_missing_detected=true
- extension_missing_count=2
- role_owner_acl_error_detected=false
- role_owner_acl_error_count=0
- target_cluster_error_detected=false
- target_cluster_error_count=0
- unknown_error_detected=false
- raw_log_displayed=false
- object_names_displayed=false
- sql_displayed=false
- role_names_displayed=false
- row_content_displayed=false

## Cleanup

- restore_target_dropped=true
- target_db_exists_after_drop=false
- cleanup_required=false

## Safety Boundary

- diagnostic_log_repo_external=true
- diagnostic_log_displayed=false
- backup_artifact_copied_into_repo=false
- dump_content_displayed=false
- row_content_displayed=false
- object_names_displayed=false
- sql_displayed=false
- role_names_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false
- push_performed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed_pre_data
- pre_data_retry_status=failed
- dr_readiness_status=not_ready_restore_failed
- data_restore_go=false

## Next Loop Candidate

- Loop 238: pre-data schema extension remediation gate
---

出力形式:

### レビュー結果
-

### Scope確認
-

### execution boundary確認
-

### listen safety確認
-

### artifact safety確認
-

### target DB確認
-

### restore retry確認
-

### sanitized classifier確認
-

### cleanup確認
-

### safety確認
-

### Obsidian確認
-

### handoff確認
-

### DR readiness確認
-

### 残リスク
-

### next Loop候補
-
```
