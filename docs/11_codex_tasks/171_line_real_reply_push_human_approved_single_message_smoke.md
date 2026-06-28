# Loop 171: LINE Real Reply/Push Human Approved Single Message Smoke

## Goal

Attempt the LINE real reply/push smoke only if all human approval tokens are satisfied, exactly one fresh target can be selected without recording identifiers, and the existing staff reply route can execute through the authenticated staff path.

## Scope

- Confirm Loop 171 approval tokens.
- Confirm runtime safety status with sanitized VPS checks.
- Select the fresh test target without recording LINE user identifier, message body, reply token, or target mapping.
- Use only `POST /api/admin/customers/:customerId/reply` if every safety gate is satisfied.
- Keep send count at zero or one.
- Keep `LINE_REAL_PUSH_ENABLED=false` at the end.
- Record sanitized docs and tests.

## Out of Scope

- Retry.
- Bulk, multicast, broadcast, group, or room send.
- Direct LINE API call outside the existing staff reply route.
- Recording LINE token, channel secret, webhook path value, user identifier, reply token, inbound body, or outbound body.
- OpenAI real API rerun.
- Supabase migration, write smoke, or RLS change.
- Nginx, DNS, certbot, reload, or restart change.
- Production promotion.

## Human Approval Gate

```txt
LINE_OFFICIAL_ACCOUNT_WEBHOOK_ON_CONFIRMED=YES
LINE_OFFICIAL_ACCOUNT_AUTO_RESPONSE_OFF_CONFIRMED=YES
LINE_OFFICIAL_ACCOUNT_AI_RESPONSE_OFF_CONFIRMED=YES
OPERATOR_FRESH_TEST_LINE_MESSAGE_SENT=YES
LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=YES
NO_RETRY_NO_BULK_NO_BROADCAST_ACK=YES
human_approval_gate_satisfied=true
human_gate_not_satisfied=false
```

## Target Selection

```txt
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
existing_staff_reply_route=POST /api/admin/customers/:customerId/reply
fresh_test_target_selected=true
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
distinct_target_count=1
```

The selected target was derived from the tenant-scoped customer list and a recent inbound LINE message. No LINE user identifier, message body, reply token, or customer-to-LINE mapping was recorded.

## Authenticated Staff Route Gate

```txt
authenticated_staff_route_status=401
authenticated_staff_route_ready=false
line_real_send_precondition_failed=true
line_real_send_precondition_failure_reason=authenticated_staff_route_unavailable
```

The existing staff reply route requires the authenticated staff path before real LINE delivery. The live review runtime returned `401` for the authenticated staff route dry check, so the Loop did not enable real LINE push and did not call the send route.

## Runtime Safety Evidence

```txt
api_service=active
admin_service=active
api_direct_health_loop171=200
https_api_health_loop171=200
https_customers_page_loop171=200
customers_no_header_loop171=401
line_invalid_signature_loop171=401
REPOSITORY_RUNTIME=supabase
AI_PROVIDER=mock
OPENAI_REAL_API_ENABLED=false
OpenAI systemd drop-in absent
LINE_CHANNEL_ACCESS_TOKEN configured; value not recorded
LINE_CHANNEL_SECRET configured; value not recorded
LINE_WEBHOOK_SECRET_PATH configured; value not recorded
LINE_REAL_PUSH_ENABLED=false
line_real_push_enable_helper_status=exists
line_real_push_disable_helper_status=exists
```

## Result

```txt
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
reason=authenticated_staff_route_unavailable
retry_performed=false
bulk_send_performed=false
multicast_performed=false
broadcast_performed=false
group_send_performed=false
room_send_performed=false
duplicate_send_detected=false
send_attempt_lock_present=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
openai_real_api_rerun=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
line_reply_push_ready=false
production_readiness=production_no_go
```

No LINE send request was issued. Because no send request was issued, retry was not relevant and no duplicate send was possible.

## Test Coverage

- Added docs integration coverage for Loop 171.
- The test checks the human approval gate, one-message constraints, authenticated staff route failure, not-performed send result, rollback state, final disabled state, secret redaction, and production No-Go status.

## Remaining Risks

- LINE real reply/push has still not been smoked.
- The review runtime must provide an authenticated staff path before a one-message real send can proceed through the existing route.
- Final operator Go is not recorded.

## Next Loop Candidate

```txt
Loop 172: LINE send failure diagnosis without retry
```
