# Production Operations Hardening Package

## Purpose

Give the operator a practical production operations package after DR restore route freeze.

This runbook is for read-only operations, safe Friday demo preparation, and incident handoff. It does not authorize DR restore, helper preflight, helper execute, `pg_restore` restore, `psql`, Supabase DB connection, production DB connection, DB changes, LINE real send, OpenAI API execution, service restart, Nginx reload, package operations, or runtime configuration changes.

## Current Decision

```txt
loop_301_status=complete
production_operations_hardening_decision=approved
production_operations_hardening_package_created=true
production_readonly_smoke_checklist_created=true
production_readonly_smoke_script_created=true
operator_daily_check_template_created=true
incident_response_handoff_created=true
friday_demo_readiness_package_created=true
friday_demo_runbook_created=true
safe_demo_scope_defined=true
friday_demo_scope=safe_read_only_and_no_external_send_demo
dr_restore_route_status=frozen_known_risk
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
```

## Daily Operator Check Template

Record only category or boolean fields:

```txt
daily_check_api_service_active=true_or_false
daily_check_nginx_active=true_or_false
daily_check_public_api_health_200=true_or_false
daily_check_public_admin_root_200=true_or_false
daily_check_public_customers_no_auth_401=true_or_false
daily_check_disk_capacity_ok=true_or_false
daily_check_memory_capacity_ok=true_or_false
daily_check_line_real_send_not_required=true
daily_check_openai_api_not_required=true
daily_check_dr_known_risk_acknowledged=true
```

## Reusable Read-Only Smoke

Script:

```txt
readonly_smoke_script=scripts/ops/production_readonly_smoke.sh
readonly_smoke_script_embeds_urls=false
readonly_smoke_script_reads_secrets=false
readonly_smoke_script_prints_response_body=false
readonly_smoke_script_authenticated_checks=false
```

Usage policy:

- Provide public endpoint values through the shell environment only.
- Do not write endpoint values to docs or commit history.
- Do not source `.env`.
- Do not print response bodies.
- Treat `readonly_smoke_status=not_configured` as operator setup required.

## Incident Response Checklist

| Signal | Operator action | Hard No-Go |
| --- | --- | --- |
| API inactive | Record sanitized status and escalate. | No blind restart. |
| Admin unavailable | Record status category and time window. | No authenticated checks without approval. |
| Nginx inactive | Escalate before any runtime action. | No reload/restart without approval. |
| Disk/memory warning | Pause nonessential work and escalate. | No package or cleanup changes without approval. |
| Unexpected 5xx | Record sanitized status only. | Do not paste raw logs into docs. |
| LINE/OpenAI dependency issue | Hold sends/calls until approved. | No retry, bulk, paid call, or real send. |
| DR concern | Keep frozen known risk boundary. | No restore loop restart without new strategy. |

## Friday Demo Runbook

Show:

- production baseline is active
- public health/admin/auth-guard status categories
- Admin/UI flow only if safe and separately approved
- LINE CRM and FAQ/AI concept through a non-sending flow
- known DR risk and future alternative strategy direction

Do not show or execute:

- real LINE send
- OpenAI API call
- DB restore
- production DB operation
- secret values
- raw logs
- destructive operations
- authenticated customer data unless separately approved

Demo explanation:

```txt
production_runtime_baseline_confirmed=true
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
production_operations_priority=true
future_dr_resume_requires_new_strategy=true
```

## Next Loop Boundary

```txt
next_loop_candidate=Loop 302: Friday demo rehearsal and final production smoke verification
loop_302_should_rerun_read_only_smoke=true
loop_302_should_validate_demo_runbook=true
loop_302_should_confirm_no_send_no_charge_demo_path=true
loop_302_should_finalize_friday_handoff=true
loop_302_should_restart_dr_restore=false
```

## Loop 302 Friday Demo Rehearsal Final Package

Loop 302 completed the final rehearsal package and read-only production smoke classification.

```txt
loop_302_status=complete
friday_demo_rehearsal_decision=approved
friday_demo_rehearsal_completed=true
final_production_smoke_verification_completed=true
final_production_smoke_verification_status=pass
friday_demo_readiness_package_finalized=true
friday_demo_readiness_status=ready
safe_demo_scope_confirmed=true
friday_demo_scope=admin_health_line_api_current_runtime_readonly
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
```

