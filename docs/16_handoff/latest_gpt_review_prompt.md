# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 235 の restore cluster listen classifier refinement without changes をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- raw listen output / IP詳細 / config全文 / pg_hba / secret / DB URL / raw logが記録されていないか確認してください。
- category/countだけで `local_cluster_loopback_only=true` とした判断が妥当か確認してください。
- 次Loopを owner-aligned pre-data retry gate resume に戻す判断が妥当か確認してください。
- immediate restoreをNo-Goにしているか確認してください。
- 次Loopも小さく分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 235はread-only inspection plus docs updateです。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 235 restore cluster listen classifier refinement without changes
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: read-only inspection plus docs update

## Read-Only Inspection Result

- pg_lsclusters_checked=true
- target_cluster_found=true
- cluster_online=true
- cluster_port=55432
- ss_checked=true
- netstat_checked=false
- listen_entry_count=2
- loopback_ipv4_count=2
- loopback_ipv6_count=0
- wildcard_ipv4_count=0
- wildcard_ipv6_count=0
- non_loopback_count=0
- unknown_listen_count=0
- external_interface_listen_detected=false
- local_cluster_loopback_only=true

## Config Key Classification

- listen_addresses_configured=true
- listen_addresses_category=localhost_or_loopback
- port_key_present=true
- port_configured=55432
- unix_socket_directories_configured=true

## Refined Classifier Result

- listen_classifier_refined=true
- classifier_false_positive_likely=true
- confirmed_external_listen=false
- loop_233_external_listen_result_reclassified=true

## Selected Next Loop

- selected_next_loop=Loop 236: owner-aligned pre-data retry gate resume
- selected_next_loop_reason=restore_cluster_listen_scope_reclassified_loopback_only

## Go / No-Go

- go_for_loop_236_gate_resume=true
- immediate_restore_no_go=true
- immediate_restore_no_go_reason=owner_aligned_target_db_was_dropped_and_restore_drill_not_ready

## Safety Boundary

- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- role_created=false
- role_modified=false
- cluster_modified=false
- cluster_reloaded=false
- cluster_restarted=false
- firewall_modified=false
- package_modified=false
- backup_artifact_used=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- raw_listen_output_recorded=false
- db_url_displayed=false
- secrets_recorded=false
- dump_content_displayed=false
- row_content_displayed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=blocked_until_retry_gate_resume
- local_cluster_loopback_only=true
- external_interface_listen_detected=false
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 236: owner-aligned pre-data retry gate resume
---

出力形式:

### レビュー結果
-

### Scope確認
-

### listen classifier確認
-

### config key確認
-

### refined classifier判断確認
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
