# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 240 の operator sanitized schema extension result collection をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- raw log / exact SQL / extension名 / object名 / role名が記録されていないか確認してください。
- sanitized resultとして Supabase-related extension category と extension dependency schema category を記録した判断が妥当か確認してください。
- 次Loopを Supabase-specific extension compatibility gate にする判断が妥当か確認してください。
- restore retry / extension creation / package install / schema change をまだNo-Goにしていることが妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 240 operator sanitized schema extension result collection
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only sanitized result record

## Baseline

- permission_or_auth_error_count=0
- role_owner_acl_error_count=0
- schema_or_sql_statement_error_count=1
- extension_missing_count=2
- target_db_dropped=true
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Sanitized Operator Result

- operator_raw_log_review_executed=true
- operator_raw_log_review_scope=loop237_pre_data_diagnostic_log
- operator_raw_log_committed=false
- operator_raw_log_copied_into_repo=false
- raw_content_recorded_in_repo=false
- exact_sql_recorded=false
- extension_name_recorded=false
- object_name_recorded=false
- role_name_recorded=false
- extension_category_known=true
- extension_category_supabase_related=true
- extension_category_standard_postgres=false
- extension_category_optional_observability=false
- extension_category_unknown=false
- schema_error_category=extension_dependency
- schema_error_confidence=high
- permission_or_auth_error_count=0
- role_owner_acl_error_count=0

## Safety Handling

- raw_diagnostic_excerpt_accidentally_shared_in_chat=true
- raw_content_repeated_in_docs=false
- raw_content_committed=false
- exact_sql_recorded=false
- extension_name_recorded=false
- object_name_recorded=false
- role_name_recorded=false

## Selected Next Loop

- selected_next_loop=Loop 241: Supabase-specific extension compatibility gate
- restore_retry_no_go=true
- extension_creation_no_go=true
- package_install_no_go=true
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
- role_modified=false
- cluster_modified=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- raw_log_recorded_in_repo=false
- sql_recorded=false
- extension_name_recorded=false
- object_name_recorded=false
- role_name_recorded=false
- dump_content_displayed=false
- row_content_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 241: Supabase-specific extension compatibility gate
---

出力形式:

### レビュー結果
-

### Scope確認
-

### sanitized result確認
-

### raw content safety確認
-

### Supabase-related extension判断
-

### extension dependency判断
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
