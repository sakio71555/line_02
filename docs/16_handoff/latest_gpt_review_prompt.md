# Latest GPT Review Prompt

Copy the block below into ChatGPT. It already includes the sanitized latest Codex result from `latest_codex_result.md`.

Do not paste or request secrets, DB URLs, API keys, `.env` values, LINE userIds, raw logs, diagnostic logs, dump contents, row contents, PII, credentials, role names, SQL statements, object names, table names, function names, policy names, extension names, package names, TOC bodies, raw listen output, public/private IP details, config full content, `pg_hba` content, or production logs.

```text
まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

以下は amami-line-crm の最新Codex Loop結果です。

目的:
- Loop 255 の final external runtime approval request pack and staged execution plan をレビューしてください。
- operatorが次に何を承認すればよいか、1つの次Loopに絞れているか確認してください。
- production_no_go、external_runtime_execution_allowed=false、DR not ready、classifier route frozen、secret/raw log非記録が守られているか確認してください。

レビュー時の注意:
- secret、DB URL、API key、.env値、LINE userId、raw log、diagnostic log、dump内容、row content、role名詳細、SQL文、object名、table名、function名、policy名、extension名、package名、TOC本文、raw listen output、public/private IP詳細、config全文、pg_hba全文、PII、本番ログの提示は求めないでください。
- ChatGPTの指摘は、そのまま実行せず次Loop候補として整理してください。

貼り付けるCodex結果:

---
# Latest Codex Result

## Loop

- Loop: Loop 255 final external runtime approval request pack and staged execution plan
- Date: 2026-06-30
- Work folder: /Users/sakio/Desktop/PROJECT/amami-line-crm
- Scope type: docs-only operator approval request pack

## Loop 255 Result

- final_external_runtime_approval_request_pack_completed=true
- staged_external_runtime_execution_plan_created=true
- operator_permission_matrix_created=true
- operator_input_category_matrix_created=true
- go_no_go_matrix_finalized=true
- rollback_owner_and_stop_conditions_documented=true
- production_no_go=true
- production_go_changed=false
- external_runtime_execution_allowed=false
- next_loop_requires_explicit_operator_approval=true
- dr_readiness_status=not_ready_restore_failed
- classifier_route_status=frozen
- next_minimal_action=Loop 256 operator env injection dry-run checklist

## Operator Approval Pack Summary

- Current local evidence is pass.
- External runtime remains approval-required.
- Operator must choose one next category.
- Approval options are category-only.
- Secret values and raw outputs are not safe to record.
- Missing repeated input becomes human_input_required, not more prep loops.

## Go / No-Go Summary

- local_app_go_conditions=pass
- operator_approval_go_conditions=approval_required
- external_runtime_go_conditions=not_allowed_in_loop_255
- env_injection_go_conditions=dry_run_checklist_required
- vps_go_conditions=approval_required
- nginx_dns_https_go_conditions=approval_required
- line_openai_go_conditions=approval_required
- supabase_go_conditions=approval_required
- public_smoke_go_conditions=approval_required
- rollback_go_conditions=owner_required
- production_go_conditions=not_requested
- dr_known_risk_conditions=not_ready_restore_failed
- classifier_route_frozen_conditions=frozen
- no_go_conditions=active

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
- db_changed=false
- schema_changed=false
- role_changed=false
- extension_created=false
- cluster_changed=false
- package_operation_executed=false
- apt_operation_executed=false
- env_file_created=false
- env_file_modified=false
- env_file_displayed=false
- secret_recorded=false
- db_url_recorded=false
- raw_log_recorded=false
- command_output_body_recorded=false
- sql_recorded=false
- db_object_name_recorded=false
- role_name_recorded=false
- package_name_recorded=false
- extension_name_recorded=false
- production_runtime_changed=false

## Next Loop Candidate

- Loop 256: operator env injection dry-run checklist
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

### approval request pack確認
-

### staged execution plan確認
-

### permission / input matrix確認
-

### Go / No-Go確認
-

### anti-waste guard確認
-

### production_no_go確認
-

### DR readiness確認
-

### classifier route freeze確認
-

### secret / raw log safety確認
-

### 次Loop候補確認
-

### 残リスク
-
```
