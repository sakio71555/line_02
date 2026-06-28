# LINE Send Failure Diagnosis Without Retry

## Purpose

Loop 172 diagnoses the Loop 171 safety stop and prepares a private internal dry-run path for the next one-message LINE smoke.

This runbook does not authorize LINE real delivery. The final state remains `production_no_go`.

## Previous Result

```txt
line_real_reply_push_performed=false
line_send_attempted_once=false
line_send_result=not_performed
reason=authenticated_staff_route_unavailable
authenticated_staff_route_available=false
LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

Loop 171 did not issue a LINE send request. Therefore Loop 172 must not retry delivery.

## Auth Diagnosis

```txt
existing_staff_reply_route=POST /api/admin/customers/:customerId/reply
authenticated_staff_route_available=false
authenticated_staff_route_unavailable_reason=admin_auth_runtime_unavailable_for_authenticated_staff_route
route_auth_requirements_summary=Authorization + selected tenant + authenticated staff + send_staff_reply permission
selected_tenant_header_required=x-selected-tenant-id
tenant_context_required=authenticated_staff
dev_header_real_send_allowed=false
fake_bearer_production_allowed=false
supabase_auth_jwt_required_for_authenticated_route=true
send_staff_reply_permission_required=true
real_line_push_confirmation_required=true
idempotency_key_required=true
```

The staff reply route is intentionally stricter than the local development header path. For real LINE delivery, the route must run under authenticated staff context and `send_staff_reply` permission.

## Safety Decision

```txt
do_not_relax_auth=true
do_not_add_public_test_route=true
do_not_allow_production_dev_header=true
do_not_allow_fake_bearer_in_production=true
retry=false
bulk_multicast_broadcast_group_room=false
```

Do not create a public smoke endpoint. Do not weaken the staff route. Use a private VPS-internal command for preflight and, in a later Loop, for a one-message send only after explicit gates are added.

## Recommended Next Execution Path

```txt
recommended_next_execution_path=internal_cli_smoke_command
internal_cli_smoke_path=scripts/smoke/line-real-push-target-preflight.ts
internal_cli_default_mode=dry_run
internal_cli_smoke_path_ready=true
internal_cli_execute_mode_implemented=false
line_reply_push_internal_smoke_ready=true
```

The current CLI is a dry-run target preflight only. It reads the tenant-scoped customer list, counts fresh LINE-capable candidates, and prints no target identifier or message body.

## Dry-Run Output

Expected safe fields:

```txt
line_push_smoke_mode=dry_run
target_user_selected=true_or_false
distinct_target_count=0_or_1_or_multiple
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
would_send=false
line_send_attempted_once=false
line_real_push_enabled_required=true
internal_cli_execute_mode_implemented=false
```

Never print or record the LINE user identifier, target customer mapping, reply token, inbound body, outbound body, request body, channel secret, access token, webhook path value, staff token, OpenAI secret, or Supabase secret.

## Future One-Send Lock

The next send-capable Loop should use a root-only lock directory:

```txt
one_send_lock_directory=/var/lib/amami-line-crm/smoke/line-real-single-message/
one_send_lock_file=send-attempted.lock
one_send_lock_required=true
```

Create the lock before the send attempt. If an attempt may have been issued, do not retry, even if the result is unclear.

## Not Performed In Loop 172

```txt
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
line_send_attempted_once=false
openai_real_api_rerun=false
supabase_write_smoke_performed=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
production_go=false
```

## Readiness

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_provider_controlled_smoke_ready=true
line_reply_push_ready=false
line_reply_push_internal_smoke_ready=true
production_readiness=production_no_go
```

## Next

```txt
Loop 173: LINE real push internal CLI one-message controlled smoke
```

## Loop 173 Follow-up

Loop 173 completed the internal CLI one-message smoke without relaxing staff auth or adding a public route.

```txt
internal_cli_script=scripts/smoke/line-real-push-single-message-smoke.ts
line_send_attempted_once=true
line_send_result=success
retry_performed=false
bulk_multicast_broadcast_group_room=false
send_attempt_lock_present=true
send_attempt_count=1
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=true
production_readiness=production_no_go
```

Do not repeat the send from this runbook. The next action is a separate final production Go/No-Go review.
