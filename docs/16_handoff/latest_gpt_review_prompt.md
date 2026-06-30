# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 250 の strict operator package classifier payload collection をレビューしてください。
- 有効payloadが無いため `operator_payload_absent` でblockedにした判断が妥当か確認してください。
- classifier retryやpackage候補分類に進めていないか確認してください。
- package名 / extension名 / raw output / SQL文 / object名 / role名 / DB URL / secret が記録されていないか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 250 strict operator package classifier payload collection
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only payload presence check and blocked result recording

## Loop 250 Result

- operator_payload_collection_status=blocked
- operator_payload_present=false
- operator_payload_valid=false
- ready_for_classifier_retry=false
- blocked_reason=operator_payload_absent
- codex_generated_payload=false
- payload_inferred_by_codex=false
- classifier_retry_executed=false
- selected_next_loop=Loop 251: strict operator package classifier payload recollection or protocol fix

## Validation Result

- strict_key_value_format_checked=false
- allowed_keys_only_checked=false
- forbidden_content_checked=false
- codex_validation_result=not_run_payload_absent
- operator_payload_recorded_in_docs=false
- normalized_payload_recorded=false

## Safety

- docs_only=true
- classifier_retry_executed=false
- package_candidate_classified=false
- package_candidate_confirmed=false
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
- package_candidate_names_disclosed=false
- extension_name_disclosed=false
- raw_package_output_disclosed=false
- raw_log_displayed=false
- command_output_body_recorded=false
- sql_displayed=false
- object_name_displayed=false
- role_name_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- token_recorded=false
- authorization_header_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false
- production_readiness=production_no_go

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 251: strict operator package classifier payload recollection or protocol fix
---

出力形式:

### レビュー結果
-

### Scope確認
-

### payload absent判定確認
-

### ready_for_classifier_retry確認
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
