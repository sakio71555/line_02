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
loop=Loop 308 LINE canary blocker remediation and operator package
status=blocked
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=translated_missing_input_blocker_to_operator_hidden_input_package_and_found_new_runtime_precondition_blocker
forward_progress_type=operator_side_hidden_input_package_plus_unexpected_runtime_gate_blocker
next_loop_requires_new_operator_input=true
previous_blocker=line_canary_runtime_inputs_not_provided
previous_blocker_resolution=operator_side_hidden_input_execution_package
line_canary_blocker_remediation_status=blocked_unexpected_runtime_enabled
line_config_presence_status=pass
line_real_send_currently_enabled=true
operator_side_hidden_input_flow_created=true
operator_side_line_canary_script_created=false
operator_side_line_canary_script_blocker=app_specific_send_route_not_safely_scriptable
operator_side_line_canary_result_intake_template_created=true
line_canary_send_attempted_in_loop_308=false
line_real_send_executed_in_loop_308=false
openai_api_executed=false
runtime_config_changed_in_loop_308=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 309: operator-side LINE canary execution result intake
loop_309_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 308 did not repeat the Loop 307 missing-input blocker.
- Confirm that the operator-side hidden-input flow and sanitized result-intake template now exist.
- Confirm that no LINE send, retry, bulk/multicast/broadcast, runtime mutation, service restart, OpenAI call, DB/Supabase/restore action, or infrastructure change occurred.
- Decide how to handle the unexpected current real-send enabled state before any canary send.
- Do not generate a Loop 309 Codex prompt until the user explicitly asks for it.

## Safety Boundary

```txt
line_real_send_executed=false
line_canary_send_attempted=false
line_retry_executed=false
line_bulk_multicast_broadcast_executed=false
openai_api_executed=false
runtime_config_changed=false
service_restart_executed=false
nginx_reload_executed=false
production_db_direct_connection_executed=false
production_db_manual_change_performed=false
supabase_connection_attempted=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
raw_log_recorded=false
secret_recorded=false
env_value_recorded=false
line_identifier_recorded=false
message_body_recorded=false
raw_response_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
```
