# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed / rolled_back のどれか
2. blockedの場合、同じblockerが過去に何回出ているか
3. Codexが提案した次Loop候補を採用するか、却下するか
4. 却下する場合、理由は何か
5. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
6. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。

## Review Target

```txt
loop=Loop 309 unexpected LINE real send disable and safety reset
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=resolved_unexpected_runtime_enabled_state_before_canary
forward_progress_type=runtime_external_send_safety_reset
next_loop_requires_new_operator_input=true
loop_308_status=blocked
line_real_send_unexpected_enabled_detected=true
line_real_send_disable_decision=approved
line_real_send_disable_status=disabled_successfully
line_real_send_disable_attempted=true
line_real_send_disabled_after_loop=true
line_real_send_currently_enabled_after_loop=false
runtime_config_changed_in_loop_309=true
runtime_config_change_scope=line_real_send_disable_only
api_app_service_restart_executed=true
admin_app_service_restart_executed=false
post_disable_smoke_status=pass
line_canary_send_attempted_in_loop_309=false
line_real_send_executed_in_loop_309=false
line_retry_executed=false
line_bulk_multicast_broadcast_executed=false
openai_api_executed=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 310: operator-side LINE canary execution with hidden inputs
loop_310_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 309 resolved the unexpected current real-send enabled state before any canary.
- Confirm that only the LINE real-send disable runtime flag changed and only the API app service restarted.
- Confirm that no LINE send, retry, bulk/multicast/broadcast, OpenAI call, DB/Supabase/restore action, Nginx reload/restart, DNS/HTTPS/certbot, package operation, daemon reload, or reboot occurred.
- Confirm that production Go scope stayed `line_api_admin_current_runtime` and DR restore route stayed `frozen_known_risk`.
- Decide whether Loop 310 should proceed to an operator-side canary with hidden inputs, or whether another human review is needed.
- Do not generate a Loop 310 Codex prompt until the user explicitly asks for it.

## Safety Boundary

```txt
line_real_send_executed=false
line_canary_send_attempted=false
line_retry_executed=false
line_bulk_multicast_broadcast_executed=false
openai_api_executed=false
production_db_direct_connection_executed=false
production_db_manual_change_performed=false
production_db_change_performed=false
supabase_connection_attempted=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
runtime_code_changed=false
nginx_reload_executed=false
nginx_restart_executed=false
dns_https_certbot_executed=false
package_operation_executed=false
daemon_reload_executed=false
reboot_executed=false
raw_log_recorded=false
secret_recorded=false
env_value_recorded=false
line_identifier_recorded=false
message_body_recorded=false
raw_response_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
```
