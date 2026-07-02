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
loop=Loop 311 LINE canary blocker remediation by operator-controlled canary window
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=converted_hidden_input_blocker_to_operator_controlled_canary_window_tool
forward_progress_type=operator_window_tool_and_result_intake_created
next_loop_requires_new_operator_input=true
loop_310_status=blocked
line_canary_blocker_remediation_status=complete
previous_blocker=line_canary_hidden_inputs_not_provided
previous_blocker_resolution=operator_controlled_canary_window
codex_hidden_input_collection_retired=true
operator_controlled_canary_window_created=true
operator_canary_window_helper_created=true
operator_canary_window_helper_default_mode=no_send
operator_canary_window_helper_sends_line=false
operator_canary_window_helper_handles_recipient_or_message=false
operator_manual_send_path=admin_ui_or_existing_admin_api_staff_reply
operator_send_limit=1
operator_retry_allowed=false
operator_bulk_multicast_broadcast_allowed=false
operator_openai_allowed=false
operator_post_window_disable_required=true
operator_post_window_smoke_required=true
vps_script_delivery_status=success
line_real_send_executed_in_loop_311=false
runtime_config_changed_in_loop_311=false
service_restart_executed_in_loop_311=false
openai_api_executed=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 312: operator-controlled LINE canary window execution result intake
loop_312_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 311 did not attempt another Codex hidden-input collection.
- Confirm that the blocker was converted into an operator-controlled canary window path.
- Confirm that the helper default is no-send and does not handle recipient/message or send LINE by itself.
- Confirm that Loop 311 ran only non-mutating helper checks locally and on VPS.
- Confirm that no LINE send, retry, bulk/multicast/broadcast, OpenAI call, DB/Supabase/restore action, runtime config change, service restart, Nginx reload/restart, DNS/HTTPS/certbot, package operation, daemon reload, or reboot occurred.
- Confirm that production Go scope stayed `line_api_admin_current_runtime` and DR restore route stayed `frozen_known_risk`.
- Decide whether Loop 312 should intake an operator-side sanitized result after the operator runs the canary window, or whether human input is still required.
- Do not generate a Loop 312 Codex prompt until the user explicitly asks for it.

## Safety Boundary

```txt
line_real_send_executed=false
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
runtime_config_changed_in_loop_311=false
service_restart_executed_in_loop_311=false
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
