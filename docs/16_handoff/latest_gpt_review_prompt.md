# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 238 の pre-data schema extension remediation gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- Loop 237でpermission/auth・role/ACL系がcount=0になったため、残課題をschema/extension系に絞った判断が妥当か確認してください。
- 次Loopを operator-only sanitized schema extension classifier にする判断が妥当か確認してください。
- raw log / matching line / SQL文 / object名 / extension名 / role名 / secret / DB URLが記録されていないか確認してください。
- restore retryをまだNo-Goにしていることが妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 238 pre-data schema extension remediation gate
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only gate

## Loop 237 Result Summary

- restore_attempt_count=1
- pg_restore_exit_code=1
- pre_data_retry_status=failed
- permission_or_auth_error_count=0
- role_owner_acl_error_count=0
- schema_or_sql_statement_error_count=1
- extension_missing_count=2
- target_db_dropped=true
- target_db_exists_after_drop=false
- cleanup_required=false
- raw_log_displayed=false
- object_names_displayed=false
- sql_displayed=false
- role_names_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- supabase_connection_executed=false
- production_restore_executed=false

## Re-Evaluation

- loop237_permission_auth_resolved=true
- loop237_role_acl_resolved=true
- owner_aligned_target_db_effective_likely=true
- remaining_failure_area=schema_extension

## Remaining Issues

- extension_missing_count=2
- extension_name_disclosed=false
- extension_category_known=false
- schema_or_sql_statement_error_count=1
- sql_line_disclosed=false
- object_name_disclosed=false
- schema_error_category=unknown
- extension_dependency_possible=true
- independent_schema_ddl_failure_possible=true

## Candidate Comparison

- A. operator-only sanitized schema extension classifier: recommended
- B. extension preflight without restore: later
- C. create standard extensions in fresh target DB: later / gated
- D. exclude extension-related objects or accept missing extension: No-Go for now
- E. retry immediately: No-Go

## Next Loop

- selected_next_loop=Loop 239: operator-only sanitized schema extension classifier
- restore_retry_no_go=true
- data_restore_no_go=true

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
- diagnostic_log_displayed=false
- raw_log_displayed=false
- object_names_displayed=false
- sql_displayed=false
- extension_names_displayed=false
- role_names_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 239: operator-only sanitized schema extension classifier
---

出力形式:

### レビュー結果
-

### Scope確認
-

### Loop 237結果確認
-

### permission/auth・role/ACL再評価
-

### schema / extension残課題確認
-

### remediation候補確認
-

### Loop 239境界確認
-

### Go / No-Go確認
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
