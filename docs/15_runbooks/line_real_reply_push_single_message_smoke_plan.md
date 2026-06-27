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
