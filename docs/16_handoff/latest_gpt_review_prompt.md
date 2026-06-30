# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 239 の operator-only sanitized schema extension classifier をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- operator-only protocol が raw log / matching line / SQL文 / object名 / extension名 / role名を露出しない形になっているか確認してください。
- operator result が pending_operator_input のまま扱われていることが妥当か確認してください。
- 次Loopを operator sanitized schema extension result collection にしている判断が妥当か確認してください。
- restore retry / extension creation / schema change をまだNo-Goにしていることが妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 239 operator-only sanitized schema extension classifier
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only classifier protocol
- Push: not performed in this Loop

## Loop 237 / 238 Result Summary

- loop_237_restore_attempt_count=1
- loop_237_pg_restore_exit_code=1
- loop_237_pre_data_retry_status=failed
- permission_or_auth_error_count=0
- role_owner_acl_error_count=0
- schema_or_sql_statement_error_count=1
- extension_missing_count=2
- target_db_dropped=true
- target_db_exists_after_drop=false
- cleanup_required=false
- loop_238_schema_extension_remediation_gate_created=true
- loop_238_restore_retry_no_go=true
- loop_238_data_restore_no_go=true
- dr_readiness_status=not_ready_restore_failed

## Operator-Only Protocol

- operator_review_scope=loop237_pre_data_diagnostic_log
- codex_may_read_raw_log=false
- chatgpt_may_receive_raw_log=false
- docs_may_record_raw_log=false
- docs_may_record_matching_line=false
- docs_may_record_sql=false
- docs_may_record_object_name=false
- docs_may_record_extension_name=false
- docs_may_record_role_name=false
- docs_may_record_dump_content=false
- docs_may_record_row_content=false

## Operator Result Status

- operator_schema_extension_review_status=pending_operator_input
- operator_sanitized_result_recorded=false
- extension_category_known=false
- schema_error_category=unknown_pending_operator_input
- schema_error_confidence=unknown

## Selected Next Loop

- selected_next_loop=Loop 240: operator sanitized schema extension result collection
- restore_retry_no_go=true
- extension_creation_no_go=true
- schema_change_no_go=true

## Safety

- docs_only=true
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- extension_created=false
- schema_modified=false
- role_created=false
- role_modified=false
- cluster_modified=false
- backup_artifact_touched=false
- diagnostic_log_displayed=false
- diagnostic_log_copied_into_repo=false
- raw_log_displayed=false
- matching_line_displayed=false
- sql_displayed=false
- object_names_displayed=false
- extension_names_displayed=false
- role_names_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false
- push_performed=false

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 240: operator sanitized schema extension result collection
---

出力形式:

### レビュー結果
-

### Scope確認
-

### Loop 237/238結果確認
-

### operator-only protocol確認
-

### sanitized key=value format確認
-

### operator result status確認
-

### selected next Loop確認
-

### Go / No-Go確認
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
