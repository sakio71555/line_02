# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 246 の operator-only package candidate classifier 結果をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- package名 / extension名 / raw log / SQL文 / object名 / role名が記録されていないか確認してください。
- operator結果が malformed だったため、candidate confidence を unknown とし package_classifier_blocked にした判断が妥当か確認してください。
- 次Loopを package classifier blocked follow-up にする判断が妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 246 operator-only package candidate classifier
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only operator classifier result record

## Loop 245 Baseline

- extension_control_available=false
- package_search_count=106
- package_candidate_maybe_available=true
- package_search_count_broad=true
- package_candidate_confirmed=false
- package_install_no_go=true
- apt_update_no_go=true
- apt_upgrade_no_go=true
- apt_install_no_go=true
- dr_readiness_status=not_ready_restore_failed

## Sanitized Operator Result

- operator_package_classifier_executed=true
- operator_package_classifier_result_valid=false
- package_classifier_input_malformed=true
- operator_extension_identifier_available=true
- operator_extension_identifier_shell_safe=true
- apt_cache_available=true
- package_candidate_count=106
- package_candidate_exact_match_found=unknown
- package_candidate_confidence=unknown
- package_candidate_source_category=unknown
- package_candidate_requires_install=unknown
- package_candidate_requires_apt_update=unknown
- package_candidate_show_reviewed=unknown
- package_candidate_dependency_risk=unknown
- package_candidate_names_disclosed=false
- extension_name_disclosed=false
- package_install_executed=false
- apt_update_executed=false
- apt_upgrade_executed=false

## Compatibility Decision

- compatibility_path=package_classifier_blocked
- selected_next_loop=Loop 247: package classifier blocked follow-up

## Go / No-Go

- read_only_classifier_attempted=true
- operator_result_accepted=false
- package_install_go=false
- apt_update_go=false
- apt_upgrade_go=false
- apt_install_go=false
- restore_retry_go=false
- extension_creation_go=false
- schema_change_go=false
- cluster_change_go=false
- supabase_connection_go=false
- production_db_connection_go=false

## Safety

- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- extension_created=false
- package_installed=false
- package_removed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- apt_install_executed=false
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

- Loop 247: package classifier blocked follow-up
---

出力形式:

### レビュー結果
-

### Scope確認
-

### operator result確認
-

### package classifier確認
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
```
