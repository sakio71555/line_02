# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 220 の TOC count-only staged restore diagnostic execution をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundary が守られているか確認してください。
- Obsidian/dev log/handoff の記録漏れがあれば指摘してください。
- TOC count-onlyの結果解釈が妥当か確認してください。
- `pre_data_only_restore_diagnostic_gate` を次に選ぶ判断が妥当か確認してください。
- 次Loopを即restore実行にせず、pre-data only gateに分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名、SQL文、object名、table名、function名、policy名、TOC本文、PII、本番ログの提示は求めないでください。
- restore、pg_restore restore、psql、target DB作成、role作成、Supabase接続、production DB接続、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smoke は Loop 220 では禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 220 TOC count-only staged restore diagnostic execution
- Date: 2026-06-29
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: TOC count-only diagnostic execution

## Loop 220 Result Summary

- artifact_checksum_verified=true
- pg_restore_version=17.10
- pg_restore_list_executed=true
- pg_restore_list_exit_code=0
- toc_total_entries_count=462
- toc_pre_data_count=186
- toc_data_count=46
- toc_post_data_count=230
- toc_acl_entries_count=0
- toc_default_acl_entries_count=0
- toc_error_log_error_count=0
- selected_next_stage=pre_data_only_restore_diagnostic_gate
- restore_executed=false
- pg_restore_restore_executed=false
- psql_executed=false
- target_db_created=false
- toc_body_displayed=false
- object_name_displayed=false
- sql_statement_displayed=false
- role_name_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- secrets_recorded=false
- dr_readiness_status=not_ready_restore_failed

## Diagnostic Storage

- toc_diagnostic_dir_permission=700
- toc_file_permission=600
- toc_error_file_permission=600
- toc_file_committed=false
- toc_body_displayed=false
- toc_error_log_displayed=false

## Selected Next Diagnostic Stage

- selected_next_stage=pre_data_only_restore_diagnostic_gate
- selected_next_stage_reason=toc_count_succeeded_and_pre_data_entries_exist
- role_placeholder_selected=false
- same_restore_retry_selected=false
- data_only_selected=false
- post_data_only_selected=false

## Safety Boundary

- restore_executed=false
- pg_restore_restore_executed=false
- pg_restore_list_executed=true
- psql_executed=false
- target_db_created=false
- role_created=false
- role_modified=false
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
- selected_next_stage=pre_data_only_restore_diagnostic_gate
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 221: pre-data only restore diagnostic gate
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

### TOC count結果確認
-

### selected stage確認
-

### 次Loop実行境界確認
-

### 残リスク
-

### next Loop候補
-
```