### Demo Objective

The Friday demo should prove the current production operations baseline, not DR readiness.

Use this order:

1. State that current production Go is scoped to the LINE/API/Admin runtime.
2. Show read-only baseline status: API active, Nginx active, public health, admin root, and no-auth customer guard.
3. Show safe Admin availability only.
4. Explain LINE CRM / FAQ AI flow without real send or paid API execution.
5. Show the operator daily check and incident response handoff.
6. Explain DR restore as a frozen known risk.
7. Close with next phase: monitoring, UI polish, and alternative DR strategy.

### Demo No-Go Boundary

```txt
line_real_send_in_demo=false
line_retry_bulk_multicast_broadcast_in_demo=false
openai_api_execution_in_demo=false
restore_in_demo=false
pg_restore_in_demo=false
psql_in_demo=false
production_db_connection_in_demo=false
production_db_change_in_demo=false
supabase_write_in_demo=false
service_restart_in_demo=false
nginx_reload_restart_in_demo=false
dns_https_certbot_in_demo=false
raw_log_display_in_demo=false
secret_display_in_demo=false
authenticated_customer_data_demo_allowed=false_unless_separately_approved
```

### Final Smoke Classification

```txt
ssh_access_available=true
vps_working_directory_available=true
api_service_active=true
nginx_service_active=true
public_api_health_status_code=200
public_admin_root_status_code=200
public_customers_no_auth_status_code=401
disk_capacity_status=ok
memory_capacity_status=ok
helper_bash_validation_status=pass
classifier_validation_status=pass
production_readonly_smoke_script_bash_validation_status=pass
production_readonly_smoke_script_runtime_status=not_run
production_read_only_baseline_checked=true
production_baseline_check_changed_runtime=false
```

The reusable smoke script was validated locally. It was not run with endpoint values in Loop 302, and no endpoint values were recorded.

### Fallback Script

If smoke is pass:

- say the production baseline is green
- show API/Admin safe surfaces
- explain known DR risk as frozen

If smoke is limited:

- use this runbook and the latest sanitized baseline
- do not improvise destructive checks
- describe only the sanitized blocker category

If smoke is blocked:

- do not demo live production
- switch to a static/docs walkthrough
- preserve production safety over demo completeness

### Known Risk Wording

本番運用に必要な API / Admin / runtime baseline は確認済みです。
DR restore は検証で失敗したため、既知リスクとして凍結しています。
本番価値の高い運用・管理・問い合わせ対応導線を優先し、DRは次フェーズで新しい復旧戦略として再開します。

### Next Loop Boundary

```txt
next_loop_candidate=Loop 303: final demo delivery handoff and production change freeze
loop_303_auto_progression_allowed=false
```

## Loop 303 Final Demo Delivery Handoff And Change Freeze

Loop 303 activates production change freeze and finalizes the Friday demo delivery handoff.

```txt
loop_303_status=complete
final_demo_delivery_decision=approved
production_change_freeze_decision=approved
production_change_freeze_status=active
production_change_freeze_scope=runtime_code_config_db_infra_external_send_and_paid_api
production_change_freeze_allowed_actions=docs_handoff_readonly_smoke_only
production_change_freeze_emergency_override_requires_operator=true
final_demo_delivery_handoff_created=true
demo_day_start_checklist_created=true
demo_sequence_finalized=true
demo_no_go_boundary_finalized=true
demo_fallback_talk_track_created=true
post_demo_feedback_intake_template_created=true
final_read_only_smoke_completed=true
final_read_only_smoke_status=pass
final_demo_go_status=go
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
```

### Demo-Day Start Checklist

```txt
api_service_active=true
nginx_service_active=true
public_api_health_status_code=200
public_admin_root_status_code=200
public_customers_no_auth_status_code=401
disk_capacity_status=ok
memory_capacity_status=ok
production_change_freeze_status=active
line_real_send_in_demo=false
openai_api_execution_in_demo=false
dr_restore_route_status=frozen_known_risk
no_restricted_actions_required=true
```

