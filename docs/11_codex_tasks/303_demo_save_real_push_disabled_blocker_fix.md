# Loop 303: Demo Save Real Push Disabled Blocker Fix

## Scope

Fix the Admin staff reply demo-save blocker where the UI says the reply will not be sent to real LINE, but the API can return `real_push_disabled` before saving the timeline entry.

This Loop changes only the Admin/API demo-save path, tests, and docs. It does not enable real LINE push, OpenAI API execution, DR restore, `pg_restore`, `psql`, Supabase direct connection, production DB connection, DB changes, VPS operations, Nginx/DNS/HTTPS/certbot changes, service restarts, package operations, or runtime config changes.

## Locate Result

```txt
demo_reply_ui_found=true
admin_api_route_found=true
real_push_guard_found=true
demo_save_path_found=true
likely_root_cause=staff_reply_ui_text_described_demo_save_but_request_did_not_mark_demo_save_so_real_push_gate_blocked_when_real_push_disabled
```

Relevant sanitized locations:

- Admin UI action: `apps/admin/app/customers/[customerId]/actions.ts`
- Admin API client: `apps/admin/src/admin-api.ts`
- Staff reply API route: `apps/api/src/index.ts`
- Real push gate: `apps/api/src/admin/line-real-push-gate.ts`
- Regression tests: `tests/integration/line-real-push-gate.test.ts`, `tests/integration/admin-api-client.test.ts`

## Implementation

```txt
loop_303_status=complete
demo_reply_save_blocker_detected=true
demo_reply_save_error_category=real_push_disabled_applied_to_demo_save
demo_reply_save_blocker_fixed=true
demo_save_real_push_disabled_bypass_for_demo_only=true
admin_ui_staff_reply_delivery_mode=demo_save
api_demo_save_path_skips_line_push=true
api_demo_save_path_records_timeline=true
real_line_push_guard_preserved=true
real_line_push_still_disabled=true
real_line_push_still_requires_flags_auth_selected_tenant_confirmation_and_idempotency=true
real_line_push_still_disabled_when_flags_disabled=true
line_real_send_executed=false
openai_api_executed=false
production_db_change_performed=false
production_db_connection_executed=false
db_change_performed=false
friday_demo_readiness_status=ready
production_change_freeze_status=active_after_fix
dr_restore_route_status=frozen_known_risk
production_go=true
production_go_scope=line_api_admin_current_runtime
dr_readiness_status=not_ready_restore_failed
```

The Admin staff reply action now sends `delivery_mode=demo_save`. The API treats that as a timeline-only save and does not call the LINE client. Requests that do not explicitly use `demo_save` continue through the existing real-push gate.

## Validation

```txt
demo_save_with_real_push_disabled_test=pass
real_send_guard_still_blocks_test=pass
admin_api_client_demo_save_request_test=pass
admin_demo_save_regression_status=pass
line_real_send_executed=false
openai_api_executed=false
restricted_actions_remain_no_go=true
```

Executed targeted regression tests:

```txt
npx pnpm@10.12.1 vitest run tests/integration/line-real-push-gate.test.ts tests/integration/admin-api-client.test.ts
```

Result: `2 passed`, `35 passed`.

## Safety Boundary

```txt
restore_execution_in_loop_303=false
helper_preflight_executed_in_loop_303=false
helper_execute_executed_in_loop_303=false
pg_restore_restore_executed_in_loop_303=false
psql_executed_in_loop_303=false
supabase_connection_attempted_in_loop_303=false
production_db_connection_executed_in_loop_303=false
db_change_performed_in_loop_303=false
line_real_send_executed_in_loop_303=false
openai_api_executed_in_loop_303=false
vps_operation_executed_in_loop_303=false
nginx_dns_https_certbot_operation_executed_in_loop_303=false
raw_log_recorded=false
secret_recorded=false
db_url_recorded=false
line_identifier_recorded=false
message_body_recorded=false
customer_private_data_recorded=false
```

## Anti-Proliferation Gate

```txt
anti_proliferation_check=pass
is_this_loop_proliferation_risk=false
proliferation_reason=none
forward_progress_type=demo_save_blocker_code_fix_and_regression_test
same_blocker_repeated_count=1
blocked_followup_created=false
next_loop_auto_progression_allowed=false
```

## Next Loop Candidate

```txt
next_loop_candidate=Loop 304: final demo delivery handoff and production change freeze
loop_304_auto_progression_allowed=false
```

Loop 304 is only a candidate. Do not start it without a separate operator instruction and ChatGPT review.
