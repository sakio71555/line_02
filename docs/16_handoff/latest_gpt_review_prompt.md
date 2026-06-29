# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 222 の pre-data only restore diagnostic execution をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundary が守られているか確認してください。
- Obsidian/dev log/handoff の記録漏れがあれば指摘してください。
- pre-data diagnostic実行結果の解釈が妥当か確認してください。
- sanitized classifierで `pre_data_permission_error_detected` とした判断が妥当か確認してください。
- target cleanupが十分か確認してください。
- 次Loopをdata/post-dataへ進めず、permission/auth remediation gateに分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名、SQL文、object名、table名、function名、policy名、TOC本文、PII、本番ログの提示は求めないでください。
- Loop 222ではpre-data diagnosticを1回だけ実行済みです。追加restore retry、raw log表示、Supabase/production接続、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smoke は禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 222 pre-data only restore diagnostic execution
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: pre-data only diagnostic execution

## Artifact / Target / Tooling

- artifact_checksum_verified=true
- local_cluster_name=restore_drill_loop2091
- local_cluster_port=55432
- local_cluster_status=online
- fresh_target_db_created=true
- fresh_target_verified_isolated=true
- diagnostic_log_repo_path=false
- diagnostic_log_permission=600
- diagnostic_log_displayed=false
- pg_restore_version=17.10

## Pre-Data Diagnostic Result

- restore_stage=pre_data
- restore_options=--section=pre-data --no-owner --no-privileges
- restore_attempt_count=1
- pg_restore_exit_code=1
- pre_data_diagnostic_status=failed
- failure_category=pre_data_permission_error_detected

## Sanitized Classifier

- role_owner_acl_error_detected=false
- role_owner_acl_error_count=0
- extension_missing_detected=false
- extension_missing_count=0
- object_conflict_detected=false
- object_conflict_count=0
- permission_or_auth_error_detected=true
- permission_or_auth_error_count=1
- schema_or_sql_statement_error_detected=false
- schema_or_sql_statement_error_count=0
- target_cluster_error_detected=false
- target_cluster_error_count=0
- unknown_error_detected=false
- generic_error_count=1
- warning_count=0

## Validation / Cleanup

- sanitized_validation_executed=false
- sanitized_validation_status=not_executed
- row_content_displayed=false
- restore_target_dropped=true
- target_db_exists_after_drop=false
- cleanup_required=false

## Safety Boundary

- diagnostic_log_displayed=false
- toc_body_displayed=false
- object_name_displayed=false
- table_name_displayed=false
- function_name_displayed=false
- policy_name_displayed=false
- sql_statement_displayed=false
- role_name_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- line_real_send_executed=false
- openai_api_call_executed=false
- nginx_dns_https_certbot_public_smoke_executed=false
- package_changed=false
- cluster_changed=false
- production_runtime_changed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed
- toc_count_diagnostic_status=success
- pre_data_diagnostic_status=failed
- failure_category=pre_data_permission_error_detected
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 223: pre-data permission/auth remediation gate
---

出力形式:

### レビュー結果
-

### Scope確認
-

### safety確認
-

### Obsidian確認
-

### handoff確認
-

### pre-data実行結果確認
-

### sanitized classifier確認
-

### cleanup方針確認
-

### 残リスク
-

### next Loop候補
-
```
