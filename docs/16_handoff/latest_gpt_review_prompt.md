# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 251 の classifier route freeze and DR-production readiness split をレビューしてください。
- Loop 248〜250で同じ operator payload absent blocker が繰り返されたため、classifier route を frozen にした判断が妥当か確認してください。
- DR readiness と app / production readiness を分離できているか確認してください。
- 次Loop候補が payload recollection / protocol fix / classifier retry / blocked follow-up になっていないか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 251 classifier route freeze and DR-production readiness split
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only route freeze and readiness split

## Loop 251 Result

- classifier_route_status=frozen
- classifier_route_frozen_reason=repeated_operator_payload_absent
- operator_payload_present=false
- ready_for_classifier_retry=false
- next_classifier_loop_allowed=false
- classifier_route_resume_condition=human_provided_valid_strict_sanitized_payload
- self_growth_prevention_rule_added=true

## Readiness Split

- dr_readiness_status=not_ready_restore_failed
- classifier_route_status=frozen
- app_readiness_status=separate_review_required
- production_readiness_status=separate_review_required
- production_no_go=true
- production_no_go_reason_scope=must_be_split
- production_go_changed=false

## Safety

- docs_only=true
- operator_payload_recollection_executed=false
- classifier_retry_executed=false
- classifier_protocol_fix_added=false
- classifier_readiness_gate_added=false
- package_candidate_classified=false
- package_candidate_confirmed=false
- package_exploration_executed=false
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
- line_real_send_executed=false
- openai_api_executed=false
- production_runtime_changed=false
- secrets_recorded=false
- db_url_recorded=false
- raw_log_recorded=false
- command_output_body_recorded=false
- package_name_recorded=false
- extension_name_recorded=false
- production_readiness=production_no_go

## Next Loop Candidate

- Loop 252: app production path review without DR blocker coupling
- Secondary candidate: Loop 252 minimum DR fallback plan
---

出力形式:

### レビュー結果
-

### classifier route freeze確認
-

### repeated blocker確認
-

### readiness split確認
-

### production_no_go確認
-

### safety確認
-

### Obsidian確認
-

### handoff確認
-

### DR readiness確認
-

### 次Loop候補確認
-

### 残リスク
-
```
