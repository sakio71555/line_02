# LINE Real Reply / Push Single Message Smoke Plan

## Purpose

Prepare the future one-message LINE real reply/push smoke while keeping real sending disabled in Loop 157-160.

## Current State

```txt
line_real_push_enabled=false
line_real_push_enable_helper=/root/bin/amami-line-set-line-real-push-flag.sh
line_real_push_disable_helper=/root/bin/amami-line-disable-line-real-push.sh
line_real_push_reply=not_performed
line_reply_push_ready=false
production_readiness=production_no_go
```

## Preconditions

- LINE Official Account Webhook is ON.
- LINE Official Account response message is OFF.
- LINE Official Account AI response message is not available in the observed manager screen.
- Test recipient is explicitly approved by the operator.
- Test message text is explicitly approved by the operator.
- `LINE_REAL_PUSH_ENABLED` is enabled only for the smoke window.
- Disable helper is ready before enabling.

## Operator Steps for a Later Loop

1. Confirm the Official Account settings again.
2. Confirm the one test recipient outside docs and chat.
3. Confirm the one test message outside docs and chat.
4. Run `/root/bin/amami-line-set-line-real-push-flag.sh`.
5. Restart the API only in the explicitly approved Loop.
6. Send exactly one controlled message through the admin reply path.
7. Confirm receipt.
8. Immediately run `/root/bin/amami-line-disable-line-real-push.sh`.
9. Restart the API after disabling.

## Rollback

Run:

```txt
/root/bin/amami-line-disable-line-real-push.sh
```

Then restart the API in the approved Loop and verify health.

## What Not To Record

- LINE access token.
- LINE channel secret.
- Webhook path value.
- LINE userId.
- Message body.
- Full LINE API response.

## Current Decision

```txt
line_real_push_reply=not_performed
reason=pending_human_input_or_missing_approval
production_readiness=production_no_go
```

## Loop 169 Planning Update

Loop 169 keeps this smoke as a later action and records the concrete plan.

```txt
preferred_smoke_mode=push
recommended_target_selection=operator_sends_fresh_test_message_before_smoke
recommended_execution_path=existing_staff_reply_route
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body=fixed non-personal smoke text; value not recorded
outgoing_message_body_recorded=false
one_message_only=true
retry_allowed=false
bulk_send_allowed=false
multicast_allowed=false
broadcast_allowed=false
group_send_allowed=false
room_send_allowed=false
LINE_REAL_PUSH_ENABLED=false
line_real_reply_push_performed=false
line_reply_push_ready=false
line_reply_push_plan_ready=true
production_readiness=production_no_go
```

Loop 170 must stop if target selection requires displaying a LINE userId, replyToken, webhook path value, or message body.

## Loop 170 Controlled Smoke Result

Loop 170 stopped before real delivery because the approval tokens were not all `YES`.

```txt
human_approval_gate_satisfied=false
human_gate_not_satisfied=true
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
one_message_only=true
retry_allowed=false
bulk_send_allowed=false
multicast_allowed=false
broadcast_allowed=false
group_send_allowed=false
room_send_allowed=false
target_user_selected=false
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
retry_performed=false
bulk_send_performed=false
multicast_performed=false
broadcast_performed=false
group_send_performed=false
room_send_performed=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

No lock directory or send attempt was created because the Loop never entered the approved smoke window.

## Loop 171 Controlled Smoke Result

Loop 171 entered the human-approved planning window, but did not enter the send window because authenticated staff route readiness was not satisfied.

```txt
human_approval_gate_satisfied=true
preferred_smoke_mode=push
execution_path=existing_staff_reply_route
one_message_only=true
retry_allowed=false
bulk_send_allowed=false
multicast_allowed=false
broadcast_allowed=false
group_send_allowed=false
room_send_allowed=false
target_user_selected=true
target_user_id_recorded=false
target_message_body_recorded=false
outgoing_message_body_recorded=false
authenticated_staff_route_status=401
authenticated_staff_route_ready=false
LINE_REAL_PUSH_ENABLED_temporarily_enabled=false
line_real_reply_push_performed=false
send_attempted_once=false
line_send_result=not_performed
retry_performed=false
bulk_send_performed=false
multicast_performed=false
broadcast_performed=false
group_send_performed=false
room_send_performed=false
rollback_to_LINE_REAL_PUSH_ENABLED_false=true
final_LINE_REAL_PUSH_ENABLED=false
line_reply_push_ready=false
production_readiness=production_no_go
```

Do not retry LINE delivery until the authenticated staff route is diagnosed in a separate Loop.
