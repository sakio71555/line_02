# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 231 の owner-aligned target DB provisioning execution をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- target DB作成だけに絞れているか確認してください。
- restore / pg_restore / backup artifact / Supabase / production / role変更 / cluster変更が実行されていないか確認してください。
- owner alignment、retention/cleanup、次Loop分離が妥当か確認してください。
- Obsidian/dev log/handoff/matrixの記録漏れがあれば指摘してください。
- 大きな実行へ進まず小さいLoopに分解する方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 231ではlocal metadata確認のためのpsqlは使っていますが、row content表示やschema/object/role詳細列挙はしていません。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 231 owner-aligned target DB provisioning execution
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: local restore drill target DB provisioning execution

## Local Cluster Confirmation

- cluster_row_found=true
- cluster_version_matches=true
- cluster_name_matches=true
- cluster_port_matches_55432=true
- cluster_online=true
- listen_scope_checked=true
- listen_entry_count=2
- loopback_listen_count=2
- wildcard_listen_count=0
- non_loopback_listen_count=0
- local_cluster_loopback_only=true
- external_interface_listen_detected=false

## Existing DB Check

- target_db_candidate=amami_line_crm_restore_drill_loop231_20260630
- target_db_name_contains_restore_drill=true
- target_db_name_contains_loop231=true
- target_db_exists_before=false

## Target DB Provisioning Result

- target_db_created=true
- target_db_exists_after_create=true
- target_db_owner_aligned=true
- future_restore_execution_user_matches_owner=true
- target_db_local_only=true
- target_db_connection_metadata_check=passed
- provisioning_status=success

## Retention / Cleanup

- target_db_retained=true
- target_db_restricted=true_by_loopback_cluster
- cleanup_required=true
- cleanup_reason=retained_for_next_pre_data_retry
- cleanup_deadline=after_loop232_or_before_2026-07-01

## Selected Next Loop

- selected_next_loop=Loop 232: owner-aligned pre-data restore retry gate
- selected_next_loop_reason=owner_aligned_target_db_ready
- pre_data_retry_gate_ready=true
- restore_retry_executed=false
- dr_readiness_status=not_ready_restore_failed

## Safety Boundary

- restore_executed=false
- pg_restore_executed=false
- backup_artifact_used=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- target_db_created=true
- target_db_modified=true_creation_only
- target_db_other_than_candidate_modified=false
- role_created=false
- role_modified=false
- grant_revoke_executed=false
- alter_role_executed=false
- alter_database_executed=false
- cluster_modified=false
- package_modified=false
- restart_or_reload_executed=false
- firewall_modified=false
- application_runtime_changed=false
- psql_metadata_executed=true
- psql_scope=local_metadata_only
- row_content_displayed=false
- schema_object_details_displayed=false
- role_details_displayed=false
- sql_statement_recorded=false
- db_url_displayed=false
- secrets_recorded=false
- raw_log_displayed=false
- diagnostic_log_displayed=false
- dump_content_displayed=false
- push_performed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed
- owner_aligned_target_db_provisioned=true
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 232: owner-aligned pre-data restore retry gate
---

出力形式:

### レビュー結果
-

### Scope確認
-

### local cluster確認
-

### existing DB check確認
-

### target DB作成確認
-

### owner alignment確認
-

### retention / cleanup確認
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
