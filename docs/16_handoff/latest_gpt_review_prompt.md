# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 249 の strict operator package classifier input collection をレビューしてください。
- classifier retryを実行せず、input collection protocol / allowed-key template / reject rule / readiness gateだけに留めた判断が妥当か確認してください。
- `ready_for_classifier_retry=false` を維持し、次Loopを payload collection に分離した判断が妥当か確認してください。
- package名 / extension名 / raw output / SQL文 / object名 / role名 / DB URL / secret が記録されていないか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 249 strict operator package classifier input collection
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only input collection protocol and readiness gate

## Baseline

- loop_247_strict_classifier_retry_protocol_created=true
- loop_248_classifier_retry_status=blocked
- loop_248_blocked_reason=operator_sanitized_result_absent
- valid_operator_payload_received=false
- package_install_no_go=true
- apt_update_no_go=true
- apt_upgrade_no_go=true
- apt_install_no_go=true
- restore_retry_no_go=true
- db_change_no_go=true

## Loop 249 Result

- operator_input_collection_protocol_created=true
- operator_input_template_created=true
- reject_rule_created=true
- future_classifier_retry_gate_created=true
- operator_sanitized_payload_collected=false
- ready_for_classifier_retry=false
- not_ready_reason=operator_payload_not_collected_in_docs_only_gate
- selected_next_loop=Loop 250: strict operator package classifier payload collection

## Future Retry Readiness Gate

- operator_sanitized_payload_present_required=true
- strict_key_value_format_required=true
- allowed_keys_only_required=true
- forbidden_content_absent_required=true
- secret_or_db_url_absent_required=true
- raw_log_or_command_output_absent_required=true
- sql_or_object_or_role_absent_required=true
- package_or_extension_identifier_absent_required=true
- codex_validation_pass_required=true
- dangerous_content_recorded_in_docs_required=false

## Safety

- docs_only=true
- classifier_retry_executed=false
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
- sql_displayed=false
- object_name_displayed=false
- role_name_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false
- production_readiness=production_no_go

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 250: strict operator package classifier payload collection
---

出力形式:

### レビュー結果
-

### Scope確認
-

### input collection protocol確認
-

### reject rule確認
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
