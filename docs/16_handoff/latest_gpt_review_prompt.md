# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 252 の app production path review and readiness cleanup をレビューしてください。
- classifier / package / restore route が frozen のまま維持されているか確認してください。
- DR readiness と app production path readiness が分離されているか確認してください。
- production_no_go の理由がDRだけに寄っておらず、外部runtime/secret、local verification、operator decisionへ分割されているか確認してください。
- 次Loop候補が classifier retry / payload recollection / protocol fix / restore retry / package install / apt operation / DR fallback plan になっていないか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 252 app production path review and readiness cleanup
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only app production path review and readiness cleanup

## Loop 252 Result

- loop_252_status=complete
- classifier_route_status=frozen
- next_classifier_loop_allowed=false
- dr_readiness_status=not_ready_restore_failed
- app_production_path_review_completed=true
- app_readiness_status=separate_review_completed
- production_readiness_status=production_no_go_reason_split
- production_no_go=true
- production_no_go_reason_scope=split
- selected_readiness_cleanup_count=3
- local_code_or_test_cleanup_count=0

## Production No-Go Reason Split

- production_no_go_dr_reason=restore_drill_not_successful
- production_no_go_classifier_reason=classifier_route_frozen_repeated_operator_payload_absent
- production_no_go_external_runtime_reason=real_supabase_line_openai_auth_context_requires_separate_approved_verification
- production_no_go_local_docs_test_reason=local_production_start_verification_not_yet_executed
- production_no_go_operator_decision_reason=final_go_not_requested_in_this_loop

## Safety

- docs_only=true
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
- package_operation_executed=false
- production_runtime_changed=false
- secrets_recorded=false
- db_url_recorded=false
- raw_log_recorded=false
- dump_content_recorded=false
- row_content_recorded=false
- package_name_recorded=false
- extension_name_recorded=false
- production_readiness=production_no_go

## Next Loop Candidate

- Loop 253: local production start verification checklist execution
- Reason: proves the app start path locally without external runtime or DR restore coupling.
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

### classifier route freeze確認
-

### readiness split確認
-

### production_no_go確認
-

### app production path確認
-

### cleanup batch確認
-

### safety確認
-

### Obsidian確認
-

### handoff確認
-

### DR readiness確認
-

### 次Loop候補確認
-

### 残リスク
-
```
