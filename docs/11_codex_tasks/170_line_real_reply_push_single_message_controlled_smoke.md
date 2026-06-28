# Loop 170: LINE Real Reply/Push Single Message Controlled Smoke

## Goal

Confirm whether the LINE real reply/push path can be smoked with exactly one message.

This Loop did not perform the real send because the human approval gate was not satisfied. The result is recorded as a safe preflight and documentation/test update only.

## Scope

- Read the Loop 170 approval tokens.
- Confirm the existing staff reply route is the preferred smoke execution path.
- Confirm the deployed review runtime health and safety status with sanitized output.
- Keep real LINE push disabled.
- Add task/runbook/dev-log/test evidence for the not-performed result.
- Keep production readiness as `production_no_go`.

## Out of Scope

- Real LINE reply/push send.
- Retry, bulk, multicast, broadcast, group, or room send.
- Enabling LINE real push.
- API restart for LINE real push.
- OpenAI real API rerun.
- Supabase migration, write smoke, or RLS changes.
- Nginx, DNS, certbot, reload, or restart changes.
- Recording any secret, webhook path value, LINE user identifier, reply token, or message body.

## Human Approval Gate

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

Because at least one required approval token was not `YES`, the Loop did not select a target and did not send.

## Existing Route Confirmation

```txt
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
existing_staff_reply_route=POST /api/admin/customers/:customerId/reply
required_body_field=body
real_push_confirmation_required=true
real_push_idempotency_required=true
mock_mode_when_disabled=true
```

The staff reply route calls the LINE client through the existing `pushMessage` boundary. Real delivery requires the runtime flags and explicit confirmation. With real push disabled, the runtime uses the mock LINE client.

## Sanitized VPS Preflight

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

No secret values, endpoint values, webhook path values, LINE user identifiers, reply tokens, or message bodies were recorded.

## Result

```txt
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
reason=human_gate_not_satisfied
retry_performed=false
bulk_send_performed=false
multicast_performed=false
broadcast_performed=false
group_send_performed=false
room_send_performed=false
duplicate_send_detected=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
openai_real_api_rerun=false
nginx_dns_certbot_change_performed=false
nginx_reload_restart_performed=false
line_reply_push_ready=false
production_readiness=production_no_go
```

`rollback_to_LINE_REAL_PUSH_ENABLED_false=true` means the Loop ended in the required disabled state. The flag was not temporarily enabled in this run.

## Test Coverage

- Added a docs integration test for Loop 170.
- The test checks the human gate, one-message-only constraints, no retry/bulk/broadcast/multicast/group/room markers, final disabled state, and secret redaction.
- The test also asserts `line_reply_push_ready=false` and `production_readiness=production_no_go`.

## Remaining Risks

- The real LINE reply/push path has not been smoked.
- A fresh operator test message and explicit one-message approval are still required.
- Final operator production Go is not recorded.

## Next Loop Candidate

```txt
Loop 171: LINE real reply/push human approval gate
```
