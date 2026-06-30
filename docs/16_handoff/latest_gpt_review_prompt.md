# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 230 の owner-aligned target DB provisioning gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- DB作成前gateとして十分に小さく分かれているか確認してください。
- Loop 231でtarget DB作成だけに絞る境界が妥当か確認してください。
- owner alignment、cleanup/rollback、Go/No-Go、safety boundaryが妥当か確認してください。
- Obsidian/dev log/handoff/matrixの記録漏れがあれば指摘してください。
- 大きな実行へ進まず小さいLoopに分解する方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 230ではDB作成、psql、restore、pg_restore、target DB変更、role作成/変更、cluster変更、Supabase/production接続、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smokeは禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 230 owner-aligned target DB provisioning gate
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only restore drill provisioning gate

## Loop 229 Result Summary

- target_cluster_version=17
- target_cluster_name=restore_drill_loop2091
- target_cluster_port=55432
- target_cluster_listen_addresses=localhost
- local_cluster_loopback_only=true
- external_interface_listen_detected=false
- rollback_executed=false
- dr_readiness_status=not_ready_restore_failed

## Owner-Aligned Target DB Design

- target_db_design_created=true
- target_db_scope=local_isolated_restore_drill_cluster_only
- target_db_lifecycle=fresh_disposable
- target_db_name_pattern=amami_line_crm_restore_drill_loop231_YYYYMMDD
- target_db_candidate_name=amami_line_crm_restore_drill_loop231_20260630
- target_db_must_include_restore_drill=true
- target_db_must_include_loop231=true
- owner_alignment_required=true
- db_owner_must_equal_restore_execution_user=true
- role_creation_allowed_in_loop231=false
- role_change_allowed_in_loop231=false

## Loop 231 Execution Boundary

Allowed:
- Confirm restore drill cluster identity.
- Confirm loopback-only listen scope with sanitized counts/categories.
- Confirm the planned target DB name is fresh.
- Create one fresh local disposable target DB.
- Confirm target DB identity and owner alignment.
- Record only booleans/counts/categories.

Forbidden:
- Restore or pg_restore.
- Supabase or production DB connection.
- Production restore.
- Role creation or role modification.
- Cluster/package/firewall/config changes.
- Raw logs, DB URL, .env, secret file, dump content, row content, object names, SQL statements, or production logs.

## Cleanup / Rollback Policy

- cleanup_policy_created=true
- target_db_drop_on_failed_identity_check=true
- target_db_drop_on_wrong_owner=true
- target_db_drop_on_unexpected_existing_db=true
- target_db_keep_after_success=true_short_lived_for_next_restore_gate
- restore_retry_still_separate=true

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
- package_modified=false
- firewall_modified=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- db_url_displayed=false
- secrets_recorded=false
- raw_log_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- backup_artifact_copied_into_repo=false
- owner_aligned_target_db_gate_created=true
- next_loop_selected=true

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed
- cluster_loopback_remediation_status=success
- owner_aligned_target_db_gate_created=true
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 231: owner-aligned target DB provisioning execution
---

出力形式:

### レビュー結果
-

### Scope確認
-

### owner-aligned target DB設計確認
-

### Loop 231実行境界確認
-

### cleanup / rollback確認
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
