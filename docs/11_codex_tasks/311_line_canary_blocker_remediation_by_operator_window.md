# Loop 311: LINE Canary Blocker Remediation By Operator Window

## Status

```txt
loop_311_status=complete
line_canary_blocker_remediation_status=complete
previous_blocker=line_canary_hidden_inputs_not_provided
previous_blocker_resolution=operator_controlled_canary_window
codex_hidden_input_collection_retired=true
operator_controlled_canary_window_created=true
operator_canary_window_helper_created=true
operator_canary_window_helper_default_mode=no_send
operator_canary_window_helper_sends_line=false
operator_canary_window_helper_handles_recipient_or_message=false
operator_canary_execution_checklist_created=true
operator_canary_result_intake_template_created=true
line_real_send_executed_in_loop_311=false
runtime_config_changed_in_loop_311=false
service_restart_executed_in_loop_311=false
openai_api_executed=false
production_db_change_performed=false
production_go=true
production_go_scope=line_api_admin_current_runtime
production_go_scope_expanded=false
dr_restore_route_status=frozen_known_risk
dr_readiness_status=not_ready_restore_failed
```

Loop 311 retires the Codex hidden-input collection approach from Loop 310. The canary recipient and message are no longer expected to pass through Codex, ChatGPT, docs, or handoff. Instead, the canary is moved to an operator-controlled window: the operator may open a short real-send window later, manually send exactly one canary through the Admin UI or existing Admin API staff reply path, and then close the window immediately.

Loop 311 did not send LINE, enable LINE real send, change runtime config, restart services, call OpenAI, connect to DB/Supabase, run restore tooling, or touch Nginx/DNS/HTTPS/certbot/package operations.

## Local Validation And Path Review

```txt
local_git_status_clean=true
local_head_short=16bb07e
local_contains_ed3c5a2=true
git_diff_check_status=pass
local_lint_status=pass
local_typecheck_status=pass
local_test_status=pass
local_integration_test_status=pass
demo_save_bypass_limited_to_demo_save=true
real_send_guard_still_present=true
line_send_code_path_identified=true
operator_manual_send_path_identified=true
line_canary_gate_review_status=pass
```

The app path review confirmed:

- Demo-save remains limited to `demo_save`.
- Real LINE send remains protected by the runtime flag, staff auth/tenant checks, explicit confirmation, and idempotency.
- The manual canary path is the Admin UI or existing Admin API staff reply path, not a direct LINE API shell send.
- Codex must not collect recipient/message/auth values for the canary.

## Production Read-Only Baseline

Only sanitized status categories were recorded. No host value, public endpoint value, env value, secret, LINE identifier, message body, request/response body, or raw log was recorded.

```txt
ssh_access_available=true
vps_working_directory_available=true
vps_runtime_current_commit=unknown
vps_runtime_contains_ed3c5a2=true
api_service_active=true
admin_service_active=true
nginx_service_active=true
public_api_health_status_code=200
public_admin_root_status_code=200
public_customers_no_auth_status_code=401
line_config_presence_status=pass
line_real_send_currently_enabled=false
production_read_only_baseline_status=pass
```

## Operator-Controlled Canary Window

```txt
operator_controlled_canary_window_created=true
operator_window_open_close_required=true
operator_manual_send_path=admin_ui_or_existing_admin_api_staff_reply
operator_send_limit=1
operator_retry_allowed=false
operator_bulk_multicast_broadcast_allowed=false
operator_openai_allowed=false
operator_recipient_recording_allowed=false
operator_message_body_recording_allowed=false
operator_raw_response_body_recording_allowed=false
operator_post_window_disable_required=true
operator_post_window_smoke_required=true
```

Future operator flow:

1. Confirm LINE real send is disabled.
2. Run helper status check.
3. Open the canary window only with explicit operator approval.
4. Send exactly one canary via Admin UI or existing Admin API staff reply.
5. Do not retry, bulk send, multicast, or broadcast.
6. Close the canary window immediately, regardless of success or failure.
7. Confirm LINE real send is disabled.
8. Provide only sanitized result fields.

## Helper

```txt
operator_canary_window_helper_created=true
operator_canary_window_helper_blocker=none
operator_canary_window_helper_default_mode=no_send
operator_canary_window_helper_sends_line=false
operator_canary_window_helper_handles_recipient_or_message=false
operator_canary_window_helper_status_check_available=true
operator_canary_window_helper_open_window_available=true_guarded_future_only
operator_canary_window_helper_close_window_available=true_guarded_future_only
local_helper_bash_validation_status=pass
local_helper_self_check_status=pass
local_helper_dry_run_check_status=pass
local_helper_status_check_status=pass
```

Added helper:

```txt
helper_path=scripts/ops/line_canary_window_operator.sh
```

The helper default mode is no-send. Loop 311 executed only `--self-check`, `--dry-run-check`, and `--status`. It did not execute `--open-window` or `--close-window`.

The helper rejects recipient/message style arguments. It records only sanitized key/value status and does not print env values, URLs, raw response bodies, identifiers, message bodies, or secrets. Read-only smoke remains an explicit operator-side post-window step; the helper does not execute smoke scripts by itself.

## VPS Script-Only Delivery

```txt
vps_script_delivery_attempted=true
vps_script_delivery_status=success
vps_helper_bash_validation_status=pass
vps_helper_self_check_status=pass
vps_helper_dry_run_check_status=pass
vps_helper_status_check_status=pass
line_real_send_executed_in_loop_311=false
runtime_config_changed_in_loop_311=false
service_restart_executed_in_loop_311=false
```

The helper was delivered script-only to the application working tree and validated with non-mutating modes only. No runtime config change, service restart, LINE send, OpenAI call, DB/Supabase connection, restore, or infrastructure operation was performed.

## Future Result Intake Template

```txt
operator_controlled_canary_result_provided=true_or_false
operator_window_opened=true_or_false
operator_window_closed=true_or_false
line_canary_send_attempted=true_or_false
line_canary_send_count=0_or_1
line_canary_send_status=success_or_failed_or_not_attempted
line_canary_failure_category=sanitized_category_or_none
line_real_send_enabled_during_window=true_or_false
line_real_send_disabled_after_window=true_or_false
line_real_send_currently_enabled_after_operator_run=false_or_true_or_unknown
line_retry_executed=false
line_bulk_multicast_broadcast_executed=false
openai_api_executed=false
recipient_recorded=false
message_body_recorded=false
raw_response_body_recorded=false
secret_recorded=false
```

## Safety Boundary

```txt
line_real_send_executed_in_loop_311=false
runtime_config_changed_in_loop_311=false
service_restart_executed_in_loop_311=false
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
restricted_actions_remain_no_go=true
```

## Anti-Proliferation

```txt
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=converted_hidden_input_blocker_to_operator_controlled_canary_window_tool
forward_progress_type=operator_window_tool_and_result_intake_created
next_loop_requires_new_operator_input=true
```

Loop 311 does not ask Codex to collect the same hidden canary inputs again. It creates a concrete operator-side path and stops.

## Next Loop Candidate

```txt
next_loop_candidate=Loop 312: operator-controlled LINE canary window execution result intake
loop_312_auto_progression_allowed=false
```
