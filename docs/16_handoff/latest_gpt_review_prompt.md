# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 248 の strict operator-only package candidate classifier retry をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- operator sanitized result payloadが無いため blocked にした判断が妥当か確認してください。
- 次Loopを input re-collection に分離し、install / restore / DB変更へ進めない判断が妥当か確認してください。
- package名 / extension名 / raw output / SQL文 / object名 / role名 / DB URL / secret が記録されていないか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 248 strict operator-only package candidate classifier retry
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only classifier retry result recording

## Loop 247 Baseline

- strict_classifier_retry_protocol_created=true
- strict_sanitized_key_value_only=true
- allowed_keys_only_required=true
- prompt_body_allowed=false
- package_name_recording_allowed=false
- extension_name_recording_allowed=false
- raw_package_output_disclosed_must_be_false=true
- invalid_result_handling=blocked_without_retry

## Loop 248 Result

- classifier_retry_status=blocked
- classifier_result_valid=false
- blocked_reason=operator_sanitized_result_absent
- operator_sanitized_result_present=false
- strict_key_value_payload_received=false
- allowed_key_validation_executed=false
- package_candidate_confidence=unknown
- package_candidate_dependency_risk=unknown
- compatibility_path=package_classifier_blocked

## Safety

- package_candidate_names_disclosed=false
- extension_name_disclosed=false
- raw_package_output_disclosed=false
- raw_log_displayed=false
- sql_displayed=false
- object_name_displayed=false
- role_name_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- apt_cache_executed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- apt_install_executed=false
- package_install_executed=false
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- extension_created=false
- schema_modified=false
- role_modified=false
- cluster_modified=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false
- production_readiness=production_no_go

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 249: strict operator package classifier input collection
---

出力形式:

### レビュー結果
-

### Scope確認
-

### blocked理由確認
-

### strict protocol確認
-

### input re-collection分離確認
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
