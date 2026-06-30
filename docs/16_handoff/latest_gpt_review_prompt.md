# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 247 の package classifier blocked follow-up をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- package名 / extension名 / raw log / SQL文 / object名 / role名が記録されていないか確認してください。
- Loop 246のmalformed resultをblockedとして扱い、Loop 248をstrict sanitized key=value retryにした判断が妥当か確認してください。
- validation ruleが、prompt本文・package名・extension名・apt-cache本文・dependency名の混入を防げる設計か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 247 package classifier blocked follow-up
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only blocked follow-up and strict retry protocol

## Loop 246 Result

- operator_extension_identifier_available=true
- operator_extension_identifier_shell_safe=true
- apt_cache_available=true
- package_search_count=106
- package_search_count_broad=true
- operator_package_classifier_result_valid=false
- package_classifier_input_malformed=true
- package_candidate_confidence=unknown
- package_candidate_dependency_risk=unknown
- compatibility_path=package_classifier_blocked
- package_candidate_names_disclosed=false
- extension_name_disclosed=false
- package_install_executed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- apt_install_executed=false

## Strict Sanitized Result Format

- operator_package_classifier_executed=true/false
- operator_package_classifier_result_valid=true/false
- operator_package_review_scope=apt_cache_search_only/apt_cache_search_and_show/none
- package_candidate_count=<number>
- package_candidate_exact_match_found=true/false/unknown
- package_candidate_confidence=high/medium/low/unknown
- package_candidate_source_category=pgdg/ubuntu/third_party/unknown
- package_candidate_dependency_risk=low/medium/high/unknown
- package_candidate_requires_install=true/false/unknown
- package_candidate_requires_apt_update=true/false/unknown
- package_candidate_names_disclosed=false
- extension_name_disclosed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- apt_install_executed=false
- package_install_executed=false
- raw_package_output_disclosed=false

## Validation Rule

- allowed_keys_only_required=true
- package_like_names_allowed=false
- extension_like_names_allowed=false
- prompt_body_allowed=false
- apt_update_executed_must_be_false=true
- apt_upgrade_executed_must_be_false=true
- apt_install_executed_must_be_false=true
- package_install_executed_must_be_false=true
- raw_package_output_disclosed_must_be_false=true
- invalid_result_handling=blocked_without_retry

## Loop 248 Boundary

- selected_next_loop=Loop 248: strict operator-only package candidate classifier retry
- loop_248_operator_only=true
- loop_248_apt_cache_search_show_read_only=true
- package_name_recording_allowed=false
- extension_name_recording_allowed=false
- apt_update_allowed=false
- apt_upgrade_allowed=false
- apt_install_allowed=false
- package_install_allowed=false
- psql_allowed=false
- restore_allowed=false
- pg_restore_allowed=false
- extension_creation_allowed=false
- db_change_allowed=false

## Safety

- apt_cache_executed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- apt_install_executed=false
- package_install_executed=false
- package_removed=false
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- extension_created=false
- schema_modified=false
- role_modified=false
- cluster_modified=false
- cluster_restarted=false
- cluster_reloaded=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- sql_displayed=false
- extension_name_displayed=false
- package_name_displayed=false
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

- Loop 248: strict operator-only package candidate classifier retry
---

出力形式:

### レビュー結果
-

### Scope確認
-

### blocked原因確認
-

### strict format確認
-

### validation rule確認
-

### Loop 248境界確認
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
```
