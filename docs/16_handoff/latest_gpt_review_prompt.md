# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 245 の Supabase extension package risk gate をレビューしてください。
- Scope外の作業が混ざっていないか確認してください。
- extension名 / package名 / raw log / SQL文 / object名 / role名が記録されていないか確認してください。
- package_search_count=106 を導入候補確定ではなく broad count として扱い、package installをNo-Goにした判断が妥当か確認してください。
- 次Loopを operator-only package candidate classifier にする判断が妥当か確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 245 Supabase extension package risk gate
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only package risk gate

## Baseline

- operator_extension_identifier_available=true
- operator_extension_identifier_shell_safe=true
- extension_control_available=false
- package_search_count=106
- package_candidate_maybe_available=true
- compatibility_preflight_status=completed
- compatibility_path=package_preflight_required
- dr_readiness_status=not_ready_restore_failed

## Risk Gate Result

- package_candidate_misidentification_risk=true
- package_search_count_broad=true
- package_candidate_confirmed=false
- package_install_risk=true
- package_dependency_risk=true
- extension_creation_success_unproven=true
- supabase_extension_full_local_reproduction_unproven=true
- package_install_no_go=true
- apt_update_no_go=true
- apt_upgrade_no_go=true
- apt_install_no_go=true

## Remediation Candidate Comparison

- candidate_a_operator_only_package_candidate_classifier=recommended
- candidate_b_package_install_risk_plan=later
- candidate_c_local_extension_unavailable_decision_gate=conditional
- candidate_d_immediate_apt_install=no_go
- candidate_e_immediate_restore_retry=no_go

## Recommended Next Loop

- selected_next_loop=Loop 246: operator-only package candidate classifier

## Safety

- restore_executed=false
- pg_restore_executed=false
- psql_executed=false
- target_db_created=false
- target_db_modified=false
- extension_created=false
- package_installed=false
- apt_update_executed=false
- apt_upgrade_executed=false
- apt_install_executed=false
- schema_modified=false
- role_modified=false
- cluster_modified=false
- cluster_restarted=false
- cluster_reloaded=false
- diagnostic_log_displayed=false
- raw_log_displayed=false
- sql_displayed=false
- extension_name_displayed=false
- package_name_displayed=false
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

- Loop 246: operator-only package candidate classifier
---

出力形式:

### レビュー結果
-

### Scope確認
-

### package risk確認
-

### remediation候補確認
-

### selected next Loop確認
-

### Loop 246境界確認
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
```
