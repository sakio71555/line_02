# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 234 の owner-aligned pre-data retry blocked follow-up をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- Loop 229 / Loop 233 のlisten判定差分整理が妥当か確認してください。
- next Loopを read-only classifier refinement に絞った判断が妥当か確認してください。
- retry despite blocker をNo-Goにしているか確認してください。
- raw listen output / IP詳細 / config全文 / secret / DB URL / raw logが記録されていないか確認してください。
- 次Loopも小さく分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- Loop 234はdocs-onlyです。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 234 owner-aligned pre-data retry blocked follow-up
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only blocked follow-up

## Loop 229 / Loop 233 Difference

| Item | Loop 229 | Loop 233 |
| --- | --- | --- |
| target cluster | 17/restore_drill_loop2091 | 17/restore_drill_loop2091 |
| port | 55432 | 55432 |
| listen entry count | 2 | 2 |
| loopback listen count | 2 | 1 |
| wildcard listen count | 0 | 0 |
| non-loopback listen count | 0 | 1 |
| local cluster loopback only | true | false |
| external interface listen detected | false | true |
| restore attempted | false | false |

## Candidate Comparison

- candidate_a=listen_classifier_refinement_without_changes
- candidate_a_recommended=true
- candidate_b=force_listen_addresses_127_0_0_1_only_plan
- candidate_b_deferred=true_requires_cluster_change
- candidate_c=unix_socket_only_restore_plan
- candidate_c_deferred=true_changes_connection_method
- candidate_d=firewall_block_supplemental_plan
- candidate_d_deferred=true_not_primary_fix
- candidate_e=owner_aligned_pre_data_retry_despite_blocker
- candidate_e_no_go=true

## Selected Next Loop

- selected_next_loop=Loop 235: restore cluster listen classifier refinement without changes
- selected_next_loop_reason=compare_loop229_and_loop233_classifier_before_remediation

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
- firewall_modified=false
- package_modified=false
- backup_artifact_used=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- dump_content_displayed=false
- row_content_displayed=false
- listen_regression_reviewed=true
- next_loop_selected=true

## DR Readiness

- backup_export_status=success
- restore_drill_status=blocked_preflight
- pre_data_retry_status=blocked
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 235: restore cluster listen classifier refinement without changes
---

出力形式:

### レビュー結果
-

### Scope確認
-

### Loop 229 / 233差分確認
-

### blocker再発候補確認
-

### 推奨方針確認
-

### Loop 235境界確認
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
