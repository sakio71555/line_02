# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 254 の final pre-external-runtime readiness review をレビューしてください。
- Loop 253のlocal app passを前提に、外部runtimeへ進む前のoperator approval packが十分か確認してください。
- production_no_go、DR not ready、classifier route frozen、secret/raw log非記録が守られているか確認してください。
- 次Loop候補が実行Loopではなく、approval request packに限定されているか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 254 final pre-external-runtime readiness review
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only readiness review and operator approval pack

## Loop 254 Result

- final_pre_external_runtime_review_completed=true
- local_app_readiness_status=pass
- external_runtime_readiness_status=operator_approval_required
- operator_approval_pack_created=true
- production_no_go=true
- production_go_changed=false
- dr_readiness_status=not_ready_restore_failed
- classifier_route_status=frozen
- next_minimal_action=Loop 255 final external runtime approval request pack

## External Runtime Areas Reviewed

- VPS deployment: operator_approval_required
- Nginx: operator_approval_required
- DNS: operator_approval_required
- HTTPS/certbot: operator_approval_required
- public smoke: operator_approval_required
- LINE runtime: operator_approval_required
- OpenAI runtime: operator_approval_required
- Supabase runtime: operator_approval_required
- operator env injection: operator_input_required
- rollback: review_required_before_execution
- No-Go checklist: reviewed_docs_only
- final operator handoff: approval_pack_created
- monitoring/ops checks: review_required_before_execution
- DR known risk: not_ready_restore_failed
- classifier route: frozen

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

## Next Loop Candidate

- Loop 255: final external runtime approval request pack
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

### local app readiness確認
-

### external runtime readiness確認
-

### operator approval pack確認
-

### production_no_go確認
-

### DR readiness確認
-

### classifier route freeze確認
-

### secret / raw log safety確認
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
