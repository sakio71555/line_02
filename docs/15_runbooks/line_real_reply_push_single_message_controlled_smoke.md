# LINE Real Reply / Push Single Message Controlled Smoke

## Purpose

This runbook records the Loop 170 single-message controlled smoke attempt.

Loop 170 was intentionally not sent because the required human approval tokens were not all `YES`.

## Gate Result

```txt
LINE_OFFICIAL_ACCOUNT_WEBHOOK_ON_CONFIRMED=NO
LINE_OFFICIAL_ACCOUNT_AUTO_RESPONSE_OFF_CONFIRMED=NO
LINE_OFFICIAL_ACCOUNT_AI_RESPONSE_OFF_CONFIRMED=NO
OPERATOR_FRESH_TEST_LINE_MESSAGE_SENT=NO
LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=NO
NO_RETRY_NO_BULK_NO_BROADCAST_ACK=NO
human_approval_gate_satisfied=false
human_gate_not_satisfied=true
```

If any of these approval tokens is not `YES`, do not send. This Loop followed that rule.

## Execution Path

```txt
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
existing_staff_reply_route=POST /api/admin/customers/:customerId/reply
reply_smoke_preferred=false
push_smoke_preferred=true
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
```

The route is suitable for a later smoke because it already stores the staff reply and uses the LINE client boundary. It must only be used for real delivery after the human gate is satisfied.

## One Message Rule

```txt
one_message_only=true
retry_allowed=false
bulk_send_allowed=false
multicast_allowed=false
broadcast_allowed=false
group_send_allowed=false
room_send_allowed=false
retry_performed=false
bulk_send_performed=false
multicast_performed=false
broadcast_performed=false
group_send_performed=false
room_send_performed=false
```

If a future send request may have been issued, treat it as the single attempt and do not retry.

## Runtime Safety Result

```txt
api_service=active
admin_service=active
api_direct_health_loop170=200
https_api_health_loop170=200
https_customers_page_loop170=200
customers_no_header_loop170=401
line_invalid_signature_loop170=401
REPOSITORY_RUNTIME=supabase
supabase_ready=true
supabase_receive_persistence_ready=true
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

## Send Result

```txt
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
reason=human_gate_not_satisfied
duplicate_send_detected=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

`LINE_REAL_PUSH_ENABLED` was not enabled in this Loop, so no API restart was needed for real LINE push.

## Not Performed

```txt
openai_real_api_rerun=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
supabase_migration_or_write_smoke_performed=false
production_promotion=false
```

## Secret Rule

Do not record:

- LINE access token.
- LINE channel secret.
- Webhook path value.
- LINE user identifier value.
- reply token.
- inbound or outbound message body.
- OpenAI API key, model value, prompt body, or response body.
- Supabase URL, keys, DB URL, or postgres connection string.
- Authorization bearer token.
- Private key.

## Readiness Decision

```txt
https_ready_for_review=true
line_receive_ready=true
official_account_auto_response_ready=true
supabase_ready=true
supabase_receive_persistence_ready=true
openai_provider_controlled_smoke_ready=true
line_reply_push_ready=false
production_readiness=production_no_go
```

LINE reply/push readiness remains false until a later Loop satisfies the human gate, sends exactly one message, records sanitized success/failure, and rolls back to `LINE_REAL_PUSH_ENABLED=false`.

## Next

```txt
Loop 171: LINE real reply/push human approval gate
```

## Loop 171 Follow-up

Loop 171 repeated the single-message smoke with all human approval tokens satisfied, but did not send because the existing staff reply route was not available through the authenticated staff path in the live review runtime.

```txt
human_approval_gate_satisfied=true
human_gate_not_satisfied=false
fresh_test_target_selected=true
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
distinct_target_count=1
authenticated_staff_route_status=401
authenticated_staff_route_ready=false
line_real_send_precondition_failed=true
line_real_send_precondition_failure_reason=authenticated_staff_route_unavailable
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
reason=authenticated_staff_route_unavailable
retry_performed=false
duplicate_send_detected=false
send_attempt_lock_present=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```
