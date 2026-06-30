# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 233 の owner-aligned pre-data restore retry execution をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- artifact/target DB/pg_restore path確認は妥当か確認してください。
- local_cluster_loopback_only=false によりpre-data retryを実行しなかった判断が妥当か確認してください。
- target DBをdropして cleanup_required=false にした判断が妥当か確認してください。
- raw log / dump内容 / row content / secret / DB URLが記録されていないか確認してください。
- 次Loopを小さく分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 233ではpreflightでblockedになったため、restore attempt countは0です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 233 owner-aligned pre-data restore retry execution
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: restore retry preflight and cleanup execution

## Artifact Check

- artifact_exists=true
- artifact_file_permission=600
- artifact_parent_dir_permission=700
- artifact_size=259222
- artifact_size_match=true
- artifact_checksum_match=true
- backup_artifact_copied_into_repo=false
- dump_content_displayed=false

## Target DB Check

- target_db_name=amami_line_crm_restore_drill_loop231_20260630
- target_db_name_contains_restore_drill=true
- target_db_name_contains_loop231=true
- target_db_exists=true
- target_db_owner_aligned=true
- future_restore_execution_user_matches_owner=true
- target_db_is_not_supabase=true
- target_db_is_not_production=true

## Cluster Listen Preflight

- cluster_row_found=true
- cluster_online=true
- cluster_port_matches_55432=true
- listen_entry_count=2
- loopback_listen_count=1
- wildcard_listen_count=0
- non_loopback_listen_count=1
- local_cluster_loopback_only=false
- external_interface_listen_detected=true
- precheck_ok=false

## pg_restore Boundary

- pg_restore_path=/usr/lib/postgresql/17/bin/pg_restore
- pg_restore_path_present=true
- pg_restore_version=17.10-1.pgdg24.04+1
- restore_stage=pre_data
- owner_aligned_target_used=true
- restore_options_pre_data_no_owner_no_privileges=false
- restore_attempt_count=0
- pg_restore_exit_code=not_executed
- pre_data_retry_status=blocked

## Cleanup

- restore_target_dropped=true
- target_db_exists_after_drop=false
- cleanup_status=success
- cleanup_required=false

## Safety Boundary

- restore_executed=false
- pg_restore_restore_executed=false
- psql_scope=local_metadata_and_cleanup_only
- target_db_created=false
- target_db_modified=true_drop_only
- target_db_other_than_candidate_modified=false
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
- object_name_displayed=false
- sql_statement_displayed=false
- role_name_displayed=false
- production_runtime_changed=false
- push_performed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=blocked_preflight
- pre_data_retry_status=blocked
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 234: owner-aligned pre-data retry blocked follow-up
---

出力形式:

### レビュー結果
-

### Scope確認
-

### artifact確認
-

### target DB確認
-

### cluster listen preflight確認
-

### retry未実行判断
-

### cleanup確認
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
