# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 232 の owner-aligned pre-data restore retry gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- restore / pg_restore / psql / target DB変更 / role変更 / cluster変更が実行されていないか確認してください。
- Loop 233で許可する境界が、pre-data 1回だけに絞られているか確認してください。
- cleanup_required=true のtarget DBをどう扱うかが明確か確認してください。
- Obsidian/dev log/handoff/matrixの記録漏れがあれば指摘してください。
- 大きな実行へ進まず小さいLoopに分解する方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 232はdocs-only gateです。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 232 owner-aligned pre-data restore retry gate
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only restore retry gate

## Loop 231 Result Summary

- target_cluster=17/restore_drill_loop2091
- target_cluster_port=55432
- local_cluster_loopback_only=true
- external_interface_listen_detected=false
- target_db=amami_line_crm_restore_drill_loop231_20260630
- target_db_exists_after_create=true
- target_db_owner_aligned=true
- future_restore_execution_user_matches_owner=true
- target_db_local_only=true
- target_db_retained=true
- target_db_restricted=true_by_loopback_cluster
- cleanup_required=true
- cleanup_deadline=after_loop232_or_before_2026-07-01
- restore_executed=false
- pg_restore_executed=false
- backup_artifact_used=false
- supabase_connection_executed=false
- production_restore_executed=false

## Pre-Data Retry Execution Boundary

- selected_next_loop=Loop 233: owner-aligned pre-data restore retry execution
- target_db_reuse_allowed=true
- target_db_name_required=amami_line_crm_restore_drill_loop231_20260630
- target_db_must_exist_before_retry=true
- target_db_owner_alignment_recheck_required=true
- local_cluster_loopback_recheck_required=true
- artifact_metadata_recheck_required=true
- artifact_checksum_recheck_required=true
- pg_restore_17_explicit_path_required=true
- pg_restore_options=--section=pre-data --no-owner --no-privileges
- restore_attempt_limit=1
- raw_log_destination=repo_external_root_only
- docs_recording=sanitized_metadata_only

## Cleanup Policy

- cleanup_policy_created=true
- target_db_drop_after_retry_default=true
- target_db_retain_after_retry_allowed=false_unless_next_gate_approves
- target_db_drop_on_failed_preflight=true
- target_db_drop_on_failed_owner_alignment=true
- target_db_drop_on_restore_attempt_complete=true
- cleanup_required_until_drop=true

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
- backup_artifact_used=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- db_url_displayed=false
- secrets_recorded=false
- raw_log_displayed=false
- diagnostic_log_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- owner_aligned_pre_data_retry_gate_created=true
- next_loop_selected=true

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed
- owner_aligned_target_db_provisioned=true
- owner_aligned_pre_data_retry_gate_created=true
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 233: owner-aligned pre-data restore retry execution
---

出力形式:

### レビュー結果
-

### Scope確認
-

### Loop 231結果確認
-

### pre-data retry実行境界確認
-

### cleanup方針確認
-

### Go/No-Go確認
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
