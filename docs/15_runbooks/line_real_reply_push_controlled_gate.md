# LINE Real Reply/Push Controlled Gate

## Purpose

Record the controlled gate for future LINE real reply/push smoke.

Loop 147-150 does not send any LINE reply or push message.

## Current Status

```txt
line_receive_smoke=success
line_real_push_gate_exists=true
real_line_client_boundary_exists=true
api_default_line_client=mock
line_real_client_runtime_wiring_incomplete=true
line_real_push_enabled=false
line_real_push_reply=not_performed
production_readiness=production_no_go
```

## Non-Secret Names

```txt
LINE_MESSAGING_ENABLED
LINE_REAL_PUSH_ENABLED
LINE_CHANNEL_SECRET
LINE_CHANNEL_ACCESS_TOKEN
LINE_WEBHOOK_SECRET_PATH
```

Do not record values.

## Required Conditions Before One-Message Smoke

- LINE Official Account response message is OFF.
- LINE Official Account AI response message is OFF.
- Webhook remains ON.
- Test recipient is explicitly approved.
- Real line client is wired into server-side runtime.
- `LINE_MESSAGING_ENABLED` and `LINE_REAL_PUSH_ENABLED` are enabled only for the smoke window.
- authenticated staff, selected tenant, confirmation token, and idempotency key are required.
- Rollback to disabled flag is ready.
- Only one message is sent.

## Current No-Go Reasons

- API startup still defaults to mock line client.
- Real line client runtime injection is not complete.
- Official Account auto-response OFF is not confirmed.
- No single-message smoke approval has been given.

## Operator Checklist

Before real reply/push smoke:

1. Turn response message OFF.
2. Turn AI response message OFF.
3. Keep Webhook ON.
4. Confirm the test recipient and one-message text outside Codex.
5. Confirm rollback owner.

## Next

Plan a small remediation Loop before any real send:

```txt
Loop 151: production runtime wiring remediation plan
Loop 156: LINE real client runtime wiring
Loop 157: LINE one-message controlled smoke
```

## Loop 151 Update

LINE real client runtime wiring and the server-side fetch transport boundary are now implemented.

```txt
line_client_runtime_switch=implemented
real_line_client_runtime_wiring_incomplete=false
default_line_real_push_enabled=false
line_real_push_reply=not_performed
production_readiness=production_no_go
```

Even after wiring, real reply/push remains disabled by default. A later Loop must confirm Official Account auto-response OFF, approve exactly one recipient/message, enable the required flags only for the smoke window, and then roll back to disabled.

## Loop 156 Update

Official Account auto-response OFF was confirmed for normal response messages before the Supabase-backed receive persistence smoke. The account UI did not expose a separate AI response message setting.

```txt
official_account_response_message=off
official_account_ai_response_message=not_available_in_manager_screen
official_account_auto_response_ready=true
line_test_auto_reply_observed=false
line_real_push_enabled=false
line_real_push_reply=not_performed
line_reply_push_ready=false
production_readiness=production_no_go
```

The real reply/push path is still disabled. A later Loop must explicitly approve one recipient/message, enable the required flags only for the smoke window, and roll back to disabled.

## Loop 157-160 Update

Loop 157-160 confirmed the current LINE real reply/push implementation from code and VPS runtime state.

```txt
line_reply_push_classification=A_real_line_client_fully_wired_but_disabled_by_flag
real_line_client_boundary_exists=true
line_client_runtime_switch=implemented
line_real_push_enabled=false
line_real_push_enable_helper=/root/bin/amami-line-set-line-real-push-flag.sh
line_real_push_disable_helper=/root/bin/amami-line-disable-line-real-push.sh
line_real_push_reply=not_performed
line_real_push_reply_reason=pending_human_input_or_missing_approval
line_reply_push_ready=false
line_invalid_signature_loop157=401
production_readiness=production_no_go
```

No LINE token, channel secret, webhook path value, LINE userId, message body, or full LINE API response is recorded. The next LINE send step must be a dedicated one-message controlled smoke Loop with explicit operator approval.

## Loop 169 Update

Loop 169 reviewed the current outbound implementation and prepared the next one-message smoke without sending anything.

```txt
outbound_implementation_classification=A_real_line_push_client_fully_wired_but_disabled_by_flag
preferred_smoke_mode=push
recommended_target_selection=operator_sends_fresh_test_message_before_smoke
recommended_execution_path=existing_staff_reply_route
line_real_push_enable_helper=/root/bin/amami-line-set-line-real-push-flag.sh
line_real_push_enable_helper_status=exists
line_real_push_disable_helper=/root/bin/amami-line-disable-line-real-push.sh
line_real_push_disable_helper_status=exists
LINE_REAL_PUSH_ENABLED=false
target_user_id_recorded=false
outgoing_message_body_recorded=false
line_real_reply_push_performed=false
line_reply_push_ready=false
line_reply_push_plan_ready=true
production_readiness=production_no_go
```

Loop 170 may only send one controlled message after the operator confirms Webhook ON, response message OFF, AI response message OFF or unavailable, a fresh test LINE message, explicit one-message approval, and no retry / no bulk / no broadcast.

## Loop 170 Update

Loop 170 evaluated that gate and stopped before target selection or real send.

```txt
LINE_OFFICIAL_ACCOUNT_WEBHOOK_ON_CONFIRMED=NO
LINE_OFFICIAL_ACCOUNT_AUTO_RESPONSE_OFF_CONFIRMED=NO
LINE_OFFICIAL_ACCOUNT_AI_RESPONSE_OFF_CONFIRMED=NO
OPERATOR_FRESH_TEST_LINE_MESSAGE_SENT=NO
LINE_REAL_ONE_MESSAGE_SMOKE_APPROVED=NO
NO_RETRY_NO_BULK_NO_BROADCAST_ACK=NO
human_approval_gate_satisfied=false
human_gate_not_satisfied=true
target_user_selected=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

The next real-send attempt must repeat the human approval gate in a dedicated Loop.
