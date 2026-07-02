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
loop=Loop 307 controlled LINE real send canary activation
status=blocked
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=checked_canary_runtime_input_availability_and_stopped_before_enable
forward_progress_type=blocked_on_concrete_missing_canary_runtime_input
next_loop_requires_new_operator_input=true
production_line_canary_activation_decision=approved
line_canary_activation_status=blocked_before_enable
failure_reason=line_canary_runtime_inputs_not_provided
line_canary_runtime_inputs_available=false
line_canary_recipient_input_present=false
line_canary_message_input_present=false
line_canary_auth_context_available=false
line_real_send_enabled_for_canary=false
line_canary_send_attempted=false
line_canary_send_count=0
line_canary_send_status=not_attempted
line_real_send_currently_enabled_after_loop=false
line_retry_executed=false
line_bulk_multicast_broadcast_executed=false
openai_api_executed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 308: LINE canary blocker remediation
loop_308_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 307 made forward progress by checking canary input availability and stopping before enablement.
- Confirm that LINE real send was not enabled and no send was attempted.
- Confirm that the blocker is missing operator-provided canary runtime input, not a LINE send failure.
- Decide whether Loop 308 should be accepted, or whether this should be treated as human input required before any further Codex Loop.
- Do not generate a Loop 308 Codex prompt until the user explicitly asks for it.

## Safety Boundary

```txt
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
production_db_direct_connection_executed=false
production_db_manual_change_performed=false
line_real_send_executed=false
openai_api_executed=false
runtime_config_changed=false
service_restart_executed=false
nginx_reload_executed=false
raw_log_recorded=false
secret_recorded=false
env_value_recorded=false
line_identifier_recorded=false
message_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
```