### Final Demo Sequence

1. Opening: production baseline is active.
2. Current scope: `line_api_admin_current_runtime`.
3. API health, Nginx active state, and public smoke statuses.
4. Admin root availability.
5. Customers no-auth guard as expected access-control signal.
6. Admin / LINE CRM / FAQ AI current runtime explanation without external send.
7. Operator daily check and incident response handoff.
8. Known risk: DR restore route is frozen.
9. Next phase: production operations hardening, monitoring, UI polish, and alternative DR strategy later.

### Production Change Freeze

```txt
production_change_freeze_status=active
production_change_freeze_starts_before_demo=true
production_change_freeze_ends_after_operator_unfreeze=true
allowed_during_freeze=docs_handoff_readonly_smoke_only
blocked_during_freeze=runtime_code_config_db_infra_external_send_paid_api
emergency_override_requires_operator=true
```

### Post-Demo Feedback Intake

```txt
post_demo_feedback_received=true_or_false
feedback_category=ui_admin_or_line_crm_or_faq_ai_or_operations_or_dr_known_risk_or_other
feedback_priority=high_or_medium_or_low
requires_runtime_change=true_or_false
requires_db_change=true_or_false
requires_external_send=true_or_false
requires_secret_access=true_or_false
safe_to_schedule_next_loop=true_or_false
recommended_next_action=sanitized_action
```

### Next Loop Boundary

```txt
next_loop_candidate=Loop 304: post-demo feedback intake and production follow-up plan
loop_304_auto_progression_allowed=false
```

## Loop 304 Controlled Runtime Rollout Attempt

Loop 304 used a controlled production change-freeze exception to attempt rollout of the Admin/API demo-save fix.

```txt
loop_304_status=blocked
production_rollout_decision=approved
production_change_freeze_exception=approved_for_controlled_runtime_rollout
controlled_rollout_scope=admin_api_runtime_demo_save_fix
target_runtime_commit_expected=ed3c5a2
local_validation_status=pass
production_baseline_status=pass
deploy_runbook_found=true
deploy_method_selected=existing_copy_based_runbook_staging_validated_only
staging_validation_status=pass
controlled_deploy_executed=false
app_service_restart_executed=false
nginx_reload_executed=false
db_migration_executed=false
runtime_config_changed=false
demo_save_fix_production_rollout_status=blocked
rollout_blocker=admin_service_restart_required_but_not_explicitly_covered_by_loop_304_restart_boundary
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
restricted_actions_remain_no_go=true
```

Operational reading:

- Staging proved the selected source can install, validate, and build under the existing copy-based deployment shape.
- Active production was not changed.
- The next rollout attempt must explicitly include the existing Admin app service restart, or choose a narrower API-only rollout with the limitation clearly accepted.
- Do not run LINE real send, OpenAI API, production DB connection/change, DR restore, Nginx reload, DNS/HTTPS/certbot, or endpoint/body/log/secret recording from this runbook.

## Loop 303 Demo Save Blocker Fix

Loop 303 was intentionally reused for a demo-save blocker fix after the final handoff. The Admin staff reply flow now has an explicit timeline-only delivery mode.

```txt
loop_303_demo_save_blocker_fix=true
demo_reply_save_blocker_detected=true
demo_reply_save_error_category=real_push_disabled_applied_to_demo_save
demo_reply_save_blocker_fixed=true
demo_save_real_push_disabled_bypass_for_demo_only=true
admin_ui_staff_reply_delivery_mode=demo_save
api_demo_save_path_skips_line_push=true
api_demo_save_path_records_timeline=true
real_line_push_guard_preserved=true
real_line_push_still_disabled=true
demo_save_with_real_push_disabled_test=pass
real_send_guard_still_blocks_test=pass
line_real_send_executed=false
openai_api_executed=false
production_db_change_performed=false
friday_demo_readiness_status=ready
production_change_freeze_status=active_after_fix
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
```

Demo implication:

- Staff reply demo-save can be used to show timeline behavior without real LINE send.
- Real LINE push remains behind the existing safety gate and still blocks when real push is disabled.
- This fix does not authorize any new external send, paid API call, DB operation, infrastructure change, or DR restore work.
