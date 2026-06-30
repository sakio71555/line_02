# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 241 の Supabase-specific extension compatibility gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- raw log / exact SQL / extension名 / object名 / role名が記録されていないか確認してください。
- Supabase-related extension dependency に対して、次Loopを read-only local compatibility preflight にする判断が妥当か確認してください。
- extension creation / package install / restore retry / schema change をまだNo-Goにしていることが妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 241 Supabase-specific extension compatibility gate
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only compatibility gate

## Baseline

- extension_category_supabase_related=true
- schema_error_category=extension_dependency
- schema_error_confidence=high
- permission_or_auth_error_count=0
- role_owner_acl_error_count=0
- schema_or_sql_statement_error_count=1
- extension_missing_count=2
- target_db_dropped=true
- target_db_currently_absent=true
- cleanup_required=false
- dr_readiness_status=not_ready_restore_failed

## Compatibility Comparison

- candidate_a_local_isolated_compatible_extension_introduction=later_gated
- candidate_b_supabase_managed_skip_compat=fallback_only
- candidate_c_exclude_extension_dependent_objects=no_go_for_now
- candidate_d_supabase_like_non_production_restore_environment=no_go_without_separate_approval
- candidate_e_immediate_retry=no_go

## Selected Next Loop

- selected_next_loop=Loop 242: Supabase extension local compatibility preflight
- selected_next_loop_reason=read_only_feasibility_check_before_package_or_extension_changes

## Loop 242 Boundary

- read_only_preflight_go=true
- extension_creation_go=false
- package_install_go=false
- restore_retry_go=false
- schema_change_go=false
- supabase_connection_go=false
- production_db_connection_go=false

## Safety

- docs_only=true
- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- extension_created=false
- package_installed=false
- schema_modified=false
- role_modified=false
- cluster_modified=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- sql_displayed=false
- extension_name_displayed=false
- object_name_displayed=false
- role_name_displayed=false
- dump_content_displayed=false
- row_content_displayed=false
- backup_artifact_touched=false
- db_url_displayed=false
- secrets_recorded=false
- supabase_connection_executed=false
- production_restore_executed=false
- production_runtime_changed=false

## DR Readiness

- dr_readiness_status=not_ready_restore_failed

## Next Loop Candidate

- Loop 242: Supabase extension local compatibility preflight
---

出力形式:

### レビュー結果
-

### Scope確認
-

### compatibility方針確認
-

### Supabase-related extension判断
-

### selected next Loop確認
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
