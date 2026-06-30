# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 253 の local production start verification checklist execution をレビューしてください。
- API/Adminのlocal-only production start verificationが妥当か確認してください。
- process停止確認、外部接続なし、secret記録なし、production_no_go維持が守られているか確認してください。
- 次Loop候補が classifier retry / payload recollection / protocol fix / restore retry / package install / apt operation / DR fallback plan になっていないか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 253 local production start verification checklist execution
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: local-only production start verification checklist

## Loop 253 Result

- local_production_verification_status=pass
- api_start_script_present=true
- admin_start_script_present=true
- api_production_bind_boundary_checked=true
- admin_production_start_boundary_checked=true
- local_start_without_external_runtime_possible=true
- api_build_status=pass
- admin_build_status=pass
- build_status=pass_api_admin
- api_local_start_status=pass
- api_local_health_check=pass
- admin_local_start_status=pass
- admin_local_login_check=pass
- api_process_stop_check=pass
- admin_process_stop_check=pass
- lint_status=pass
- typecheck_status=pass
- test_status=pass

## Still Separate / Blocked

- supabase_real_runtime_status=blocked_requires_external_runtime_and_operator_env
- line_real_send_status=blocked_requires_separate_approval
- openai_real_api_status=blocked_requires_separate_approval
- production_go_status=blocked_not_requested
- classifier_route_status=frozen
- dr_readiness_status=not_ready_restore_failed
- production_no_go=true

## Safety

- vps_operation_executed=false
- nginx_operation_executed=false
- dns_operation_executed=false
- https_or_certbot_operation_executed=false
- public_smoke_executed=false
- line_real_send_executed=false
- openai_api_executed=false
- supabase_connection_executed=false
- psql_executed=false
- pg_restore_executed=false
- restore_executed=false
- target_db_created=false
- target_db_modified=false
- schema_modified=false
- role_modified=false
- extension_created=false
- cluster_modified=false
- package_install_executed=false
- package_remove_executed=false
- pnpm_install_executed=false
- pnpm_add_executed=false
- apt_operation_executed=false
- env_file_created=false
- env_file_modified=false
- env_file_displayed=false
- secret_recorded=false
- db_url_recorded=false
- raw_log_recorded=false
- dump_content_recorded=false
- row_content_recorded=false
- package_name_recorded=false
- extension_name_recorded=false
- production_runtime_changed=false
- production_go_changed=false

## Next Loop Candidate

- Loop 254: final pre-external-runtime readiness review
---

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. blockedの場合、同じblockerが過去に何回出ているか
3. Codexが提案した次Loop候補を採用するか、却下するか
4. 却下する場合、理由は何か
5. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
6. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。

出力形式:

### レビュー結果
-

### local production verification確認
-

### process停止確認
-

### external runtime / secret safety確認
-

### classifier route freeze確認
-

### DR readiness確認
-

### production_no_go確認
-

### Obsidian確認
-

### handoff確認
-

### 次Loop候補確認
-

### 残リスク
-
```
