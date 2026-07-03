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
loop=Loop 312 production staff reply real-send UI gate implementation
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=implemented_runtime_ui_api_gate_instead_of_more_input_collection
forward_progress_type=staff_reply_real_send_ui_api_gate_implemented_tested_deployed
next_loop_requires_new_operator_input=true
loop_311_status=complete
loop_312_status=complete
previous_blocker=admin_ui_demo_save_only_no_real_send_action_exposed
admin_ui_real_send_action_missing_before_loop=true
staff_reply_real_send_ui_gate_implemented=true
admin_ui_demo_save_default_preserved=true
admin_ui_real_send_gate_source=runtime_capability_boolean
admin_ui_real_send_visible_when_flag_false=false
admin_ui_real_send_visible_when_flag_true=tested_with_mock
api_real_send_requires_explicit_delivery_mode=true
api_real_send_requires_explicit_confirmation=true
api_real_send_blocks_when_flag_false=true
api_demo_save_succeeds_when_flag_false=true
targeted_real_send_gate_tests_status=pass
local_validation_status=pass
controlled_deploy_executed=true
vps_runtime_post_deploy_commit=da99b8c
post_deploy_smoke_status=pass
line_real_send_currently_enabled_after_loop=false
line_real_send_executed_in_loop_312=false
line_canary_send_attempted_in_loop_312=false
openai_api_executed=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 313: operator-controlled LINE canary window execution with gated Admin UI
loop_313_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 312 fixed the Admin UI demo-save-only blocker instead of adding another input collection Loop.
- Confirm that demo-save remains the default timeline-save-only path.
- Confirm that real send requires the runtime capability to be open, explicit delivery mode, explicit confirmation, and a single-send action.
- Confirm that the real send action is hidden while LINE real send is disabled.
- Confirm that the API still blocks real send when runtime flags are disabled.
- Confirm that no LINE send, retry, bulk/multicast/broadcast, OpenAI call, DB/Supabase/restore action, runtime config change, Nginx reload/restart, DNS/HTTPS/certbot, package operation, daemon reload, or reboot occurred.
- Confirm that the active runtime deploy succeeded and LINE real send remains disabled.
- Decide whether Loop 313 should be an operator-controlled one-message canary through the newly gated Admin UI, or whether human input is still required.
- Do not generate a Loop 313 Codex prompt until the user explicitly asks for it.

## Safety Boundary

```txt
line_real_send_executed_in_loop_312=false
line_canary_send_attempted_in_loop_312=false
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
runtime_config_changed_in_loop_312=false
nginx_reload_executed=false
nginx_restart_executed=false
dns_https_certbot_executed=false
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
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
```
