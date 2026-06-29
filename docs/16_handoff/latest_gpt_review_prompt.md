# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, TOC bodies, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 219 の staged restore diagnostics execution gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- safety boundary が守られているか確認してください。
- Obsidian/dev log/handoff の記録漏れがあれば指摘してください。
- staged diagnostic候補比較が妥当か確認してください。
- `toc_count_only` を最初に選ぶ判断が妥当か確認してください。
- 次Loop実行境界が安全か確認してください。
- 次Loopを大きなrestore retryにせず、小さいTOC count-only diagnosticに分ける方針でレビューしてください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名、SQL文、object名、table名、function名、policy名、TOC本文、PII、本番ログの提示は求めないでください。
- restore、pg_restore、psql、target DB作成、role作成、Supabase接続、production DB接続、LINE実送信、OpenAI API、Nginx/DNS/HTTPS/certbot/public smoke は Loop 219 では禁止です。
- ChatGPTの指摘は、そのまま実装せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 219 staged restore diagnostics execution gate
- Date: 2026-06-29
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Start git status: main...origin/main
- Scope type: docs-only execution gate

## Loop 218 Result Summary

- operator_subcategory_selected=unknown_after_operator_review
- operator_subcategory_confidence=low
- role_placeholder_no_go=true
- staged_restore_diagnostics_plan_created=true
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- role_created=false
- raw_log_displayed=false
- toc_body_displayed=false
- dr_readiness_status=not_ready_restore_failed

## Candidate Comparison

- TOC count / section count only: selected first because it is lowest-risk and no target DB is required.
- pre-data only: next candidate after TOC structure is known.
- schema-only: later candidate if schema-level failure remains plausible.
- data only: later because it requires prepared schema and strict no-row-output handling.
- post-data only: later because post-data objects can expose sensitive names if boundaries slip.

## Selected Next Diagnostic Stage

- next_stage_selected=true
- selected_next_diagnostic_stage=toc_count_only
- selected_next_diagnostic_stage_reason=lowest_risk_no_target_db_required
- role_placeholder_selected=false
- restore_retry_selected=false

## Next Loop Execution Boundary

- Loop 220: TOC count-only staged restore diagnostic execution
- pg_restore_17_explicit_path_required=true
- bare_pg_restore_allowed=false
- diagnostic_phase=toc_count_only
- diagnostic_attempt_count=1
- target_db_created=false
- target_db_required=false
- raw_stdout_stderr_repo_external_root_only=true
- toc_body_repo_external_root_only=true
- toc_body_displayed=false
- object_name_displayed=false
- table_name_displayed=false
- function_name_displayed=false
- policy_name_displayed=false
- sql_statement_displayed=false
- role_name_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- secrets_recorded=false

## Safety Boundary

- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- role_created=false
- role_modified=false
- diagnostic_log_displayed=false
- toc_body_displayed=false
- object_name_displayed=false
- table_name_displayed=false
- function_name_displayed=false
- policy_name_displayed=false
- sql_statement_displayed=false
- role_name_displayed=false
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
- staged_diagnostics_gate_created=true
- selected_next_diagnostic_stage=toc_count_only
- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 220: TOC count-only staged restore diagnostic execution
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

### staged diagnostic候補比較確認
-

### selected stage確認
-

### 次Loop実行境界確認
-

### 残リスク
-

### next Loop候補
-
```
