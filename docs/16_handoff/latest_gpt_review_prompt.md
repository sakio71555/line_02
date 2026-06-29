# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names copied from raw logs, SQL statements, object names, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 217 の operator-only raw log review gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundary が守られているか確認してください。
- Obsidian/dev log/handoff の記録漏れがあれば指摘してください。
- operator-only review protocol が十分に安全か確認してください。
- sanitized key=value format が十分か確認してください。
- 次Loop分岐が小さく安全に分解されているか確認してください。
- 残リスクを整理してください。
- 大きな実装へ進まず、小さいLoopに分解する方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名、SQL文、object名、PII、本番ログの提示は求めないでください。
- restore、pg_restore、psql、target DB作成、role作成、Supabase接続、production DB接続、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smoke は Loop 217 では禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 217 operator-only raw log review gate
- Date: 2026-06-29
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only gate / operator-only review protocol
- Push: not performed by Loop 217

## Source Evidence

- Loop 216 commit: a27cdb7 docs: classify remaining role ACL restore signal
- Loop 216 result: unknown_role_acl_subcategory_detected=true
- Loop 216 result: unknown_role_acl_subcategory_count=1
- Loop 216 result: role_placeholder_signal_detected=false
- Loop 216 result: allowlisted_supabase_role_signal_detected=false
- DR readiness before Loop 217: not_ready_restore_failed

## What Changed

- Added Loop 217 task doc.
- Added Loop 217 Obsidian log.
- Updated restore drill runbook with operator-only protocol, sanitized key=value fields, allowed categories, pending operator result, next Loop branching, and safety boundary.
- Updated DR readiness matrix, verification matrix, dev log, README, docs index, Obsidian navigation, and handoff files.

## Operator-Only Review Protocol

- Codex must not open, display, copy, summarize, or classify raw diagnostic log content in this Loop.
- The operator may inspect the Loop 213 repo-external root-only diagnostic log directly.
- Operator may return only sanitized key=value fields.
- Raw log, matching line, role name, SQL statement, object name, dump content, row content, DB URL, secret, and PII must not be pasted into docs/chat/commits.

## Operator Result Status

- operator_raw_log_review_status=pending_operator_input
- operator_raw_log_review_executed=false
- operator_subcategory_selected=pending
- operator_sanitized_result_recorded=false

## Next Loop Branching

- role_does_not_exist: Loop 218 allowlisted role placeholder preflight without restore
- owner_required / acl_grant_revoke / default_privileges / policy_owner / security_definer_owner: Loop 218 staged restore diagnostics plan
- extension_owner / extension_missing: Loop 218 extension remediation preflight
- schema_or_sql_statement: Loop 218 staged restore diagnostics plan
- target_cluster_issue: Loop 218 local restore target health gate
- other_non_sensitive_category: Loop 218 staged restore diagnostics plan
- unknown_after_operator_review: Loop 218 staged restore diagnostics plan
- pending: wait for operator sanitized result

## Safety Boundary

- restore_retried=false
- pg_restore_restore_executed=false
- psql_executed=false
- target_db_created=false
- role_created=false
- role_modified=false
- diagnostic_log_displayed=false
- diagnostic_log_read_by_codex=false
- diagnostic_log_copied_into_repo=false
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
- production_runtime_changed=false
- push_performed=false

## DR Readiness

- backup_export_status=success
- restore_drill_status=failed
- operator_raw_log_review_status=pending_operator_input
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 218: branch pending operator sanitized result
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

### operator-only review protocol確認
-

### sanitized result format確認
-

### 次Loop分岐確認
-

### 残リスク
-

### next Loop候補
-
```
