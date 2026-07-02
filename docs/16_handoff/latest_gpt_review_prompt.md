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
loop=Loop 306 production external-send enablement decision gate
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=produced_concrete_external_send_decision_and_canary_boundary_without_execution
forward_progress_type=external_send_gate_review_config_presence_and_one_path_decision
next_loop_requires_new_operator_input=true
line_real_send_enablement_decision=ready_for_canary
openai_api_enablement_decision=deferred
recommended_external_send_rollout_path=line_only_canary_activation
external_send_enablement_gate_status=ready
line_canary_boundary_created=true
line_canary_send_limit=1
line_canary_retry_allowed=false
openai_canary_boundary_created=true
openai_canary_request_limit=1
openai_canary_cost_guard_required=true
line_real_send_executed_in_loop_306=false
openai_api_executed_in_loop_306=false
runtime_config_changed_in_loop_306=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 307: controlled LINE real send canary activation
loop_307_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 306 did not execute LINE real send or OpenAI API calls.
- Confirm that the selected rollout path is exactly one path: `line_only_canary_activation`.
- Confirm that OpenAI is deferred because of cost and response-quality risk.
- Confirm that the next Loop requires fresh explicit operator approval, an operator-approved recipient, no recorded identifier/body, one send only, no retry, and rollback/disable boundary.
- Decide whether Loop 307 should proceed, wait for human input, or stay frozen.

## Safety Boundary

```txt
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
production_db_connection_executed=false
production_db_change_performed=false
line_real_send_executed=false
openai_api_executed=false
nginx_reload_executed=false
service_restart_executed=false
runtime_config_changed=false
raw_log_recorded=false
secret_recorded=false
env_value_recorded=false
line_identifier_recorded=false
message_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
```
