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
loop=Loop 305 production rollout blocker remediation
status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=resolved_concrete_loop_304_active_rollout_blocker_with_bounded_deploy
forward_progress_type=active_production_runtime_updated_and_smoked
next_loop_requires_new_operator_input=true
loop_304_status=blocked
loop_305_status=complete
production_rollout_blocker_remediation_decision=approved
previous_blocker=admin_service_restart_required_but_not_explicitly_covered
previous_blocker_resolved=true
production_change_freeze_exception=approved_for_controlled_runtime_rollout
controlled_rollout_scope=admin_api_runtime_demo_save_fix
target_runtime_commit_expected=ed3c5a2
vps_runtime_pre_deploy_commit=01ad8b3
vps_runtime_post_deploy_commit=ed3c5a2
vps_runtime_contains_ed3c5a2=true
controlled_active_deploy_executed=true
copy_based_active_deploy_executed=true
restart_scope_confirmed=api_and_admin_app_services_only
post_deploy_smoke_status=pass
demo_save_fix_production_rollout_status=deployed
rollback_executed=false
real_line_push_still_disabled=true
line_real_send_executed=false
openai_api_executed=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
next_loop_candidate=Loop 306: production external-send enablement decision gate
loop_306_auto_progression_allowed=false
```

## Review Focus

- Confirm that Loop 305 resolved the exact Loop 304 blocker by explicitly allowing the existing API/Admin app service restarts.
- Confirm that the active copy-based runtime now contains `ed3c5a2` and post-deploy smoke passed.
- Confirm that the demo-save direct production write smoke was intentionally not run because it would require private workflow input or a production write.
- Confirm that this Loop did not authorize LINE real send, OpenAI API execution, DB changes, DR restore, Nginx reload/restart, DNS/HTTPS/certbot, runtime config change, or production Go scope expansion.
- Decide whether the only next candidate, `Loop 306: production external-send enablement decision gate`, should be accepted, delayed, or replaced by human review.

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
runtime_config_changed=false
package_lock_changed=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
line_identifier_recorded=false
message_body_recorded=false
host_or_url_recorded=false
public_endpoint_url_recorded=false
```
