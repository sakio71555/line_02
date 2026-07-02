# Latest GPT Review Prompt

まずLoop結果をレビューしてください。
次LoopのCodex文章はまだ作らないでください。

必ず以下の順で判定してください。

1. このLoopは complete / blocked / failed のどれか
2. blockedの場合、同じblockerが過去に何回出ているか
3. Codexが提案した次Loop候補を採用するか、却下するか
4. 却下する場合、理由は何か
5. 次に取るべき方針は go / no-go / route freeze / alternative path / human input required のどれか
6. 次LoopのCodex文章を作ってよいか

同じblockerが2回以上出ている場合は、protocol追加・recollection・readiness gate追加を次Loop候補にしないでください。

## Review Target

```txt
loop=Loop 304 controlled production rollout for admin/API runtime
status=blocked
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=blocked_after_concrete_staging_validation_not_protocol_loop
forward_progress_type=local_validation_and_vps_staging_validation_completed
next_loop_requires_new_operator_input=true
production_rollout_decision=approved
production_change_freeze_exception=approved_for_controlled_runtime_rollout
controlled_rollout_scope=admin_api_runtime_demo_save_fix
local_validation_status=pass
production_precheck_status=pass
deploy_runbook_found=true
deploy_method_selected=existing_copy_based_runbook_staging_validated_only
staging_validation_status=pass
controlled_deploy_executed=false
app_service_restart_executed=false
production_runtime_contains_demo_save_fix=false
demo_save_fix_production_rollout_status=blocked
rollout_blocker=admin_service_restart_required_but_not_explicitly_covered_by_loop_304_restart_boundary
real_line_push_still_disabled=true
line_real_send_executed=false
openai_api_executed=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 305: production rollout blocker remediation
loop_305_auto_progression_allowed=false
```

## Review Focus

- Confirm that this Loop made concrete progress through local and VPS staging validation, not another protocol-only Loop.
- Confirm that active production was intentionally not changed because the existing deploy path needs Admin app service restart approval.
- Decide whether the next action should explicitly approve the existing Admin app service restart, choose API-only rollout, or keep production unchanged.
- Confirm that no LINE real send, OpenAI API call, restore, DB change, Nginx reload, secret/raw data recording, host/URL recording, or endpoint URL recording occurred.
- Confirm whether Loop 305 should be accepted as the single blocker remediation Loop.

## Safety Boundary

```txt
active_runtime_changed=false
rollback_executed=false
restore_executed=false
pg_restore_executed=false
psql_executed=false
supabase_connection_attempted=false
production_db_connection_executed=false
production_db_change_performed=false
line_real_send_executed=false
openai_api_executed=false
nginx_reload_executed=false
runtime_config_changed=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
line_identifier_recorded=false
message_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
```
