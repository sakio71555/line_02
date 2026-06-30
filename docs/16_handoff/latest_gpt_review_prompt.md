# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 242 の Supabase extension local compatibility preflight をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- extension名 / raw log / SQL文 / object名 / role名が記録されていないか確認してください。
- operator extension identifierが未設定だったため compatibility_preflight_status=blocked とした判断が妥当か確認してください。
- 次Loopを operator extension identifier collection にする判断が妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 242 Supabase extension local compatibility preflight
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: read-only compatibility preflight

## Baseline

- extension_category_supabase_related=true
- schema_error_category=extension_dependency
- schema_error_confidence=high
- target_db_currently_absent=true
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Read-Only Result

- pg_lsclusters_checked=true
- target_cluster_found=true
- cluster_online=true
- cluster_port=55432
- pg_config_available=true
- postgres_major_version=17
- pg_sharedir_detected=true
- operator_extension_identifier_available=false
- extension_control_available=unknown
- extension_control_path_exists=unknown
- extension_control_permission=unknown
- apt_cache_available=true
- package_search_count=unknown
- package_candidate_maybe_available=unknown
- compatibility_preflight_status=blocked
- compatibility_path=blocked_missing_operator_extension_identifier

## Compatibility Decision

- local_control_available=unknown
- package_candidate_maybe_available=unknown
- selected_next_loop=Loop 243: operator extension identifier collection
- selected_next_loop_reason=collect_identifier_safely_before_control_or_package_preflight

## Safety

- read_only_inspection=true
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- extension_created=false
- package_installed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- schema_modified=false
- role_modified=false
- cluster_modified=false
- cluster_restarted=false
- cluster_reloaded=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- sql_displayed=false
- extension_name_displayed=false
- object_name_displayed=false
- role_name_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- backup_artifact_touched=false
- db_url_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 243: operator extension identifier collection
---

出力形式:

### レビュー結果
-

### Scope確認
-

### read-only preflight確認
-

### extension identifier safety確認
-

### compatibility判定確認
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
