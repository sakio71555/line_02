# Loop 312: production staff reply real-send UI gate implementation

## Summary

```txt
loop_312_status=complete
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=implemented_runtime_ui_api_gate_instead_of_more_input_collection
forward_progress_type=staff_reply_real_send_ui_api_gate_implemented_tested_deployed
next_loop_requires_new_operator_input=true
previous_blocker=admin_ui_demo_save_only_no_real_send_action_exposed
admin_ui_real_send_action_missing_before_loop=true
staff_reply_real_send_ui_gate_implemented=true
local_head_short=da99b8c
local_contains_ed3c5a2=true
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
```

## Code Review Result

```txt
current_admin_ui_demo_save_only=true
current_admin_ui_real_send_action_present=false
current_api_real_send_path_present=true
current_api_real_send_guard_present=true
demo_save_bypass_limited_to_demo_save=true
real_send_guard_still_present=true
line_send_code_path_identified=true
admin_reply_code_path_identified=true
ui_gate_implementation_needed=true
```

## Implementation

The Admin customer detail staff reply flow now keeps demo-save as the default and exposes a dangerous real-send action only through a sanitized runtime capability gate.

```txt
admin_ui_demo_save_default_preserved=true
admin_ui_real_send_gate_source=runtime_capability_boolean
admin_ui_real_send_visible_when_flag_false=false
admin_ui_real_send_visible_when_flag_true=tested_with_mock
api_real_send_requires_explicit_delivery_mode=true
api_real_send_requires_explicit_confirmation=true
api_real_send_requires_idempotency_key=true
api_real_send_blocks_when_flag_false=true
api_demo_save_succeeds_when_flag_false=true
real_send_retry_bulk_broadcast_available=false
openai_api_involved_in_staff_reply_gate=false
```

Behavior:

- `demo_save` remains timeline-save only and does not call LINE push.
- Missing or unknown `delivery_mode` is treated as `demo_save`.
- Real LINE send requires explicit real delivery mode, explicit confirmation, single-send checkbox, idempotency key, authenticated staff context, selected tenant, customer LINE linkage, and enabled runtime flags.
- The runtime capability route returns booleans/status categories only and does not expose env values.

## Tests

```txt
demo_save_disabled_flag_test_status=pass
demo_save_no_line_push_test_status=pass
real_send_disabled_flag_blocks_test_status=pass
real_send_missing_confirmation_blocks_test_status=pass
real_send_enabled_mock_path_test_status=pass
admin_api_client_delivery_mode_test_status=pass
admin_ui_gate_test_status=pass
targeted_real_send_gate_tests_status=pass
```

Targeted tests covered the API gate, the Admin API client, the Admin UI component gate, and real-send behavior with mocked runtime flags only. No external LINE send was performed.

## Validation

```txt
local_diff_check_status=pass
local_lint_status=pass
local_typecheck_status=pass
local_test_status=pass
local_integration_test_status=pass
local_build_status=pass
validation_passed=true
```

## Controlled Deploy

```txt
ssh_access_available=true
vps_working_directory_available=true
api_service_active_pre=true
admin_service_active_pre=true
nginx_service_active_pre=true
line_real_send_currently_enabled_pre=false
deploy_runbook_found=true
deploy_method_selected=existing_copy_based_runbook
controlled_deploy_executed=true
build_executed=true
build_status=pass
api_app_service_restart_executed=true
api_app_service_restart_status=pass
admin_app_service_restart_executed=true
admin_app_service_restart_status=pass
nginx_reload_executed=false
runtime_config_changed_in_loop_312=false
package_lock_changed=false
frozen_install_executed_by_existing_runbook=true
apt_package_operation_executed=false
vps_runtime_post_deploy_commit=da99b8c
rollback_executed=false
```

The first release archive stopped during staging validation before active update because AppleDouble metadata files were present. The active runtime was not changed by that failed staging attempt. The archive was rebuilt with AppleDouble files excluded, then staging validation passed and active deploy proceeded through the existing copy-based runbook.

## Post-Deploy Verification

```txt
api_service_active_post=true
admin_service_active_post=true
nginx_service_active_post=true
public_api_health_status_code_post=200
public_admin_root_status_code_post=200
public_api_admin_customers_no_auth_status_code_post=401
public_api_line_capability_no_auth_status_code_post=401
line_real_send_currently_enabled_after_loop=false
post_deploy_smoke_status=pass
admin_ui_real_send_production_rollout_status=deployed
```

## Safety

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
restricted_actions_remain_no_go=true
```

## Files

```txt
code_updated=true
tests_updated=true
docs_updated=true
handoff_updated=true
matrices_updated=true
readme_index_updated=true
```

## Next

```txt
next_loop_candidate=Loop 313: operator-controlled LINE canary window execution with gated Admin UI
loop_313_auto_progression_allowed=false
```
