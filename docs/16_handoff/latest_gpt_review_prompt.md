# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names copied from raw logs, SQL statements, object names, TOC bodies, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 218 の staged restore diagnostics plan をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundary が守られているか確認してください。
- Obsidian/dev log/handoff の記録漏れがあれば指摘してください。
- operator sanitized result の扱いが安全か確認してください。
- role placeholder No-Go判断が妥当か確認してください。
- staged restore diagnostics plan が小さく安全に分解されているか確認してください。
- 次Loopを大きなrestore retryにせず、小さいexecution gateに分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名、SQL文、object名、TOC本文、PII、本番ログの提示は求めないでください。
- restore、pg_restore、psql、target DB作成、role作成、Supabase接続、production DB接続、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smoke は Loop 218 では禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 218 staged restore diagnostics plan
- Date: 2026-06-29
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only staged diagnostics plan

## Operator Sanitized Result

- operator_raw_log_review_executed=true
- operator_subcategory_selected=unknown_after_operator_review
- operator_subcategory_confidence=low
- log_exists=true
- log_size_bytes=167
- log_line_count=1
- pg_restore_error_count=1
- pg_restore_fatal_count=1
- pg_restore_warning_count=0
- pg_restore_toc_count=0
- pg_restore_ignored_errors_count=0
- role_does_not_exist_confirmed=false
- owner_required_confirmed=false
- acl_grant_revoke_confirmed=false
- default_privileges_confirmed=false
- policy_owner_confirmed=false
- extension_owner_confirmed=false
- extension_missing_confirmed=false
- schema_or_sql_statement_confirmed=false
- target_cluster_issue_confirmed=false
- raw_log_displayed=false
- matching_line_displayed=false
- role_name_disclosed=false
- sql_statement_disclosed=false
- object_name_disclosed=false

## Decision

- role_placeholder_no_go=true
- Reason: operator selected unknown_after_operator_review, role_does_not_exist_confirmed=false, and no role name may be recorded.
- Next direction: staged restore diagnostics planning.
- Next execution should not be a broad full restore retry.

## Staged Diagnostics Plan

- pre-data only: identify schema/pre-data setup failure.
- data only: identify data-phase failure without row display.
- post-data only: identify post-data/index/constraint/policy/ACL residue.
- schema-only: identify schema-level failure without SQL text display.
- TOC count/section classification: count sections without displaying TOC entries.

## Safety Boundary

- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- role_created=false
- role_modified=false
- diagnostic_log_body_displayed=false
- pg_restore_list_body_displayed=false
- matching_line_displayed=false
- role_name_displayed=false
- sql_statement_displayed=false
- object_name_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- db_url_displayed=false
- secrets_recorded=false
- backup_artifact_copied_into_repo=false
- supabase_connection_executed=false
- production_db_connection_executed=false
- production_restore_executed=false
- line_real_send_executed=false
- openai_api_call_executed=false
- nginx_dns_https_certbot_public_smoke_executed=false
- package_changed=false
- cluster_changed=false
- production_runtime_changed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed
- staged_restore_diagnostics_plan_created=true
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 219: staged restore diagnostics execution gate
---

出力形式:

### レビュー結果
-

### Scope確認
-

### safety確認
-

### Obsidian確認
-

### handoff確認
-

### operator sanitized result確認
-

### role placeholder No-Go判断確認
-

### staged diagnostics plan確認
-

### 次Loop分岐確認
-

### 残リスク
-

### next Loop候補
-
```
