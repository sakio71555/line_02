# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 236 の owner-aligned pre-data retry gate resume をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- Loop 235のlisten確認を受けて、Loop 233 blockerをclassifier false positive寄りとした判断が妥当か確認してください。
- target DBが現在absentで、Loop 237でfresh disposable target DB再作成から始める方針が妥当か確認してください。
- Loop 237でreprovision + pre-data retryを1つの小Loopにまとめ、pushを分離する境界が妥当か確認してください。
- raw log / dump content / row content / object名 / SQL文 / role名 / secret / DB URLが記録されていないか確認してください。
- 次Loopも小さく分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 236はdocs-only gateです。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 236 owner-aligned pre-data retry gate resume
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only gate

## Loop 235 Result

- loop235_listen_scope_confirmed=true
- local_cluster_loopback_only=true
- external_interface_listen_detected=false
- listen_entry_count=2
- loopback_ipv4_count=2
- wildcard_ipv4_count=0
- wildcard_ipv6_count=0
- non_loopback_count=0
- listen_addresses_category=localhost_or_loopback
- classifier_false_positive_likely=true

## Loop 233 Blocker Re-Evaluation

- loop233_restore_attempt_count=0
- loop233_pg_restore_exit_code=not_executed
- loop233_blocker_false_positive_likely=true
- confirmed_external_listen=false
- retry_gate_can_resume=true
- immediate_restore_allowed=false

## Target DB Current State

- target_db_currently_absent=true
- target_db_exists_after_drop=false
- cleanup_required=false
- prior_target_db_name=amami_line_crm_restore_drill_loop231_20260630
- next_target_db_candidate=amami_line_crm_restore_drill_loop237_20260630

## Selected Next Loop

- selected_next_loop=Loop 237: owner-aligned target DB reprovision and pre-data retry execution
- selected_next_loop_reason=loop235_loopback_confirmed_and_loop233_target_db_dropped
- loop237_restore_attempt_limit=1
- loop237_push_split_required=true
- loop237_pre_data_retry_options=--section=pre-data --no-owner --no-privileges

## Safety Boundary

- docs_only=true
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- role_created=false
- role_modified=false
- cluster_modified=false
- cluster_restarted=false
- cluster_reloaded=false
- backup_artifact_used=false
- backup_artifact_copied_into_repo=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- dump_content_displayed=false
- row_content_displayed=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=gate_resumed_pending_loop237
- target_db_currently_absent=true
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 237: owner-aligned target DB reprovision and pre-data retry execution
---

出力形式:

### レビュー結果
-

### Scope確認
-

### Loop 235結果確認
-

### Loop 233 blocker再評価確認
-

### target DB現状確認
-

### Loop 237境界確認
-

### Go / No-Go確認
-

### cleanup方針確認
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
